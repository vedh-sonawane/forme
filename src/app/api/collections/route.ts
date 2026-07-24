import { currentUserId } from "@/lib/user";
import { db } from "@/lib/db";
import { ok, fail, readJson, handler } from "@/lib/api";

export const runtime = "nodejs";

// List the user's collections with reference counts.
export const GET = handler(async () => {
  const userId = await currentUserId();
  const collections = await db.collection.findMany({
    where: { userId },
    include: { _count: { select: { references: true } } },
    orderBy: { name: "asc" },
  });
  return ok(collections.map((c) => ({ id: c.id, name: c.name, description: c.description, count: c._count.references })));
});

// Create a collection.
export const POST = handler(async (req: Request) => {
  const userId = await currentUserId();
  const body = await readJson<{ name?: string; description?: string }>(req);
  const name = body?.name?.trim();
  if (!name) return fail("A collection name is required.");
  const existing = await db.collection.findFirst({ where: { userId, name } });
  if (existing) return ok({ id: existing.id, name: existing.name, count: 0 }, { status: 200 });
  const c = await db.collection.create({ data: { userId, name, description: body?.description?.trim() || null } });
  return ok({ id: c.id, name: c.name, count: 0 }, { status: 201 });
});
