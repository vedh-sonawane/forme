"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui";

type SidebarUser = { name: string | null; email: string };

const nav = [
  { href: "/projects", label: "Projects", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
  { href: "/references", label: "References", icon: "M4 5h16M4 12h16M4 19h10" },
  { href: "/library", label: "Design Library", icon: "M12 3l9 4.5-9 4.5L3 7.5 12 3zM3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5" },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2 2 2 0 11-4 0 1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 004.6 15a2 2 0 010-4 1.7 1.7 0 001.2-2.9l-.1-.1a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 0011.5 4.6a2 2 0 014 0 1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9 2 2 0 010 4z" },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--ok)] text-sm font-black text-white shadow-[0_6px_18px_-6px_rgba(124,123,255,0.8)]">F</div>
      <div>
        <div className="text-sm font-bold leading-none tracking-tight">FORME</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted">Design Intelligence</div>
      </div>
    </div>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1 px-3 py-3">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active ? "bg-accent/10 text-fg" : "text-fg-dim hover:bg-surface-2/60 hover:text-fg"
            )}
          >
            <span className={cn("absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full bg-[color:var(--accent)] transition-all", active ? "w-[3px] opacity-100" : "w-0 opacity-0")} />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-colors", active ? "text-[color:var(--accent)]" : "text-fg-dim group-hover:text-fg")}>
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AiStatus({ aiLive }: { aiLive: boolean }) {
  return (
    <div className="border-t p-3">
      <div className="flex items-center gap-2.5 rounded-xl bg-surface-2/60 px-3 py-2.5">
        <span className="relative flex h-2 w-2">
          {aiLive && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--ok)] opacity-60" />}
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", aiLive ? "bg-[color:var(--ok)]" : "bg-[color:var(--warn)]")} />
        </span>
        <div className="text-xs">
          <div className="font-medium text-fg">{aiLive ? "Gemini live" : "Dev fallback"}</div>
          <div className="text-[10px] text-muted">{aiLive ? "Real AI analysis" : "No API key — mock AI"}</div>
        </div>
      </div>
    </div>
  );
}

function UserFooter({ user }: { user: SidebarUser }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const initials = (user.name || user.email).trim().slice(0, 2).toUpperCase();

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore — clear client state regardless */
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="border-t p-3">
      <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold text-fg-dim">{initials}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-fg">{user.name || "Signed in"}</div>
          <div className="truncate text-[11px] text-muted">{user.email}</div>
        </div>
        <button
          type="button"
          onClick={logout}
          disabled={busy}
          aria-label="Sign out"
          title="Sign out"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-fg-dim transition hover:bg-surface-2 hover:text-fg disabled:opacity-50"
        >
          {busy ? <Spinner className="h-4 w-4" /> : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ aiLive, user }: { aiLive: boolean; user: SidebarUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      {/* Mobile top bar */}
      <header className="glass fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b px-4 lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="grid h-9 w-9 place-items-center rounded-lg border bg-surface text-fg-dim transition hover:text-fg"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>

      {/* Backdrop (mobile only) */}
      <div
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      {/* Sidebar rail (desktop) / drawer (mobile) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r bg-surface/70 backdrop-blur-xl transition-transform duration-300 ease-out",
          "lg:translate-x-0 lg:bg-surface/60",
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
        <AiStatus aiLive={aiLive} />
        <UserFooter user={user} />
      </aside>
    </>
  );
}
