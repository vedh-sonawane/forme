"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { SerializedProject } from "@/lib/serialize";
import { AddReference } from "@/components/AddReference";
import { Badge, Spinner, ScoreRing, Meter, EmptyState, scoreColor } from "@/components/ui";
import { cn } from "@/lib/utils";
import { DirectionView, SystemPreview, CritiqueView } from "./Viewers";
import { PreviewFrame } from "./PreviewFrame";

type Tab = "overview" | "references" | "direction" | "blueprint" | "build" | "files" | "redesign" | "versions";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "references", label: "References" },
  { id: "direction", label: "Design Direction" },
  { id: "blueprint", label: "App Blueprint" },
  { id: "build", label: "Build & Critique" },
  { id: "files", label: "Files" },
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
  const edit = (instruction: string) => latestSite && run("edit", () => api(`/api/websites/${latestSite.id}/edit`, { method: "POST", body: JSON.stringify({ instruction }) }), "Edit applied");
  const restore = (versionId: string) => latestSite && run("restore", () => api(`/api/websites/${latestSite.id}/restore`, { method: "POST", body: JSON.stringify({ versionId }) }), "Version restored");
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
          {latestSite && (
            <>
              <a className="btn-ghost" href={`/api/projects/${p.id}/export`} title="Download the generated site + Design DNA as a .zip">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                Export site
              </a>
              <a className="btn-ghost" href={`/api/projects/${p.id}/export?mode=app`} title="Download a complete, runnable Next.js app generated from the Application Blueprint">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>
                Export app
              </a>
            </>
          )}
          {!latestDirection && <button className="btn-ghost" onClick={genDirection} disabled={!!busy}>{busy === "direction" ? <Spinner className="h-4 w-4" /> : null} Generate direction</button>}
          <button className="btn-primary" onClick={genWebsite} disabled={!!busy}>
            {busy === "generate" ? <Spinner className="h-4 w-4" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5z" /></svg>}
            {busy === "generate" ? "Generating…" : latestSite ? "Regenerate" : "Generate website"}
          </button>
        </div>
      </div>

      {(busy === "generate" || busy === "direction" || busy === "improve" || busy === "redesign" || busy === "edit") && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
          <Spinner className="h-4 w-4 text-[color:var(--accent)]" />
          <span className="text-fg-dim">
            {busy === "direction" && "Analyzing requirements → synthesizing references → composing design direction & system…"}
            {busy === "generate" && "Direction → design system → architecture → code generation → browser render → visual critique. This can take 30–90s."}
            {busy === "improve" && "Applying critique fixes → re-rendering → re-critiquing → checking for regressions…"}
            {busy === "edit" && "Applying your edit in place → re-rendering → re-critiquing…"}
            {busy === "redesign" && "Analyzing the original → preserving brand & content → composing an improved direction → generating & critiquing the redesign…"}
          </span>
        </div>
      )}
      {error && <div className="mb-4 rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-4 py-2.5 text-sm text-[color:var(--danger)]">{error}</div>}
      {toast && <div className="mb-4 rounded-xl border border-[color:var(--ok)]/30 bg-[color:var(--ok)]/10 px-4 py-2.5 text-sm text-[color:var(--ok)]">{toast}</div>}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("relative px-4 py-2.5 text-sm font-medium transition", tab === t.id ? "text-fg" : "text-fg-dim hover:text-fg")}>
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
                  {latestDirection.model && <div className="mt-2 flex items-center gap-2 text-xs text-fg-dim"><span>Planned by</span><ModelBadge model={latestDirection.model} /></div>}
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

      {/* APP BLUEPRINT */}
      {tab === "blueprint" && <BlueprintTab projectId={p.id} />}

      {/* FILES */}
      {tab === "files" && <FilesTab projectId={p.id} />}

      {/* BUILD & CRITIQUE */}
      {tab === "build" && (
        <BuildTab
          site={latestSite}
          selectedVersionId={selectedVersionId}
          setSelectedVersionId={setSelectedVersionId}
          onGenerate={genWebsite}
          onImprove={improve}
          onEdit={edit}
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
                        <ModelBadge model={v.model} showModel={false} />
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-fg-dim">{v.changeNote}</p>
                    </div>
                    {typeof v.score === "number" && <div className="shrink-0 text-right"><div className="text-lg font-bold" style={{ color: scoreColor(v.score) }}>{Math.round(v.score)}</div><div className="text-[10px] text-muted">score</div></div>}
                    {!isCurrent && <button className="btn-subtle shrink-0" onClick={() => restore(v.id)} disabled={!!busy} title="Roll back to this version">{busy === "restore" ? <Spinner className="h-4 w-4" /> : null}Restore</button>}
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
// Which AI actually produced a version — shown so you know e.g. "made by Gemini, no fallback".
type VersionModel = { provider: string; model: string; usedFallback?: boolean; source?: string } | null | undefined;
function providerLabel(p?: string) {
  return p === "gemini" ? "Gemini" : p === "mistral" ? "Mistral AI" : p === "openrouter" ? "OpenRouter" : p === "mock" ? "Mock (dev fallback)" : p || "—";
}
function ModelBadge({ model, showModel = true }: { model: VersionModel; showModel?: boolean }) {
  if (!model || !model.provider) return null;
  const isMock = model.provider === "mock";
  return (
    <span className="inline-flex items-center gap-1.5" title={`Generated by ${providerLabel(model.provider)} · ${model.model}${isMock ? " (no real AI available)" : ""}`}>
      <Badge tone={isMock ? "warn" : "ok"}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 4.9L19 9.8l-4 3.4 1.2 5.1L12 15.7 7.8 18.3 9 13.2 5 9.8l5.1-1.9z" /></svg>
        {providerLabel(model.provider)}
      </Badge>
      {showModel && <span className="font-mono text-[10px] text-muted">{model.model}</span>}
    </span>
  );
}

const EDIT_PRESETS = [
  "Make it feel more premium",
  "Change the palette to emerald green",
  "Add a pricing section",
  "Make the navigation sticky",
  "Add a dark mode toggle",
  "Tighten mobile spacing",
  "Use larger, bolder typography",
];

function BuildTab({
  site, selectedVersionId, setSelectedVersionId, onGenerate, onImprove, onEdit, onFeedback, busy,
}: {
  site: SerializedProject["sites"][number] | null;
  selectedVersionId: string | null;
  setSelectedVersionId: (id: string) => void;
  onGenerate: () => void;
  onImprove: () => void;
  onEdit: (instruction: string) => void;
  onFeedback: (action: string, targetType: string, targetId: string) => void;
  busy: string | null;
}) {
  const [instruction, setInstruction] = useState("");
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
          <div className="ml-auto"><ModelBadge model={selected.model} /></div>
        </div>
        <PreviewFrame versionId={selected.id} />
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[color:var(--accent)]"><path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5z" /></svg>
            <h3 className="text-sm font-semibold">AI Editor</h3>
          </div>
          <p className="mt-1 text-xs text-fg-dim">Describe a change in plain English — it edits this version in place and saves a new version.</p>
          <textarea
            className="input mt-3 min-h-[78px] resize-y"
            placeholder="e.g. Make the hero more premium and switch the palette to emerald green"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            disabled={!!busy}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EDIT_PRESETS.map((preset) => (
              <button key={preset} type="button" className="chip" disabled={!!busy} onClick={() => setInstruction(preset)}>{preset}</button>
            ))}
          </div>
          <button className="btn-primary mt-3 w-full" disabled={!!busy || !instruction.trim()} onClick={() => onEdit(instruction.trim())}>
            {busy === "edit" ? <Spinner className="h-4 w-4" /> : null}{busy === "edit" ? "Applying…" : "Apply edit"}
          </button>
        </div>

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

        {selected.critique ? (
          <div className="space-y-2">
            {selected.critiqueModel && <div className="flex items-center gap-2 px-1 text-xs text-fg-dim"><span>Critiqued by</span><ModelBadge model={selected.critiqueModel} /></div>}
            <CritiqueView critique={selected.critique} />
          </div>
        ) : <div className="card p-5 text-sm text-muted">No critique for this version.</div>}
      </div>
    </div>
  );
}

