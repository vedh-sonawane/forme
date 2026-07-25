import { currentUserId } from "@/lib/user";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { deployProject, listDeployments, refreshDeployments, deploymentConfigured, deploymentVerification } from "@/lib/services/deploy";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 180;

type Ctx = { params: Promise<{ id: string }> };

async function assertOwner(id: string) {
  const userId = await currentUserId();
  return db.project.findFirst({ where: { id, userId } });
}

// GET  → deployment history (refreshes any in-flight builds first)
// POST → deploy the generated application
export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!(await assertOwner(id))) return fail("Project not found.", 404);
  await refreshDeployments(id).catch(() => {});
  const deployments = await listDeployments(id);
  return ok({
    configured: deploymentConfigured(),
    // A hosted deploy needs Postgres — SQLite can't persist on serverless hosts.
    databaseReady: /^postgres(ql)?:\/\//i.test(env.deployDatabaseUrl.trim()),
    deployments: deployments.map((d) => {
      const verification = deploymentVerification(d.meta);
      return {
        id: d.id,
        status: d.status,
        url: d.url,
        inspectorUrl: d.inspectorUrl,
        error: d.error,
        createdAt: d.createdAt.toISOString(),
        // What a browser actually saw on the live URL after the build went green.
        checks: verification ? verification.checks : null,
        checksSkipped: verification?.skipped ?? null,
      };
    }),
  });
});

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!(await assertOwner(id))) return fail("Project not found.", 404);
  const result = await deployProject(id);
  if ("error" in result) return fail(result.error, 400);
  return ok(result, { status: 201 });
});
