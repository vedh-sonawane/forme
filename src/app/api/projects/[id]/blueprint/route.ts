import { currentUserId } from "@/lib/user";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { generateApplicationBlueprint } from "@/lib/services/generation";
import { parseJSON } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

// GET → the stored Application Blueprint (or null). POST → generate it.
export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const project = await db.project.findFirst({ where: { id, userId } });
  if (!project) return fail("Project not found.", 404);
  return ok({ blueprint: project.blueprint ? parseJSON(project.blueprint, null) : null });
});

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const project = await db.project.findFirst({ where: { id, userId } });
  if (!project) return fail("Project not found.", 404);
  const result = await generateApplicationBlueprint(id);
  return ok(result, { status: 201 });
});
