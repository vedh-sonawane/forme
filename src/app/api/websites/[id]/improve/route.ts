import { currentUserId } from "@/lib/user";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { improveWebsite } from "@/lib/services/generation";

export const runtime = "nodejs";
export const maxDuration = 180;

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const site = await db.generatedWebsite.findFirst({ where: { id, project: { userId } } });
  if (!site) return fail("Website not found.", 404);
  const result = await improveWebsite(id);
  return ok(result);
});
