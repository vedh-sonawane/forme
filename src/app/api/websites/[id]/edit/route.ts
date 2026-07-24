import { currentUserId } from "@/lib/user";
import { db } from "@/lib/db";
import { ok, fail, readJson, handler } from "@/lib/api";
import { editWebsite } from "@/lib/services/generation";

export const runtime = "nodejs";
export const maxDuration = 180;

type Ctx = { params: Promise<{ id: string }> };

// AI Editor — apply a natural-language edit to the current version (creates a new version).
export const POST = handler(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const site = await db.generatedWebsite.findFirst({ where: { id, project: { userId } } });
  if (!site) return fail("Website not found.", 404);
  const body = await readJson<{ instruction?: string }>(req);
  const instruction = body?.instruction?.trim();
  if (!instruction) return fail("Describe the change you want.");
  const result = await editWebsite(id, instruction);
  return ok(result, { status: 201 });
});
