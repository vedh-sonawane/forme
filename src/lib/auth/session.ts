import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import type { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Server-side sessions. An opaque random token lives in an httpOnly cookie and maps
// to a Session row. Cookies are mutated on route-handler responses (setSessionCookie /
// clearSessionCookie); server components/handlers only read via getSessionUser().

export const SESSION_COOKIE = "forme_session";
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

/** Create a session row and return the token + expiry (caller sets the cookie). */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_MS);
  await db.session.create({ data: { token, userId, expiresAt } });
  return { token, expiresAt };
}

export function setSessionCookie(res: NextResponse, token: string, expiresAt: Date) {
  res.cookies.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(new Date(0)), maxAge: 0 });
}

/** Resolve the signed-in user from the session cookie, or null. Expired → cleaned up. */
export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { token }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { token } }).catch(() => {});
    return null;
  }
  return session.user;
}

/** Delete the current session row (used by logout). Cookie cleared by the caller. */
export async function deleteCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.delete({ where: { token } }).catch(() => {});
}
