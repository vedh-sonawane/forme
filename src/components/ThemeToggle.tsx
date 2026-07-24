"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Theme = "ink" | "paper";

// Paper↔Ink toggle. On switch, the new theme spreads from the click point like an
// ink drop (View Transitions API where supported; instant fallback otherwise).
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("ink");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") as Theme) || "ink";
    setTheme(current);
    setMounted(true);
  }, []);

  function apply(next: Theme) {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("forme-theme", next);
    } catch {}
    setTheme(next);
  }

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    const next: Theme = theme === "ink" ? "paper" : "ink";
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    document.documentElement.style.setProperty("--ink-x", `${x}%`);
    document.documentElement.style.setProperty("--ink-y", `${y}%`);
    const start = (document as unknown as { startViewTransition?: (cb: () => void) => void }).startViewTransition;
    if (typeof start === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      start.call(document, () => apply(next));
    } else {
      apply(next);
    }
  }

  const isInk = theme === "ink";

  return (
    <button
      onClick={toggle}
      aria-label={isInk ? "Switch to Paper (light)" : "Switch to Ink (dark)"}
      title={isInk ? "Paper mode" : "Ink mode"}
      className={cn(
        "group relative grid h-10 w-10 place-items-center rounded-full border bg-surface/70 text-fg-dim transition hover:text-fg",
        !mounted && "opacity-0",
        className
      )}
    >
      {isInk ? (
        // moon → currently ink
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : (
        // sun → currently paper
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2v2.5M12 19.5V22M4.5 4.5l1.8 1.8M17.7 17.7l1.8 1.8M2 12h2.5M19.5 12H22M4.5 19.5l1.8-1.8M17.7 6.3l1.8-1.8" />
        </svg>
      )}
    </button>
  );
}
