import { currentUserId } from "@/lib/user";
import { ok, fail, readJson, handler } from "@/lib/api";
import { runUrlAnalysis } from "@/lib/services/analysis";

export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = handler(async (req: Request) => {
  const userId = await currentUserId();
  const body = await readJson<{ url?: string; projectId?: string; redesign?: boolean }>(req);
  const url = body?.url?.trim();
  if (!url) return fail("A URL is required.");
  const result = await runUrlAnalysis({ url, userId, projectId: body?.projectId, redesign: body?.redesign });
  return ok(result, { status: 201 });
});
