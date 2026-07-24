import { currentUserId } from "@/lib/user";
import { db } from "@/lib/db";
import { ok, fail, readJson, handler } from "@/lib/api";
import { restoreVersion } from "@/lib/services/generation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// Roll back a generated website to a past version (creates a new current version).
export const POST = handler(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const site = await db.generatedWebsite.findFirst({ where: { id, project: { userId } } });
  if (!site) return fail("Website not found.", 404);
  const body = await readJson<{ versionId?: string }>(req);
  if (!body?.versionId) return fail("versionId is required.");
  const result = await restoreVersion(id, body.versionId);
  return ok(result, { status: 201 });
});
