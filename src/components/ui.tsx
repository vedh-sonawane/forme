import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card p-5", className)}>{children}</div>;
}

export function Badge({ children, tone = "default", className }: { children: ReactNode; tone?: "default" | "accent" | "ok" | "warn" | "danger"; className?: string }) {
  const tones: Record<string, string> = {
    default: "border bg-surface-2 text-fg-dim",
    accent: "border-accent/40 bg-accent/10 text-[color:var(--accent)]",
    ok: "border-[color:var(--ok)]/30 bg-[color:var(--ok)]/10 text-[color:var(--ok)]",
    warn: "border-[color:var(--warn)]/30 bg-[color:var(--warn)]/10 text-[color:var(--warn)]",
    danger: "border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 text-[color:var(--danger)]",
  };
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function scoreColor(score: number): string {
  if (score >= 85) return "var(--ok)";
  if (score >= 70) return "var(--accent)";
  if (score >= 55) return "var(--warn)";
  return "var(--danger)";
}

export function ScoreRing({ score, size = 64, label }: { score: number; size?: number; label?: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = scoreColor(score);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-2)" strokeWidth="6" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-lg font-bold leading-none" style={{ color }}>{Math.round(score)}</div>
        {label && <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted">{label}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, desc, action }: { icon?: ReactNode; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center animate-in">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {desc && <p className="mt-1 max-w-sm text-sm text-fg-dim">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Meter({ value, label }: { value: number; label: string }) {
  const color = scoreColor(value);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="capitalize text-fg-dim">{label}</span>
        <span className="font-medium tabular-nums" style={{ color }}>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

export function SectionTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--accent)]">{eyebrow}</div>}
        <h2 className="mt-1 text-lg font-semibold text-fg">{title}</h2>
      </div>
      {right}
    </div>
  );
}
