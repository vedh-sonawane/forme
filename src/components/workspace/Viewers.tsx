"use client";

import { Card, Meter, ScoreRing, Badge, scoreColor } from "@/components/ui";
import type { DesignDirection, DesignSystem, Critique } from "@/lib/design/schema";

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 text-sm text-fg">{value}</div>
    </div>
  );
}

export function DirectionView({ direction: d }: { direction: DesignDirection }) {
  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold">Design Direction</h3>
        {(d.design_personality ?? []).map((m) => <Badge key={m} tone="accent">{m}</Badge>)}
      </div>
      <p className="text-sm text-fg-dim">{d.visual_concept}</p>
      <div className="mt-2 grid grid-cols-1 divide-y sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0">
        <div className="sm:divide-y">
          <Field label="Typography" value={d.typography_direction} />
          <Field label="Color" value={d.color_direction} />
          <Field label="Layout" value={d.layout_direction} />
        </div>
        <div className="sm:divide-y">
          <Field label="Components" value={d.component_direction} />
          <Field label="Imagery" value={d.imagery_direction} />
          <Field label="Motion" value={d.motion_direction} />
        </div>
      </div>
      {(d.avoid ?? []).length > 0 && (
        <div className="mt-3 border-t pt-3">
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[color:var(--danger)]">Avoid</div>
          <div className="flex flex-wrap gap-1.5">{d.avoid.map((a) => <span key={a} className="chip">{a}</span>)}</div>
        </div>
      )}
      {d.rationale && <p className="mt-3 border-t pt-3 text-xs italic text-muted">{d.rationale}</p>}
    </Card>
  );
}

export function SystemPreview({ system: s }: { system: DesignSystem }) {
  const swatches: [string, string][] = [
    ["primary", s.colors.primary], ["accent", s.colors.accent], ["bg", s.colors.bg],
    ["surface", s.colors.surface], ["text", s.colors.text], ["border", s.colors.border],
  ];
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold">Design System</h3>
      <div className="grid grid-cols-3 gap-2">
        {swatches.map(([name, hex]) => (
          <div key={name} className="rounded-lg border p-1.5">
            <div className="h-8 w-full rounded-md border" style={{ background: hex }} />
            <div className="mt-1 text-[10px] text-muted">{name}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-baseline justify-between border-b pb-2">
          <span style={{ fontFamily: s.typography.fontHeading, fontWeight: s.typography.weightHeading }} className="text-lg">Heading</span>
          <span className="text-[10px] text-muted">{s.typography.fontHeading.split(",")[0].replace(/['"]/g, "")}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span style={{ fontFamily: s.typography.fontBody }} className="text-fg-dim">Body text sample</span>
          <span className="text-[10px] text-muted">{s.typography.fontBody.split(",")[0].replace(/['"]/g, "")}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {["sm", "md", "lg"].map((r) => (
          <div key={r} className="h-8 flex-1 border bg-surface-2" style={{ borderRadius: (s.radius as Record<string, string>)[r] }} />
        ))}
      </div>
    </Card>
  );
}

export function CritiqueView({ critique: c }: { critique: Critique }) {
  const sevTone = (s: string) => (s === "high" ? "danger" : s === "medium" ? "warn" : "default") as "danger" | "warn" | "default";
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Visual Critique</h3>
        <ScoreRing score={c.overall_score} size={52} />
      </div>

      {c.dimensions.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
          {c.dimensions.slice(0, 12).map((d) => <Meter key={d.name} value={d.score} label={d.name} />)}
        </div>
      )}

      {c.issues.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Issues & fixes</div>
          {c.issues.slice(0, 8).map((issue, i) => (
            <div key={i} className="rounded-lg border bg-surface-2/50 p-3">
              <div className="mb-1 flex items-center gap-2">
                <Badge tone={sevTone(issue.severity)}>{issue.severity}</Badge>
                <span className="text-xs font-medium capitalize text-fg">{issue.category}</span>
              </div>
              <p className="text-xs text-fg-dim">{issue.description}</p>
              {issue.suggested_fix && <p className="mt-1 text-xs text-[color:var(--accent)]">→ {issue.suggested_fix}</p>}
            </div>
          ))}
        </div>
      )}

      {c.strengths.length > 0 && (
        <div className="mt-3 border-t pt-3">
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[color:var(--ok)]">Strengths</div>
          <ul className="space-y-1 text-xs text-fg-dim">{c.strengths.slice(0, 5).map((s, i) => <li key={i}>• {s}</li>)}</ul>
        </div>
      )}
    </Card>
  );
}
