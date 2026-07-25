import { currentUserId } from "@/lib/user";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { deployProject, listDeployments, refreshDeployments, deploymentConfigured } from "@/lib/services/deploy";

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
    deployments: deployments.map((d) => ({
      id: d.id,
      status: d.status,
      url: d.url,
      inspectorUrl: d.inspectorUrl,
      error: d.error,
      createdAt: d.createdAt.toISOString(),
    })),
  });
});

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!(await assertOwner(id))) return fail("Project not found.", 404);
  const result = await deployProject(id);
  if ("error" in result) return fail(result.error, 400);
  return ok(result, { status: 201 });
});
