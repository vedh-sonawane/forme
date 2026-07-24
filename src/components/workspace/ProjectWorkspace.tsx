"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { SerializedProject } from "@/lib/serialize";
import { AddReference } from "@/components/AddReference";
import { Badge, Spinner, ScoreRing, Meter, EmptyState, scoreColor } from "@/components/ui";
import { cn } from "@/lib/utils";
import { DirectionView, SystemPreview, CritiqueView } from "./Viewers";
import { PreviewFrame } from "./PreviewFrame";

type Tab = "overview" | "references" | "direction" | "build" | "redesign" | "versions";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "references", label: "References" },
  { id: "direction", label: "Design Direction" },
  { id: "build", label: "Build & Critique" },
  { id: "redesign", label: "Redesign" },
  { id: "versions", label: "Versions" },
];

export function ProjectWorkspace({ initial }: { initial: SerializedProject }) {
  const p = initial;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const latestDirection = p.directions[0] ?? null;
  const latestSite = p.sites[0] ?? null;
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(latestSite?.currentVersionId ?? latestSite?.versions[0]?.id ?? null);

  async function run(label: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(label);
    setError(null);
    setToast(null);
    try {
      await fn();
      if (done) setToast(done);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const genDirection = () => run("direction", () => api(`/api/projects/${p.id}/direction`, { method: "POST" }), "Design direction generated");
  const genWebsite = () => run("generate", () => api(`/api/projects/${p.id}/generate`, { method: "POST" }), "Website generated & critiqued");
  const redesign = () => run("redesign", () => api(`/api/projects/${p.id}/redesign`, { method: "POST" }), "Redesign generated & critiqued");
  const improve = () => latestSite && run("improve", () => api(`/api/websites/${latestSite.id}/improve`, { method: "POST" }), "Improvement iteration complete");
  const approve = () => latestDirection && run("approve", () => api(`/api/directions/${latestDirection.id}/approve`, { method: "POST", body: JSON.stringify({ approved: true }) }), "Direction approved");
  const feedback = (action: string, targetType: string, targetId: string) =>
    run("fb", () => api(`/api/feedback`, { method: "POST", body: JSON.stringify({ projectId: p.id, action, targetType, targetId, category: p.requirements.industry }) }), "Feedback recorded");

  return (
    <div className="animate-in">
      {/* Header */}
      <Link href="/projects" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-dim hover:text-fg">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>Projects
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
            <Badge tone={p.status === "ready" ? "ok" : "accent"}>{p.status}</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-fg-dim">{p.description || "No description"}</p>
        </div>
        <div className="flex gap-2">
          {!latestDirection && <button className="btn-ghost" onClick={genDirection} disabled={!!busy}>{busy === "direction" ? <Spinner className="h-4 w-4" /> : null} Generate direction</button>}
          <button className="btn-primary" onClick={genWebsite} disabled={!!busy}>
            {busy === "generate" ? <Spinner className="h-4 w-4" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5z" /></svg>}
            {busy === "generate" ? "Generating…" : latestSite ? "Regenerate" : "Generate website"}
          </button>
        </div>
      </div>

      {(busy === "generate" || busy === "direction" || busy === "improve" || busy === "redesign") && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
          <Spinner className="h-4 w-4 text-[color:var(--accent)]" />
          <span className="text-fg-dim">
            {busy === "direction" && "Analyzing requirements → synthesizing references → composing design direction & system…"}
            {busy === "generate" && "Direction → design system → architecture → code generation → browser render → visual critique. This can take 30–90s."}
            {busy === "improve" && "Applying critique fixes → re-rendering → re-critiquing → checking for regressions…"}
            {busy === "redesign" && "Analyzing the original → preserving brand & content → composing an improved direction → generating & critiquing the redesign…"}
          </span>
        </div>
      )}
      {error && <div className="mb-4 rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-4 py-2.5 text-sm text-[color:var(--danger)]">{error}</div>}
      {toast && <div className="mb-4 rounded-xl border border-[color:var(--ok)]/30 bg-[color:var(--ok)]/10 px-4 py-2.5 text-sm text-[color:var(--ok)]">{toast}</div>}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("relative shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition", tab === t.id ? "text-fg" : "text-fg-dim hover:text-fg")}>
            {t.label}
            {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[color:var(--accent)]" />}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card p-5 lg:col-span-2">
            <h3 className="mb-3 text-sm font-semibold">Requirements</h3>
            {p.requirements.business || p.requirements.rawIdea ? (
              <div className="space-y-3 text-sm">
                <p className="text-fg-dim">{p.requirements.business || p.requirements.rawIdea}</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.requirements.industry && <Badge tone="accent">{p.requirements.industry}</Badge>}
                  {(p.requirements.tone ?? []).map((t) => <Badge key={t}>{t}</Badge>)}
                </div>
                {(p.requirements.goals ?? []).length > 0 && (
                  <ul className="mt-2 space-y-1 text-fg-dim">{(p.requirements.goals ?? []).map((g) => <li key={g}>• {g}</li>)}</ul>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">No structured requirements yet — they’ll be extracted when you generate a direction.</p>
            )}
          </div>
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold">Pipeline</h3>
            <ol className="space-y-2.5 text-sm">
              {[
                ["References", p.references.length > 0],
                ["Design DNA", p.references.some((r) => r.hasDna) || p.dnaProfiles.length > 0],
                ["Design direction", !!latestDirection],
                ["Generated website", !!latestSite],
                ["Visual critique", !!latestSite?.versions.some((v) => v.critique)],
              ].map(([label, done]) => (
                <li key={label as string} className="flex items-center gap-2.5">
                  <span className={cn("grid h-5 w-5 place-items-center rounded-full text-[10px]", done ? "bg-[color:var(--ok)] text-black" : "border text-muted")}>
                    {done ? "✓" : ""}
                  </span>
                  <span className={done ? "text-fg" : "text-fg-dim"}>{label}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* REFERENCES */}
      {tab === "references" && (
        <div>
          <AddReference projectId={p.id} onDone={() => router.refresh()} />
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {p.references.length === 0 ? (
              <div className="sm:col-span-2 lg:col-span-3"><EmptyState title="No references attached" desc="Add reference URLs or screenshots to steer the design direction." /></div>
            ) : (
              p.references.map((r) => (
                <Link key={r.id} href={`/references/${r.id}`} className="card group overflow-hidden p-0 transition hover:border-accent/40">
                  <div className="relative aspect-[16/10] bg-surface-2">
                    {r.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.thumb} alt={r.title ?? ""} className="h-full w-full object-cover object-top" />
                    ) : <div className="grid h-full place-items-center text-muted text-xs">no preview</div>}
                    <div className="absolute left-2 top-2 flex gap-1"><Badge>{r.role}</Badge>{r.hasDna && <Badge tone="ok">DNA</Badge>}</div>
                  </div>
                  <div className="p-3"><div className="truncate text-sm font-medium">{r.title || r.sourceUrl}</div></div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      {/* DIRECTION */}
      {tab === "direction" && (
        <div>
          {!latestDirection ? (
            <EmptyState
              title="No design direction yet"
              desc="FORME analyzes your requirements + reference DNA to compose a decisive, structured design direction and system."
              action={<button className="btn-primary" onClick={genDirection} disabled={!!busy}>{busy === "direction" ? <Spinner className="h-4 w-4" /> : null} Generate design direction</button>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2"><DirectionView direction={latestDirection.direction} /></div>
              <div className="space-y-4">
                {latestDirection.system && <SystemPreview system={latestDirection.system} />}
                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Direction v{latestDirection.version}</span>
                    {latestDirection.approved ? <Badge tone="ok">approved</Badge> : <Badge tone="warn">draft</Badge>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="btn-ghost flex-1" onClick={approve} disabled={!!busy || latestDirection.approved}>Approve</button>
                    <button className="btn-subtle" onClick={genDirection} disabled={!!busy}>Regenerate</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BUILD & CRITIQUE */}
      {tab === "build" && (
        <BuildTab
          site={latestSite}
          selectedVersionId={selectedVersionId}
          setSelectedVersionId={setSelectedVersionId}
          onGenerate={genWebsite}
          onImprove={improve}
          onFeedback={feedback}
          busy={busy}
        />
      )}

      {/* REDESIGN */}
      {tab === "redesign" && (
        <RedesignTab
          projectId={p.id}
          target={p.references.find((r) => r.role === "redesign-target") ?? null}
          site={p.sites.find((s) => s.kind === "redesign") ?? null}
          directions={p.directions}
          onRedesign={redesign}
          onFeedback={feedback}
          onRefresh={() => router.refresh()}
          busy={busy}
        />
      )}

      {/* VERSIONS */}
      {tab === "versions" && (
        <div>
          {!latestSite || latestSite.versions.length === 0 ? (
            <EmptyState title="No versions yet" desc="Generate a website to start the version history." />
          ) : (
            <div className="space-y-3">
              {latestSite.versions.map((v) => {
                const isCurrent = v.id === latestSite.currentVersionId;
                return (
                  <div key={v.id} className={cn("card flex items-center gap-4 p-4", isCurrent && "border-accent/50")}>
                    {v.screenshotUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.screenshotUrl} alt={v.label ?? ""} className="h-20 w-32 shrink-0 rounded-lg border object-cover object-top" />
                    ) : <div className="grid h-20 w-32 shrink-0 place-items-center rounded-lg border bg-surface-2 text-xs text-muted">no render</div>}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{v.label || `v${v.version}`}</span>
                        {isCurrent && <Badge tone="accent">current</Badge>}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-fg-dim">{v.changeNote}</p>
                    </div>
                    {typeof v.score === "number" && <div className="shrink-0 text-right"><div className="text-lg font-bold" style={{ color: scoreColor(v.score) }}>{Math.round(v.score)}</div><div className="text-[10px] text-muted">score</div></div>}
                    <button className="btn-subtle shrink-0" onClick={() => { setSelectedVersionId(v.id); setTab("build"); }}>Open</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Build tab (extracted for clarity) ─────────────────────────────────────────────
function BuildTab({
  site, selectedVersionId, setSelectedVersionId, onGenerate, onImprove, onFeedback, busy,
}: {
  site: SerializedProject["sites"][number] | null;
  selectedVersionId: string | null;
  setSelectedVersionId: (id: string) => void;
  onGenerate: () => void;
  onImprove: () => void;
  onFeedback: (action: string, targetType: string, targetId: string) => void;
  busy: string | null;
}) {
  if (!site || site.versions.length === 0) {
    return (
      <EmptyState
        title="No website generated yet"
        desc="Generate a real, responsive website from your design direction — then FORME renders it in a real browser and critiques the result."
        action={<button className="btn-primary" onClick={onGenerate} disabled={!!busy}>{busy === "generate" ? <Spinner className="h-4 w-4" /> : null} Generate website</button>}
      />
    );
  }

  const selected = site.versions.find((v) => v.id === selectedVersionId) ?? site.versions[0];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <select className="input w-auto" value={selected.id} onChange={(e) => setSelectedVersionId(e.target.value)}>
            {site.versions.map((v) => <option key={v.id} value={v.id}>{v.label || `v${v.version}`}{v.id === site.currentVersionId ? " (current)" : ""}</option>)}
          </select>
          <a href={`/api/versions/${selected.id}/preview`} target="_blank" rel="noopener noreferrer" className="btn-subtle">Open in new tab ↗</a>
        </div>
        <PreviewFrame versionId={selected.id} />
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Improvement loop</h3>
            {typeof selected.score === "number" && <ScoreRing score={selected.score} size={52} />}
          </div>
          <p className="mt-2 text-xs text-fg-dim">Render → critique → fix → re-render → keep only if it doesn’t regress.</p>
          <button className="btn-primary mt-3 w-full" onClick={onImprove} disabled={!!busy}>
            {busy === "improve" ? <Spinner className="h-4 w-4" /> : null}{busy === "improve" ? "Improving…" : "Run improvement iteration"}
          </button>
          <div className="mt-3 flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => onFeedback("accept", "website", site.id)} disabled={!!busy}>👍 Accept</button>
            <button className="btn-ghost flex-1" onClick={() => onFeedback("reject", "website", site.id)} disabled={!!busy}>👎 Reject</button>
          </div>
        </div>

        {selected.critique ? <CritiqueView critique={selected.critique} /> : <div className="card p-5 text-sm text-muted">No critique for this version.</div>}
      </div>
    </div>
  );
}

// ── Redesign tab: original → proposed direction → redesigned, side by side ─────────
function RedesignTab({
  projectId, target, site, directions, onRedesign, onFeedback, onRefresh, busy,
}: {
  projectId: string;
  target: SerializedProject["references"][number] | null;
  site: SerializedProject["sites"][number] | null;
  directions: SerializedProject["directions"];
  onRedesign: () => void;
  onFeedback: (action: string, targetType: string, targetId: string) => void;
  onRefresh: () => void;
  busy: string | null;
}) {
  const version = site?.versions.find((v) => v.id === site.currentVersionId) ?? site?.versions[0] ?? null;
  const direction = site ? directions.find((d) => d.id === site.directionId)?.direction ?? null : null;

  if (!target) {
    return (
      <div>
        <div className="mb-5 max-w-2xl">
          <h3 className="text-base font-semibold">Redesign an existing website</h3>
          <p className="mt-1 text-sm text-fg-dim">
            Add the current design as a <span className="font-medium text-fg">redesign target</span> — a live URL or a screenshot.
            FORME analyzes its weaknesses, then generates an improved version that <span className="font-medium text-fg">preserves the brand, content, and purpose</span>.
          </p>
        </div>
        <AddReference projectId={projectId} redesign onDone={onRefresh} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone="accent">redesign target</Badge>
          <span className="text-sm font-medium">{target.title || target.sourceUrl || "Original design"}</span>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={onRedesign} disabled={!!busy || !target.hasDna}>
            {busy === "redesign" ? <Spinner className="h-4 w-4" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 22v-6h6M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>}
            {busy === "redesign" ? "Redesigning…" : site ? "Regenerate redesign" : "Generate redesign"}
          </button>
        </div>
      </div>
      {!target.hasDna && <div className="mb-4 rounded-xl border border-[color:var(--warn)]/30 bg-[color:var(--warn)]/10 px-4 py-2.5 text-sm text-[color:var(--warn)]">The target is still being analyzed — its Design DNA must finish before redesigning.</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* ORIGINAL */}
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Original</h4>
            {target.dnaStyle && <span className="text-[11px] text-muted">{target.dnaStyle}</span>}
          </div>
          <div className="overflow-hidden rounded-lg border bg-surface-2">
            {target.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={target.thumb} alt="original" className="max-h-[420px] w-full object-cover object-top" />
            ) : <div className="grid aspect-video place-items-center text-xs text-muted">no capture</div>}
          </div>
          {target.dnaWeaknesses.length > 0 && (
            <div className="mt-3">
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[color:var(--danger)]">Weaknesses to fix</div>
              <ul className="space-y-1 text-xs text-fg-dim">{target.dnaWeaknesses.slice(0, 6).map((w, i) => <li key={i}>• {w}</li>)}</ul>
            </div>
          )}
        </div>

        {/* PROPOSED DIRECTION */}
        <div className="card p-4">
          <h4 className="mb-2 text-sm font-semibold">Proposed direction</h4>
          {direction ? (
            <div className="space-y-2.5 text-sm">
              <p className="text-fg-dim">{direction.visual_concept}</p>
              <div className="flex flex-wrap gap-1.5">{(direction.design_personality ?? []).map((m) => <Badge key={m} tone="accent">{m}</Badge>)}</div>
              {[["Typography", direction.typography_direction], ["Color", direction.color_direction], ["Layout", direction.layout_direction], ["Components", direction.component_direction]].map(([label, val]) =>
                val ? <div key={label as string}><div className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</div><div className="mt-0.5 text-xs text-fg">{val as string}</div></div> : null
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Generate the redesign to see the proposed direction — it preserves the brand while fixing the weaknesses.</p>
          )}
        </div>

        {/* REDESIGNED */}
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Redesigned</h4>
            {typeof version?.score === "number" && <div className="text-sm font-bold" style={{ color: scoreColor(version.score) }}>{Math.round(version.score)}</div>}
          </div>
          {version ? (
            <>
              <div className="overflow-hidden rounded-lg border bg-surface-2">
                {version.screenshotUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={version.screenshotUrl} alt="redesigned" className="max-h-[420px] w-full object-cover object-top" />
                ) : <div className="grid aspect-video place-items-center text-xs text-muted">rendering unavailable</div>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`/api/versions/${version.id}/preview`} target="_blank" rel="noopener noreferrer" className="btn-subtle">Open live ↗</a>
                <button className="btn-ghost" onClick={() => onFeedback("accept", "website", site!.id)} disabled={!!busy}>👍 Keep</button>
                <button className="btn-ghost" onClick={() => onFeedback("reject", "website", site!.id)} disabled={!!busy}>👎 Discard</button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">No redesign yet. Click “Generate redesign”.</p>
          )}
        </div>
      </div>

      {version && (
        <div className="mt-4">
          <PreviewFrame versionId={version.id} />
        </div>
      )}
    </div>
  );
}
