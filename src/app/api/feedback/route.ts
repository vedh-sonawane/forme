import { currentUserId } from "@/lib/user";
import { db } from "@/lib/db";
import { ok, fail, readJson, handler } from "@/lib/api";
import { toJSON } from "@/lib/utils";

export const runtime = "nodejs";

// Collects UserFeedback + derives PreferenceSignals for the Design Intelligence
// Dataset. This is the foundation the future ranking/preference-optimization system
// will train on. Everything is stored structured, not free text.
export const POST = handler(async (req: Request) => {
  const userId = await currentUserId();
  const body = await readJson<{
    projectId?: string;
    targetType: string;
    targetId: string;
    action: string;
    value?: unknown;
    category?: string;
    features?: Record<string, unknown>;
  }>(req);
  if (!body?.targetType || !body?.targetId || !body?.action) return fail("targetType, targetId and action are required.");

  await db.userFeedback.create({
    data: { userId, projectId: body.projectId ?? null, targetType: body.targetType, targetId: body.targetId, action: body.action, value: body.value !== undefined ? toJSON(body.value) : null },
  });

  // Derive a preference signal for actions that carry design preference information.
  const signalMap: Record<string, string> = { accept: "accepted_change", reject: "rejected_change", prefer: "preferred_over", edit: "accepted_change", regenerate: "rejected_change" };
  const signalType = signalMap[body.action];
  if (signalType) {
    await db.preferenceSignal.create({
      data: { userId, projectId: body.projectId ?? null, category: body.category ?? null, signalType, features: toJSON({ targetType: body.targetType, targetId: body.targetId, ...body.features }) },
    });
  }

  return ok({ recorded: true });
});