// ── Deploy: ship the generated application to Vercel ──────────────────────────────
type DeployRow = { id: string; status: string; url: string | null; inspectorUrl: string | null; error: string | null; createdAt: string };

function DeployCard({ projectId }: { projectId: string }) {
  const [configured, setConfigured] = useState(true);
  const [rows, setRows] = useState<DeployRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      const d = await api<{ configured: boolean; deployments: DeployRow[] }>(`/api/projects/${projectId}/deploy`);
      setConfigured(d.configured);
      setRows(d.deployments);
      return d.deployments;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Poll while a build is in flight.
  useEffect(() => {
    if (!rows.some((r) => r.status === "queued" || r.status === "building")) return;
    const t = setInterval(() => void load(), 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  async function deploy() {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/projects/${projectId}/deploy`, { method: "POST" });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Deployment failed.");
    } finally {
      setBusy(false);
    }
  }

  const tone = (s: string) => (s === "ready" ? "ok" : s === "error" || s === "canceled" ? "danger" : "warn") as "ok" | "danger" | "warn";

  return (
    <div className="card mb-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Deploy</h3>
          <p className="mt-1 text-xs text-fg-dim">Ship this generated application to Vercel — production build, live URL.</p>
        </div>
        <button className="btn-primary" onClick={deploy} disabled={busy || !configured}>
          {busy ? <Spinner className="h-4 w-4" /> : null}{busy ? "Deploying…" : "Deploy to Vercel"}
        </button>
      </div>

      {!configured && (
        <div className="mt-3 rounded-xl border border-[color:var(--warn)]/30 bg-[color:var(--warn)]/10 px-3 py-2 text-xs text-[color:var(--warn)]">
          Set <span className="font-mono">VERCEL_TOKEN</span> in <span className="font-mono">.env</span> (create one at vercel.com/account/tokens), then restart. Optionally set{" "}
          <span className="font-mono">DEPLOY_DATABASE_URL</span> to a managed Postgres URL so the deployed app has a working database.
        </div>
      )}
      {err && <div className="mt-3 rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-[color:var(--danger)]">{err}</div>}

      {rows.length > 0 && (
        <div className="mt-4 space-y-2">
          {rows.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 text-xs">
              <Badge tone={tone(d.status)}>{d.status}</Badge>
              {d.url ? (
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="truncate font-medium text-[color:var(--accent)] hover:underline">{d.url}</a>
              ) : (
                <span className="text-muted">building…</span>
              )}
              {d.error && <span className="truncate text-[color:var(--danger)]">{d.error}</span>}
              {d.inspectorUrl && <a href={d.inspectorUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-muted hover:text-fg">Build logs ↗</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Files tab: browse the generated application's source tree ─────────────────────
type FileEntry = { path: string; size: number };

const fileIcon = (path: string) => {
  if (/\.tsx?$/.test(path)) return "TS";
  if (/\.css$/.test(path)) return "CSS";
  if (/\.prisma$/.test(path)) return "DB";
  if (/\.json$/.test(path)) return "{}";
  if (/\.md$/.test(path)) return "MD";
  return "•";
};

// Next.js file names repeat (page.tsx / route.ts / layout.tsx), so show the parent
// folder with them — otherwise the tree is a wall of identical labels.
const GENERIC = /^(page|route|layout|loading|error|not-found)\.(tsx?|ts)$/;
const fileLabel = (path: string) => {
  const parts = path.split("/");
  const name = parts[parts.length - 1];
  if (GENERIC.test(name) && parts.length > 1) return `${parts[parts.length - 2]}/${name}`;
  return name;
};

function FilesTab({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [appName, setAppName] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await api<{ appName: string; files: FileEntry[] }>(`/api/projects/${projectId}/files`);
        if (!alive) return;
        setFiles(d.files);
        setAppName(d.appName);
        const first = d.files.find((f) => f.path.endsWith("prisma/schema.prisma")) ?? d.files[0];
        if (first) void open(first.path);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "Could not load files.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function open(path: string) {
    setSelected(path);
    setLoadingFile(true);
    setCopied(false);
    try {
      const d = await api<{ content: string }>(`/api/projects/${projectId}/files?path=${encodeURIComponent(path)}`);
      setContent(d.content);
    } catch {
      setContent("// Could not load this file.");
    } finally {
      setLoadingFile(false);
    }
  }

  if (loading) return <div className="card p-6 text-sm text-muted">Loading project files…</div>;
  if (err) {
    return <EmptyState title="No application files yet" desc={err} action={<span className="text-xs text-muted">Generate an App Blueprint first, then come back.</span>} />;
  }

  // Group by top-level folder for a readable tree.
  const groups = new Map<string, FileEntry[]>();
  for (const f of files) {
    const parts = f.path.split("/");
    const key = parts.length > 1 ? parts.slice(0, parts.length > 2 ? 2 : 1).join("/") : "(root)";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }

  const lines = content.split("\n");

  return (
    <div className="animate-in">
      <DeployCard projectId={projectId} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{appName} — generated source</h3>
          <p className="text-xs text-fg-dim">{files.length} files · a complete Next.js + Prisma app built from the blueprint.</p>
        </div>
        <a className="btn-ghost" href={`/api/projects/${projectId}/export?mode=app`}>Download project</a>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        <div className="card max-h-[70vh] overflow-auto p-3">
          {[...groups.entries()].map(([folder, entries]) => (
            <div key={folder} className="mb-3">
              <div className="mb-1 px-2 font-mono text-[10px] uppercase tracking-wider text-muted">{folder}</div>
              {entries.map((f) => (
                <button
                  key={f.path}
                  onClick={() => open(f.path)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition",
                    selected === f.path ? "bg-accent/15 text-fg" : "text-fg-dim hover:bg-surface-2 hover:text-fg"
                  )}
                >
                  <span className="w-6 shrink-0 font-mono text-[9px] text-muted">{fileIcon(f.path)}</span>
                  <span className="truncate" title={f.path}>{fileLabel(f.path)}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-muted">{f.size > 1024 ? `${Math.round(f.size / 1024)}k` : f.size}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="truncate font-mono text-xs text-fg-dim">{selected ?? "Select a file"}</span>
            <button
              className="btn-subtle text-xs"
              onClick={() => { navigator.clipboard?.writeText(content); setCopied(true); }}
              disabled={!content}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="max-h-[70vh] overflow-auto bg-surface-2/40">
            {loadingFile ? (
              <div className="p-6 text-sm text-muted">Loading…</div>
            ) : (
              <pre className="p-0 text-xs leading-relaxed">
                <code className="block font-mono">
                  {lines.map((line, i) => (
                    <span key={i} className="flex">
                      <span className="w-12 shrink-0 select-none border-r px-2 py-[1px] text-right text-[10px] text-muted">{i + 1}</span>
                      <span className="whitespace-pre-wrap break-all px-3 py-[1px] text-fg-dim">{line || " "}</span>
                    </span>
                  ))}
                </code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── App Blueprint tab: the full-stack plan (Track B foundation) ───────────────────
type Blueprint = {
  summary: string; app_type: string; business_goals: string[]; architecture: string;
  entities: { name: string; description: string; fields: { name: string; type: string; note: string }[] }[];
  relationships: { from: string; to: string; kind: string }[];
  pages: { name: string; path: string; purpose: string; auth: boolean }[];
  api_endpoints: { method: string; path: string; purpose: string; auth: boolean }[];
  auth: { required: boolean; methods: string[]; roles: string[] };
  backend_services: string[]; integrations: string[]; env_vars: string[];
  deployment: string; testing_plan: string[]; scaling_notes: string;
  _model?: { provider: string; model: string; usedFallback: boolean } | null;
};

function BpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card p-5"><h3 className="mb-3 text-sm font-semibold">{title}</h3>{children}</div>;
}

function BlueprintTab({ projectId }: { projectId: string }) {
  const [bp, setBp] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [gen, setGen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const d = await api<{ blueprint: Blueprint | null }>(`/api/projects/${projectId}/blueprint`); if (alive) setBp(d.blueprint); }
      catch { /* none yet */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [projectId]);

  async function generate() {
    setGen(true); setErr(null);
    try { const d = await api<{ blueprint: Blueprint }>(`/api/projects/${projectId}/blueprint`, { method: "POST" }); setBp(d.blueprint); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to plan the app."); }
    finally { setGen(false); }
  }

  if (loading) return <div className="card p-6 text-sm text-muted">Loading blueprint…</div>;

  if (!bp) return (
    <EmptyState
      title="No application blueprint yet"
      desc="Plan the full-stack app — entities, pages, API, auth, and deployment — before generating. This is the foundation for full app generation."
      action={<button className="btn-primary" onClick={generate} disabled={gen}>{gen ? <Spinner className="h-4 w-4" /> : null}{gen ? "Planning…" : "Generate blueprint"}</button>}
    />
  );

  return (
    <div className="animate-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2"><Badge tone="accent">{bp.app_type || "app"}</Badge><span className="text-sm font-semibold">Application Blueprint</span>{bp._model && <ModelBadge model={bp._model} />}</div>
          <p className="mt-1 max-w-2xl text-sm text-fg-dim">{bp.summary}</p>
        </div>
        <button className="btn-ghost" onClick={generate} disabled={gen}>{gen ? <Spinner className="h-4 w-4" /> : null}{gen ? "Re-planning…" : "Regenerate"}</button>
      </div>
      {err && <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-4 py-2 text-sm text-[color:var(--danger)]">{err}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BpSection title="Data model">
          <div className="space-y-3">
            {bp.entities.map((e) => (
              <div key={e.name} className="rounded-xl border p-3">
                <div className="font-medium">{e.name}</div>
                {e.description && <div className="text-xs text-muted">{e.description}</div>}
                <div className="mt-2 flex flex-wrap gap-1.5">{e.fields.map((f) => <span key={f.name} className="chip">{f.name}<span className="text-muted">: {f.type}</span></span>)}</div>
              </div>
            ))}
            {bp.relationships.length > 0 && <div className="mt-1 text-xs text-fg-dim">{bp.relationships.map((r, i) => <div key={i}>• {r.from} — {r.kind} — {r.to}</div>)}</div>}
          </div>
        </BpSection>

        <BpSection title="Pages & routes">
          <ul className="space-y-1.5 text-sm">{bp.pages.map((pg) => (
            <li key={pg.path + pg.name} className="flex items-center justify-between gap-2">
              <span><span className="font-mono text-xs text-fg-dim">{pg.path}</span> · {pg.name}</span>
              {pg.auth && <Badge tone="warn">auth</Badge>}
            </li>
          ))}</ul>
        </BpSection>

        <BpSection title="API endpoints">
          <ul className="space-y-1.5 text-sm">{bp.api_endpoints.map((ep, i) => (
            <li key={i} className="flex items-center gap-2"><span className="w-14 shrink-0 font-mono text-[11px] text-[color:var(--accent)]">{ep.method}</span><span className="truncate font-mono text-xs text-fg-dim">{ep.path}</span>{ep.auth && <Badge tone="warn">auth</Badge>}</li>
          ))}</ul>
        </BpSection>

        <BpSection title="Auth & services">
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-1.5">Authentication: {bp.auth.required ? <Badge tone="ok">required</Badge> : <Badge>optional</Badge>}{bp.auth.methods.map((m) => <Badge key={m}>{m}</Badge>)}</div>
            {bp.auth.roles.length > 0 && <div className="flex flex-wrap items-center gap-1.5">Roles: {bp.auth.roles.map((r) => <Badge key={r} tone="accent">{r}</Badge>)}</div>}
            <div className="flex flex-wrap gap-1.5">{bp.backend_services.map((s) => <span key={s} className="chip">{s}</span>)}</div>
          </div>
        </BpSection>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BpSection title="Env vars"><div className="flex flex-wrap gap-1.5">{bp.env_vars.map((v) => <span key={v} className="chip font-mono">{v}</span>)}</div></BpSection>
        <BpSection title="Deployment"><p className="text-sm text-fg-dim">{bp.deployment}</p></BpSection>
        <BpSection title="Testing plan"><ul className="space-y-1 text-sm text-fg-dim">{bp.testing_plan.map((t) => <li key={t}>• {t}</li>)}</ul></BpSection>
      </div>

      <div className="card border-accent/30 bg-accent/5 p-4 text-sm text-fg-dim">
        This is the planning foundation for <span className="font-medium text-fg">full-stack app generation</span> — generating a multi-file, runnable app from this blueprint is the next Track B phase.
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
