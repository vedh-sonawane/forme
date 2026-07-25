import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { toJSON, parseJSON } from "@/lib/utils";
import { buildProjectApp } from "./export";
import { createDeployment, getDeploymentStatus, verifyToken } from "@/lib/deploy/vercel";
import { verifyDeployedApp, summarize, pickPublicUrl, type VerificationReport, type HealthcheckAccount } from "@/lib/verify/deployment";

// Deploy the generated application to a hosting provider. Provider-agnostic shape so
// Netlify / Cloudflare / Render can be added without changing callers.

export function deploymentConfigured(): boolean {
  return env.vercelToken.trim().length > 0;
}

/** A safe Postgres schema name: lowercase, unquoted-identifier characters only. */
function pgIdentifier(slug: string): string {
  const name = (slug || "app").toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  return (/^[a-z]/.test(name) ? name : `app_${name}`).slice(0, 60) || "generated_app";
}

/**
 * Namespace an app's tables inside the shared deployment database by adding
 * `?schema=<app>` to its connection URL. Prisma creates the schema on first push, so
 * each generated app owns its own tables and can't collide with — or destroy — another's.
 */
export function withAppSchema(url: string, slug: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("schema", pgIdentifier(slug));
    return u.toString();
  } catch {
    return url; // unparseable URL — leave it exactly as the user set it
  }
}

export async function deployProject(projectId: string): Promise<{ deploymentId: string; url: string; status: string } | { error: string }> {
  if (!deploymentConfigured()) {
    return { error: "Deployment isn't configured. Add VERCEL_TOKEN to .env (create one at vercel.com/account/tokens) and restart." };
  }

  // A hosted deployment needs a real database: serverless filesystems are read-only,
  // so a SQLite build deploys "successfully" but every query (sign-up, sign-in, CRUD)
  // fails at runtime. Refuse rather than ship a broken app.
  const databaseUrl = env.deployDatabaseUrl.trim();
  const isPostgres = /^postgres(ql)?:\/\//i.test(databaseUrl);
  if (!isPostgres) {
    return {
      error:
        "Deploying needs a hosted database. Set DEPLOY_DATABASE_URL in .env to a Postgres URL " +
        "(free options: Vercel Postgres, Neon, Supabase), then restart. SQLite can't persist on " +
        "Vercel, so sign-up/sign-in and all data would fail at runtime.",
    };
  }

  // Postgres schema for the deployed copy; the .zip export stays SQLite-by-default.
  const built = await buildProjectApp(projectId, { dbProvider: "postgresql" });
  if ("error" in built) return { error: built.error };

  // Every generated app deploys against the same DEPLOY_DATABASE_URL, and they all want
  // tables with the same names — User, Session. Sharing one namespace, the second app's
  // `prisma db push` has to repoint the first app's foreign keys onto its own user model,
  // which it refuses to do without --accept-data-loss. So the second app could never
  // deploy, and forcing it through would have destroyed the first app's data. Each app
  // gets its own Postgres schema inside that database instead.
  const appDatabaseUrl = withAppSchema(databaseUrl, built.slug);

  const token = env.vercelToken.trim();
  const teamId = env.vercelTeamId.trim() || null;

  const check = await verifyToken(token, teamId);
  if (!check.ok) return { error: `Vercel token rejected: ${check.error ?? "unauthorized"}` };

  const record = await db.deployment.create({
    data: { projectId, provider: "vercel", status: "queued", meta: toJSON({ files: built.files.length, appName: built.appName }) },
  });

  const res = await createDeployment({
    token,
    teamId,
    name: built.slug,
    files: built.files,
    env: { DATABASE_URL: appDatabaseUrl, AUTH_SECRET: cryptoRandom() },
    production: true,
  });

  if (!res.ok) {
    await db.deployment.update({ where: { id: record.id }, data: { status: "error", error: res.error } });
    return { error: res.error };
  }

  await db.deployment.update({
    where: { id: record.id },
    data: { providerId: res.id, url: res.url, inspectorUrl: res.inspectorUrl, status: res.status },
  });

  return { deploymentId: record.id, url: res.url, status: res.status };
}

