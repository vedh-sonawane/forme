import { currentUserId } from "@/lib/user";
import { db } from "@/lib/db";
import { ok, fail, readJson, handler } from "@/lib/api";
import { generateProjectWebsite } from "@/lib/services/generation";

export const runtime = "nodejs";
export const maxDuration = 180;

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const project = await db.project.findFirst({ where: { id, userId } });
  if (!project) return fail("Project not found.", 404);
  const body = await readJson<{ directionId?: string }>(req);
  const result = await generateProjectWebsite(id, body?.directionId);
  return ok(result, { status: 201 });
});
