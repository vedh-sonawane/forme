import { Card, ScoreRing, Badge } from "@/components/ui";
import type { DesignDNA } from "@/lib/design/schema";

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</dt>
      <dd className="text-sm text-fg">{value}</dd>
    </div>
  );
}

function List({ items, tone }: { items?: string[]; tone?: "ok" | "danger" | "accent" }) {
  if (!items?.length) return <p className="text-sm text-muted">—</p>;
  const dot = tone === "ok" ? "var(--ok)" : tone === "danger" ? "var(--danger)" : "var(--accent)";
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm text-fg-dim">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function DnaViewer({ dna, fallback }: { dna: DesignDNA; fallback?: boolean }) {
  const palette = dna.color?.palette ?? [];
  return (
    <div className="space-y-4">
      {fallback && (
        <div className="rounded-xl border border-[color:var(--warn)]/30 bg-[color:var(--warn)]/5 px-3 py-2 text-xs text-[color:var(--warn)]">
          Generated with the development fallback (no API key). Connect Gemini for real analysis.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold">{dna.style?.primary_style || "Design DNA"}</h3>
                {dna.style?.design_category && <Badge tone="accent">{dna.style.design_category}</Badge>}
                {dna.style?.industry && <Badge>{dna.style.industry}</Badge>}
              </div>
              <p className="mt-2 max-w-xl text-sm text-fg-dim">{dna.style?.visual_personality}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(dna.style?.mood ?? []).map((m) => (<span key={m} className="chip capitalize">{m}</span>))}
                {(dna.style?.secondary_styles ?? []).map((m) => (<span key={m} className="chip capitalize">{m}</span>))}
              </div>
            </div>
            <div className="text-center">
              <ScoreRing score={dna.style?.perceived_quality ?? 70} label="quality" />
            </div>
          </div>
        </Card>

        <Card>
          <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">Color palette</h4>
          <div className="flex flex-wrap gap-2">
            {palette.length ? palette.map((c, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border bg-surface-2 px-2 py-1.5">
                <span className="h-5 w-5 rounded-md border" style={{ background: c.hex }} />
                <div className="leading-tight">
                  <div className="text-xs font-medium">{c.hex}</div>
                  <div className="text-[10px] text-muted">{c.role || c.name}</div>
                </div>
              </div>
            )) : <p className="text-sm text-muted">—</p>}
          </div>
          <p className="mt-3 text-xs text-fg-dim">{dna.color?.contrast}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <h4 className="mb-1 text-sm font-semibold">Typography</h4>
          <dl className="divide-y">
            <Row label="Heading" value={dna.typography?.heading_style} />
            <Row label="Body" value={dna.typography?.body_style} />
            <Row label="Hierarchy" value={dna.typography?.hierarchy} />
            <Row label="Scale" value={dna.typography?.scale} />
            <Row label="Characteristics" value={dna.typography?.font_characteristics} />
          </dl>
        </Card>

        <Card>
          <h4 className="mb-1 text-sm font-semibold">Layout & composition</h4>
          <dl className="divide-y">
            <Row label="Structure" value={dna.layout?.structure} />
            <Row label="Grid" value={dna.layout?.grid} />
            <Row label="Spacing" value={dna.layout?.spacing} />
            <Row label="Density" value={dna.layout?.density} />
            <Row label="Balance" value={dna.layout?.balance} />
            <Row label="Symmetry" value={dna.layout?.symmetry} />
          </dl>
        </Card>

        <Card>
          <h4 className="mb-1 text-sm font-semibold">Components</h4>
          <dl className="divide-y">
            <Row label="Navigation" value={dna.components?.navigation} />
            <Row label="Hero" value={dna.components?.hero} />
            <Row label="CTA" value={dna.components?.cta} />
            <Row label="Cards" value={dna.components?.cards} />
            <Row label="Radius" value={dna.components?.border_radius} />
            <Row label="Shadows" value={dna.components?.shadows} />
          </dl>
        </Card>

        <Card>
          <h4 className="mb-1 text-sm font-semibold">Imagery & motion</h4>
          <dl className="divide-y">
            <Row label="Imagery" value={dna.imagery?.style} />
            <Row label="Illustration" value={dna.imagery?.illustration} />
            <Row label="Iconography" value={dna.imagery?.iconography} />
            <Row label="Motion" value={dna.motion?.characteristics} />
            <Row label="Responsive" value={dna.responsive?.behavior} />
          </dl>
        </Card>

        <Card>
          <h4 className="mb-2 text-sm font-semibold">Reusable principles</h4>
          <List items={dna.design_principles} tone="accent" />
        </Card>

        <Card>
          <h4 className="mb-2 text-sm font-semibold">Visual hierarchy</h4>
          <p className="text-sm text-fg-dim">{dna.visual_hierarchy?.description}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(dna.visual_hierarchy?.focal_points ?? []).map((f) => (<span key={f} className="chip">{f}</span>))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card><h4 className="mb-2 text-sm font-semibold text-[color:var(--ok)]">Strengths</h4><List items={dna.strengths} tone="ok" /></Card>
        <Card><h4 className="mb-2 text-sm font-semibold text-[color:var(--danger)]">Weaknesses</h4><List items={dna.weaknesses} tone="danger" /></Card>
      </div>
    </div>
  );
}
