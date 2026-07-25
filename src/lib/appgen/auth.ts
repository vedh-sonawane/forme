import type { ProjectFile } from "./types";

// Real authentication for the generated app: scrypt password hashing (Node built-in,
// no extra dependency) + server-side sessions in an httpOnly cookie. Functional, not
// a placeholder login screen.

export function authFiles(userDelegate: string, userModel: string): ProjectFile[] {
  return [
    {
      path: "src/lib/auth/password.ts",
      content: `import { scrypt as _scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEYLEN);
  return \`\${salt}:\${derived.toString("hex")}\`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = (stored || "").split(":");
  if (!salt || !hashHex) return false;
  const derived = await scrypt(password, salt, KEYLEN);
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}
`,
    },
    {
      path: "src/lib/auth/session.ts",
      content: `import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import type { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "app_session";
const TTL_MS = 1000 * 60 * 60 * 24 * 30;

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export async function createSession(userId: string) {
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

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function deleteCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.delete({ where: { token } }).catch(() => {});
}
`,
    },
    {
      path: "src/app/api/auth/register/route.ts",
      content: `import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { email?: string; password?: string; name?: string } | null;
    const email = (body?.email || "").trim().toLowerCase();
    const password = body?.password || "";
    if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });

    const existing = await db.${userDelegate}.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ ok: false, error: "An account with this email already exists." }, { status: 409 });

    const user = await db.${userDelegate}.create({
      data: { email, name: (body?.name || "").trim() || null, passwordHash: await hashPassword(password) },
    });

    const { token, expiresAt } = await createSession(user.id);
    const res = NextResponse.json({ ok: true, data: { id: user.id, email: user.email } }, { status: 201 });
    setSessionCookie(res, token, expiresAt);
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Could not create the account." }, { status: 500 });
  }
}
`,
    },
    {
      path: "src/app/api/auth/login/route.ts",
      content: `import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
    const email = (body?.email || "").trim().toLowerCase();
    const password = body?.password || "";

    const user = await db.${userDelegate}.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
    }

    const { token, expiresAt } = await createSession(user.id);
    const res = NextResponse.json({ ok: true, data: { id: user.id, email: user.email } });
    setSessionCookie(res, token, expiresAt);
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Could not sign in." }, { status: 500 });
  }
}
`,
    },
    {
      path: "src/app/api/auth/logout/route.ts",
      content: `import { NextResponse } from "next/server";
import { deleteCurrentSession, clearSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  await deleteCurrentSession();
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
`,
    },
    {
      path: "src/components/AuthForm.tsx",
      content: `"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(\`/api/auth/\${mode}\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { name, email, password } : { email, password }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !body?.ok) throw new Error(body?.error || "Request failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="card">
        <h1 className="text-xl font-bold">{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-muted">{isRegister ? "It only takes a moment." : "Sign in to continue."}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {isRegister && (
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={isRegister ? 8 : undefined} className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} />
          </div>
          {error && <p className="text-sm" style={{ color: "#e5484d" }}>{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>
      </div>
      <p className="mt-4 text-center text-sm text-muted">
        {isRegister ? (
          <>Already have an account? <Link href="/login" className="underline">Sign in</Link></>
        ) : (
          <>New here? <Link href="/register" className="underline">Create an account</Link></>
        )}
      </p>
    </div>
  );
}
`,
    },
    {
      path: "src/app/login/page.tsx",
      content: `import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/dashboard");
  return <AuthForm mode="login" />;
}
`,
    },
    {
      path: "src/app/register/page.tsx",
      content: `import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/dashboard");
  return <AuthForm mode="register" />;
}
`,
    },
    {
      path: "src/components/SignOutButton.tsx",
      content: `"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn-ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        router.push("/login");
        router.refresh();
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
`,
    },
  ];
}

/** Marker so callers know which Prisma delegate the user model uses. */
export const userDelegateNote = (m: string) => `// user model: ${m}`;
