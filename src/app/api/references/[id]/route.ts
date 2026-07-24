import { currentUserId } from "@/lib/user";
import { db } from "@/lib/db";
import { ok, fail, readJson, handler } from "@/lib/api";
import { toJSON } from "@/lib/utils";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// Update a reference's editable metadata: title, tags, notes, and collection
// membership. Ownership is enforced by userId scoping.
export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const ref = await db.reference.findFirst({ where: { id, userId } });
  if (!ref) return fail("Reference not found.", 404);

  const body = await readJson<{
    title?: string;
    notes?: string;
    tags?: string[];
    collectionIds?: string[];
  }>(req);
  if (!body) return fail("Invalid body.");

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim() || null;
  if (typeof body.notes === "string") data.notes = body.notes.trim() || null;
  if (Array.isArray(body.tags)) {
    const clean = Array.from(new Set(body.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))).slice(0, 24);
    data.tags = toJSON(clean);
  }
  if (Object.keys(data).length) await db.reference.update({ where: { id }, data });

  // Reconcile collection membership (only collections the user owns).
  if (Array.isArray(body.collectionIds)) {
    const owned = await db.collection.findMany({ where: { userId, id: { in: body.collectionIds } }, select: { id: true } });
    const targetIds = new Set(owned.map((c) => c.id));
    const existing = await db.collectionReference.findMany({ where: { referenceId: id }, select: { collectionId: true } });
    const existingIds = new Set(existing.map((e) => e.collectionId));

    const toAdd = [...targetIds].filter((cid) => !existingIds.has(cid));
    const toRemove = [...existingIds].filter((cid) => !targetIds.has(cid));

    if (toAdd.length) await db.collectionReference.createMany({ data: toAdd.map((collectionId) => ({ collectionId, referenceId: id })) });
    if (toRemove.length) await db.collectionReference.deleteMany({ where: { referenceId: id, collectionId: { in: toRemove } } });
  }

  return ok({ updated: true });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const ref = await db.reference.findFirst({ where: { id, userId } });
  if (!ref) return fail("Reference not found.", 404);
  await db.reference.delete({ where: { id } });
  return ok({ deleted: true });
});
