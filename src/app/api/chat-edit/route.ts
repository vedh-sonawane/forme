import { currentUserId } from "@/lib/user";
import { ok, fail, readJson, handler } from "@/lib/api";
import { chatEditVersion } from "@/lib/services/refine";

export const runtime = "nodejs";
export const maxDuration = 180;

export const POST = handler(async (req: Request) => {
  const userId = await currentUserId();
  const body = await readJson<{ versionId?: string; message?: string }>(req);
  if (!body?.versionId || !body?.message?.trim()) return fail("versionId and message are required.");
  const result = await chatEditVersion(body.versionId, body.message.trim(), userId);
  return ok(result);
});
