import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, readJson, handler } from "@/lib/api";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const POST = handler(async (req: Request) => {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input.");
  const email = parsed.data.email.toLowerCase();

  const user = await db.user.findUnique({ where: { email } });
  // Same generic message whether the email is unknown or the password is wrong.
  if (!user || !user.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return fail("Invalid email or password.", 401);
  }

  const { token, expiresAt } = await createSession(user.id);
  const res = ok({ id: user.id, email: user.email, name: user.name });
  setSessionCookie(res, token, expiresAt);
  return res;
});