type DeploymentMeta = { files?: number; appName?: string; healthcheck?: HealthcheckAccount; verification?: VerificationReport };

/**
 * The account the health check signs in with. Reused across deployments of the same
 * project so verification doesn't leave a trail of throwaway users in the app's
 * database — one per project, not one per deploy.
 */
async function healthcheckAccount(projectId: string): Promise<HealthcheckAccount> {
  const prior = await db.deployment.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 20 });
  for (const d of prior) {
    const existing = parseJSON<DeploymentMeta>(d.meta, {}).healthcheck;
    if (existing?.email && existing.password) return existing;
  }
  return { email: `forme-healthcheck@example.com`, password: cryptoRandom().slice(0, 24) };
}

/**
 * Run the post-deploy health check and record the verdict on the deployment.
 * A build that Vercel calls "ready" has only been proven to compile — this is what
 * decides whether the live URL can be trusted.
 */
async function verifyDeployment(deploymentId: string, projectId: string, url: string) {
  const account = await healthcheckAccount(projectId);
  const report = await verifyDeployedApp(url, account);

  const current = await db.deployment.findUnique({ where: { id: deploymentId } });
  const meta = parseJSON<DeploymentMeta>(current?.meta, {});

  await db.deployment.update({
    where: { id: deploymentId },
    data: {
      status: report.ok ? "ready" : "unhealthy",
      error: report.ok ? null : summarize(report),
      meta: toJSON({ ...meta, healthcheck: report.accountUsed ?? account, verification: report }),
    },
  });
}

/** Refresh in-flight deployments for a project (called by the UI while building). */
export async function refreshDeployments(projectId: string) {
  if (!deploymentConfigured()) return;
  const pending = await db.deployment.findMany({
    where: { projectId, status: { in: ["queued", "building", "verifying"] }, providerId: { not: null } },
    take: 5,
  });
  const token = env.vercelToken.trim();
  const teamId = env.vercelTeamId.trim() || null;

  for (const d of pending) {
    // A deployment left mid-verification (server restart) is picked back up here.
    if (d.status === "verifying") {
      if (Date.now() - d.updatedAt.getTime() < 5 * 60_000) continue;
      if (d.url) await verifyDeployment(d.id, projectId, d.url).catch(() => {});
      continue;
    }

    const s = await getDeploymentStatus(token, d.providerId as string, teamId);
    if (!s.ok) continue;
    const url = s.url ?? d.url;

    if (s.status !== "ready" || !url) {
      await db.deployment.update({ where: { id: d.id }, data: { status: s.status, url, error: s.error ?? null } });
      continue;
    }

    // Vercel assigns the public production alias moments after the build goes ready, so
    // the first poll can see only the SSO-protected project URL. Verify — and link the
    // user to — whichever alias is actually reachable.
    const publicUrl = (await pickPublicUrl([url, ...(s.aliases ?? [])])) ?? url;

    // Claim the verification atomically — the UI polls every few seconds, and the check
    // takes longer than one poll, so without this several requests would run it at once.
    const claimed = await db.deployment.updateMany({
      where: { id: d.id, status: { in: ["queued", "building"] } },
      data: { status: "verifying", url: publicUrl, error: null },
    });
    if (claimed.count !== 1) continue;

    await verifyDeployment(d.id, projectId, publicUrl).catch(async (e) => {
      await db.deployment.update({
        where: { id: d.id },
        data: { status: "ready", error: `Health check could not run: ${e instanceof Error ? e.message : "unknown error"}` },
      });
    });
  }
}

/** The recorded health-check report for a deployment, if it has been verified. */
export function deploymentVerification(meta: string | null): VerificationReport | null {
  return parseJSON<DeploymentMeta>(meta, {}).verification ?? null;
}

export async function listDeployments(projectId: string) {
  return db.deployment.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 10 });
}

function cryptoRandom(): string {
  // Node's webcrypto is available in the Next.js node runtime.
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
