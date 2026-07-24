"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "M4 13h6V4H4zM14 21h6v-9h-6zM14 4v5h6V4zM4 21h6v-5H4z" },
  { href: "/refine", label: "Refine a site", icon: "M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" },
  { href: "/projects", label: "Projects", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
  { href: "/references", label: "References", icon: "M4 5h16M4 12h16M4 19h10" },
  { href: "/library", label: "Design Library", icon: "M12 3l9 4.5-9 4.5L3 7.5 12 3zM3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5" },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2 2 2 0 11-4 0 1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 004.6 15a2 2 0 010-4 1.7 1.7 0 001.2-2.9l-.1-.1a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 0011.5 4.6a2 2 0 014 0 1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9 2 2 0 010 4z" },
];

export function Sidebar({ aiLive, label, sub }: { aiLive: boolean; label: string; sub: string }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col p-3">
      <div className="glass flex h-full flex-col p-3">
        <Link href="/" className="flex items-center gap-2.5 px-2 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--accent)] font-display text-lg font-bold text-[color:var(--accent-fg)]">F</span>
          <div>
            <div className="font-display text-sm font-bold leading-none tracking-tight">FORME</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted">Design Intelligence</div>
          </div>
        </Link>

        <nav className="mt-3 flex-1 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                  active ? "bg-[color:var(--accent)] text-[color:var(--accent-fg)] shadow-[0_10px_24px_-12px_rgba(20,17,15,0.5)]" : "text-fg-dim hover:bg-surface hover:text-fg"
                )}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface/70 p-2.5">
          <span className={cn("relative ml-1 flex h-2 w-2", aiLive ? "text-[color:var(--ok)]" : "text-[color:var(--warn)]")}>
            <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", aiLive ? "bg-[color:var(--ok)]" : "bg-[color:var(--warn)]")} />
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", aiLive ? "bg-[color:var(--ok)]" : "bg-[color:var(--warn)]")} />
          </span>
          <div className="flex-1 text-xs">
            <div className="font-medium text-fg">{label}</div>
            <div className="text-[10px] text-muted">{sub}</div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
