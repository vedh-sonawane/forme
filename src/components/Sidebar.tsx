"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/projects", label: "Projects", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
  { href: "/references", label: "References", icon: "M4 5h16M4 12h16M4 19h10" },
  { href: "/library", label: "Design Library", icon: "M12 3l9 4.5-9 4.5L3 7.5 12 3zM3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5" },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2 2 2 0 11-4 0 1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 004.6 15a2 2 0 010-4 1.7 1.7 0 001.2-2.9l-.1-.1a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 0011.5 4.6a2 2 0 014 0 1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9 2 2 0 010 4z" },
];

export function Sidebar({ aiLive }: { aiLive: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r bg-surface/60 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--ok)] text-sm font-black text-white">F</div>
        <div>
          <div className="text-sm font-bold leading-none tracking-tight">FORME</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">Design Intelligence</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-3">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-surface-2 text-fg" : "text-fg-dim hover:bg-surface-2/60 hover:text-fg"
              )}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={active ? "text-[color:var(--accent)]" : ""}>
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-2 rounded-xl bg-surface-2/60 px-3 py-2.5">
          <span className={cn("h-2 w-2 rounded-full", aiLive ? "bg-[color:var(--ok)]" : "bg-[color:var(--warn)]")} />
          <div className="text-xs">
            <div className="font-medium text-fg">{aiLive ? "Gemini live" : "Dev fallback"}</div>
            <div className="text-[10px] text-muted">{aiLive ? "Real AI analysis" : "No API key — mock AI"}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
