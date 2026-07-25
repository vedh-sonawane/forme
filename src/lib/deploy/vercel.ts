import type { ProjectFile } from "@/lib/appgen";

// Real Vercel deployment client (REST API v13). Files are uploaded inline with the
// deployment payload, so no separate upload step or CLI is needed.
// Docs: POST https://api.vercel.com/v13/deployments

const API = "https://api.vercel.com";

export type VercelDeployResult =
  | { ok: true; id: string; url: string; inspectorUrl: string | null; status: string }
  | { ok: false; error: string };

export type VercelStatus =
  | { ok: true; status: string; url: string | null; ready: boolean; error?: string; aliases: string[] }
  | { ok: false; error: string };

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function qs(teamId?: string | null) {
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

/** Map the provider's readyState to our own status vocabulary. */
function mapState(state: string | undefined): string {
  const s = (state || "").toUpperCase();
  if (s === "READY") return "ready";
  if (s === "ERROR" || s === "CANCELED") return s === "ERROR" ? "error" : "canceled";
  if (s === "QUEUED" || s === "INITIALIZING") return "queued";
  return "building";
}

/**
 * Create a deployment from generated project files.
 * `env` values are set as plain (non-encrypted) deployment env vars so the build has
 * what it needs (e.g. DATABASE_URL for `prisma generate`).
 */
export async function createDeployment(input: {
  token: string;
  name: string;
  files: ProjectFile[];
  env?: Record<string, string>;
  teamId?: string | null;
  production?: boolean;
}): Promise<VercelDeployResult> {
  const { token, name, files, env = {}, teamId = null, production = true } = input;

  const body = {
    name,
    target: production ? "production" : undefined,
    files: files.map((f) => ({ file: f.path, data: f.content, encoding: "utf-8" as const })),
    projectSettings: {
      framework: "nextjs",
      buildCommand: null,
      installCommand: null,
      outputDirectory: null,
    },
    env,
    build: { env },
  };

  try {
    const res = await fetch(`${API}/v13/deployments${qs(teamId)}`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as
      | { id?: string; url?: string; inspectorUrl?: string; readyState?: string; error?: { message?: string } }
      | null;

    if (!res.ok || !json?.id) {
      const msg = json?.error?.message || `Vercel returned ${res.status}`;
      return { ok: false, error: msg };
    }
    return {
      ok: true,
      id: json.id,
      url: json.url ? `https://${json.url}` : "",
      inspectorUrl: json.inspectorUrl ?? null,
      status: mapState(json.readyState),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reach Vercel." };
  }
}

/** Poll a deployment's build status. */
export async function getDeploymentStatus(token: string, deploymentId: string, teamId?: string | null): Promise<VercelStatus> {
  try {
    const res = await fetch(`${API}/v13/deployments/${encodeURIComponent(deploymentId)}${qs(teamId)}`, {
      headers: headers(token),
    });
    const json = (await res.json().catch(() => null)) as
      | { readyState?: string; url?: string; errorMessage?: string; alias?: string[]; error?: { message?: string } }
      | null;
    if (!res.ok || !json) return { ok: false, error: json?.error?.message || `Vercel returned ${res.status}` };
    const status = mapState(json.readyState);
    // The hashed deployment URL is protected by default; the production ALIAS is the
    // public one. Prefer the shortest alias (e.g. my-app.vercel.app).
    const aliases = (json.alias ?? []).filter(Boolean).sort((a, b) => a.length - b.length);
    const best = aliases[0] ?? json.url;
    return {
      ok: true,
      status,
      url: best ? `https://${best}` : null,
      ready: status === "ready",
      error: json.errorMessage,
      aliases,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reach Vercel." };
  }
}

/** Verify a token works (used to give a clear error before attempting a deploy). */
export async function verifyToken(token: string, teamId?: string | null): Promise<{ ok: boolean; user?: string; error?: string }> {
  try {
    const res = await fetch(`${API}/v2/user${qs(teamId)}`, { headers: headers(token) });
    const json = (await res.json().catch(() => null)) as { user?: { username?: string; email?: string }; error?: { message?: string } } | null;
    if (!res.ok) return { ok: false, error: json?.error?.message || `Vercel returned ${res.status}` };
    return { ok: true, user: json?.user?.username || json?.user?.email };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reach Vercel." };
  }
}
