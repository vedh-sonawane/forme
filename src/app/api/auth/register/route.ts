import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, readJson, handler } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().trim().max(80).optional(),
});

const STARTER_COLLECTIONS = ["SaaS", "AI", "Portfolio", "Minimal", "Editorial", "Luxury"];

export const POST = handler(async (req: Request) => {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input.");
  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name || null;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing?.passwordHash) return fail("An account with this email already exists.", 409);

  const passwordHash = await hashPassword(parsed.data.password);

  let user;
  if (existing && !existing.passwordHash) {
    // An anonymous user already sits at this exact email → upgrade it in place.
    user = await db.user.update({ where: { id: existing.id }, data: { name: name ?? existing.name, passwordHash } });
  } else {
    // First-ever real account claims the pre-auth local workspace (if any) so its
    // projects/references/library aren't orphaned. Otherwise create a fresh account.
    const passwordUsers = await db.user.count({ where: { passwordHash: { not: null } } });
    const legacy = passwordUsers === 0 ? await db.user.findFirst({ where: { passwordHash: null } }) : null;
    if (legacy) {
      user = await db.user.update({ where: { id: legacy.id }, data: { email, name: name ?? legacy.name, passwordHash } });
    } else {
      user = await db.user.create({ data: { email, name, passwordHash } });
      await db.collection.createMany({ data: STARTER_COLLECTIONS.map((n) => ({ name: n, userId: user!.id })) });
    }
  }

  const { token, expiresAt } = await createSession(user.id);
  const res = ok({ id: user.id, email: user.email, name: user.name }, { status: 201 });
  setSessionCookie(res, token, expiresAt);
  return res;
});
