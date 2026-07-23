import { db } from "@/lib/db";

// MVP identity model: a single local workspace user, created lazily.
// The data model is fully multi-user (every Project/Reference is scoped to a userId),
// so real authentication (OAuth/password/session) can be layered on later without a
// schema change. Full auth is an intentionally-deferred future feature.
const DEFAULT_EMAIL = "you@forme.local";

let cachedId: string | null = null;

export async function getCurrentUser() {
  if (cachedId) {
    const u = await db.user.findUnique({ where: { id: cachedId } });
    if (u) return u;
    cachedId = null;
  }
  const existing = await db.user.findUnique({ where: { email: DEFAULT_EMAIL } });
  if (existing) {
    cachedId = existing.id;
    return existing;
  }
  const created = await db.user.create({ data: { email: DEFAULT_EMAIL, name: "You" } });
  cachedId = created.id;
  // Seed a few starter collections on first run.
  await db.collection.createMany({
    data: ["SaaS", "AI", "Portfolio", "Minimal", "Editorial", "Luxury"].map((name) => ({ name, userId: created.id })),
  });
  return created;
}

export async function currentUserId(): Promise<string> {
  return (await getCurrentUser()).id;
}
