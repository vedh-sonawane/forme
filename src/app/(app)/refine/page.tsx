"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { PreviewFrame } from "@/components/workspace/PreviewFrame";
import { ChatEditor } from "@/components/ChatEditor";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

type Result = { projectId: string; siteId: string; originalVersionId: string; refinedVersionId: string; refinedFallback: boolean };

export default function RefinePage() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [view, setView] = useState<"refined" | "original">("refined");
  const [refinedId, setRefinedId] = useState<string | null>(null);

  async function run() {
    if (!url.trim() || busy) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await api<Result>("/api/refine", { method: "POST", body: JSON.stringify({ url }) });
      setResult(res);
      setRefinedId(res.refinedVersionId);
      setView("refined");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refine failed");
    } finally {
      setBusy(false);
    }
  }

  const shownVersion = view === "refined" ? (refinedId ?? result?.refinedVersionId) : result?.originalVersionId;

  return (
    <div className="animate-in">
      <div className="mb-6">
        <p className="eyebrow">Refine from a link</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Paste a site. Get a <span className="serif italic font-normal">premium</span> one back.</h1>
        <p className="mt-2 max-w-2xl text-sm text-fg-dim">FORME pulls the real code from any public URL, then refines it — fixing generic sections, elevating type & spacing, and adding tasteful motion — while keeping every word, link, and image. Then chat to fine-tune it.</p>
      </div>

      <div className="glass p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
            <input className="input pl-10" placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} disabled={busy} />
          </div>
          <button className="btn-primary shrink-0 px-6" onClick={run} disabled={busy || !url.trim()}>
            {busy ? <Spinner className="h-4 w-4" /> : null}{busy ? "Refining…" : "Refine site"}
          </button>
        </div>
        {busy && <p className="mt-3 flex items-center gap-2 text-xs text-fg-dim"><Spinner className="h-3 w-3" />Capturing the real code → refining the design… this can take 20–60s.</p>}
        {error && <div className="mt-3 rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-3 py-2 text-sm text-[color:var(--danger)]">{error}</div>}
      </div>

      {result && (
        <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_400px]">
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-full border bg-surface p-1">
                {(["refined", "original"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)} className={cn("rounded-full px-4 py-1.5 text-sm font-medium capitalize transition", view === v ? "bg-[color:var(--accent)] text-[color:var(--accent-fg)]" : "text-fg-dim hover:text-fg")}>
                    {v}{v === "refined" && result.refinedFallback ? " (unavailable)" : ""}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <a href={`/api/versions/${shownVersion}/preview`} target="_blank" rel="noopener noreferrer" className="btn-subtle">Open ↗</a>
                <a href={`/api/versions/${shownVersion}/download`} className="btn-ghost">Download .zip</a>
                <Link href={`/projects/${result.projectId}`} className="btn-primary">Open in workspace</Link>
              </div>
            </div>
            {shownVersion && <PreviewFrame key={shownVersion} versionId={shownVersion} />}
            {result.refinedFallback && view === "refined" && (
              <p className="mt-2 text-xs text-[color:var(--warn)]">The refinement pass couldn’t complete (model busy) — showing the original for now. Try the copilot, or refine again.</p>
            )}
          </div>
          <div>{refinedId && <ChatEditor versionId={refinedId} onNewVersion={setRefinedId} />}</div>
        </div>
      )}

      {!result && !busy && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ["Keeps your content", "Every heading, image, and link is preserved — only the design gets better."],
            ["Real code, refined", "It works on the site's actual HTML, not a from-scratch guess."],
            ["Chat to perfect it", "Tell the copilot “move that up” or “make it darker” and watch it update live."],
          ].map(([t, d]) => (
            <div key={t} className="card p-5">
              <h3 className="font-display text-base font-bold">{t}</h3>
              <p className="mt-1.5 text-sm text-fg-dim">{d}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
