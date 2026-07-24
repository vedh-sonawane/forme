"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui";

// Shared login / register form. Uses raw fetch (not the api() wrapper) so a 401 on
// bad credentials shows an inline error instead of redirecting to /login.
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
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { name, email, password } : { email, password }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !body?.ok) throw new Error(body?.error || `Request failed (${res.status})`);
      router.push("/projects");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(50% 40% at 80% -10%, rgba(124,123,255,0.14), transparent 60%), radial-gradient(45% 40% at -10% 10%, rgba(52,211,153,0.08), transparent 55%)" }} />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--ok)] text-base font-black text-white shadow-[0_6px_18px_-6px_rgba(124,123,255,0.8)]">F</div>
          <div>
            <div className="text-base font-bold leading-none tracking-tight">FORME</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted">Design Intelligence</div>
          </div>
        </div>

        <div className="card p-6 sm:p-7">
          <h1 className="text-xl font-bold tracking-tight">{isRegister ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-fg-dim">
            {isRegister ? "Start analyzing references and generating intentionally-designed websites." : "Sign in to your design intelligence workspace."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {isRegister && (
              <div>
                <label className="label" htmlFor="name">Name <span className="text-muted">(optional)</span></label>
                <input id="name" className="input" placeholder="Ada Lovelace" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" required className="input" placeholder="you@studio.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus={!isRegister} />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" required minLength={isRegister ? 8 : undefined} className="input" placeholder={isRegister ? "At least 8 characters" : "••••••••"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} />
            </div>

            {error && <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-3 py-2 text-sm text-[color:var(--danger)]">{error}</div>}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy && <Spinner className="h-4 w-4" />}
              {busy ? (isRegister ? "Creating account…" : "Signing in…") : isRegister ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-fg-dim">
          {isRegister ? (
            <>Already have an account?{" "}<Link href="/login" className="font-medium text-[color:var(--accent)] hover:underline">Sign in</Link></>
          ) : (
            <>New to FORME?{" "}<Link href="/register" className="font-medium text-[color:var(--accent)] hover:underline">Create an account</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
