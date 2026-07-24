import { currentUserId } from "@/lib/user";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { redesignProjectWebsite } from "@/lib/services/generation";

export const runtime = "nodejs";
export const maxDuration = 180;

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const project = await db.project.findFirst({ where: { id, userId } });
  if (!project) return fail("Project not found.", 404);
  const result = await redesignProjectWebsite(id);
  return ok(result, { status: 201 });
});
