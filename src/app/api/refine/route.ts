import { currentUserId } from "@/lib/user";
import { ok, fail, readJson, handler } from "@/lib/api";
import { importAndRefine } from "@/lib/services/refine";

export const runtime = "nodejs";
export const maxDuration = 180;

export const POST = handler(async (req: Request) => {
  const userId = await currentUserId();
  const body = await readJson<{ url?: string }>(req);
  const url = body?.url?.trim();
  if (!url) return fail("A URL is required.");
  const result = await importAndRefine(url, userId);
  return ok(result, { status: 201 });
});
