import { currentUserId } from "@/lib/user";
import { db } from "@/lib/db";
import { ok, fail, readJson, handler } from "@/lib/api";
import { toJSON } from "@/lib/utils";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const dir = await db.designDirection.findFirst({ where: { id, project: { userId } } });
  if (!dir) return fail("Direction not found.", 404);
  const body = await readJson<{ approved?: boolean }>(req);
  const approved = body?.approved ?? true;
  await db.designDirection.update({ where: { id }, data: { approved } });

  // Record a preference signal: an approved direction is a positive design signal.
  await db.userFeedback.create({
    data: { userId, projectId: dir.projectId, targetType: "direction", targetId: id, action: approved ? "accept" : "reject" },
  });
  await db.preferenceSignal.create({
    data: { userId, projectId: dir.projectId, signalType: approved ? "accepted_change" : "rejected_change", features: toJSON({ kind: "direction", directionId: id }) },
  });

  return ok({ approved });
});
