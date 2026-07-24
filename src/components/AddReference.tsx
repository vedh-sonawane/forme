"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

type Tab = "url" | "upload";

export function AddReference({ projectId, onDone, redesign }: { projectId?: string; onDone?: () => void; redesign?: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("url");
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [device, setDevice] = useState("desktop");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setUrl("");
    setFiles([]);
    setNote("");
    setError(null);
    setStage("");
  }

  async function analyzeUrl() {
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    setStage("Rendering page & extracting Design DNA… this can take ~15–40s");
    try {
      await api("/api/analyze/url", { method: "POST", body: JSON.stringify({ url, projectId, redesign }) });
      reset();
      onDone?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  async function analyzeUpload() {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    setStage("Analyzing screenshots with vision model…");
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      fd.append("device", device);
      if (note) fd.append("note", note);
      if (projectId) fd.append("projectId", projectId);
      if (redesign) fd.append("role", "redesign-target");
      const res = await fetch("/api/analyze/screenshot", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed");
      reset();
      onDone?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-4 inline-flex rounded-xl border bg-surface-2 p-1">
        {(["url", "upload"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("rounded-lg px-4 py-1.5 text-sm font-medium transition", tab === t ? "bg-surface text-fg shadow-sm" : "text-fg-dim hover:text-fg")}>
            {t === "url" ? "Analyze URL" : "Upload screenshots"}
          </button>
        ))}
      </div>

      {tab === "url" ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <input className="input" placeholder="https://linear.app" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && analyzeUrl()} disabled={busy} />
          <button className="btn-primary shrink-0" onClick={analyzeUrl} disabled={busy || !url.trim()}>
            {busy ? <Spinner className="h-4 w-4" /> : null}
            {busy ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      ) : (
        <div>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setFiles(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")).slice(0, 6));
            }}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-surface-2/40 py-8 text-center transition hover:border-accent/40"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted"><path d="M12 16V4M8 8l4-4 4 4" /><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
            <p className="mt-2 text-sm text-fg-dim">{files.length ? `${files.length} file(s) selected` : "Drop screenshots or click to browse"}</p>
            <p className="mt-0.5 text-xs text-muted">PNG, JPG, WEBP — up to 6, 10MB each</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 6))} />

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <select className="input sm:w-40" value={device} onChange={(e) => setDevice(e.target.value)}>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="full">Full page</option>
              <option value="section">Section</option>
              <option value="app">App / UI</option>
            </select>
            <input className="input" placeholder="Optional note (e.g. 'love the typography here')" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn-primary shrink-0" onClick={analyzeUpload} disabled={busy || files.length === 0}>
              {busy ? <Spinner className="h-4 w-4" /> : null}
              {busy ? "Analyzing…" : "Extract DNA"}
            </button>
          </div>
        </div>
      )}

      {stage && <p className="mt-3 flex items-center gap-2 text-xs text-fg-dim"><Spinner className="h-3 w-3" />{stage}</p>}
      {error && <div className="mt-3 rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-3 py-2 text-sm text-[color:var(--danger)]">{error}</div>}
    </div>
  );
}
