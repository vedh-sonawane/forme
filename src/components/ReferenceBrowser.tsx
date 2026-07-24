"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { cn, timeAgo } from "@/lib/utils";

export type BrowserRef = {
  id: string;
  kind: string;
  title: string | null;
  sourceUrl: string | null;
  thumb: string | null;
  hasDna: boolean;
  style: string | null;
  tags: string[];
  collectionIds: string[];
  createdAt: string;
};

export type BrowserCollection = { id: string; name: string; count: number };

export function ReferenceBrowser({ references, collections }: { references: BrowserRef[]; collections: BrowserCollection[] }) {
  const [q, setQ] = useState("");
  const [collection, setCollection] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    references.forEach((r) => r.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  }, [references]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return references.filter((r) => {
      if (collection && !r.collectionIds.includes(collection)) return false;
      if (tag && !r.tags.includes(tag)) return false;
      if (!needle) return true;
      const hay = [r.title, r.sourceUrl, r.style, ...r.tags].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [references, q, collection, tag]);

  return (
    <div>
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input className="input pl-9" placeholder="Search references by title, URL, style, or tag…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {/* Collection + tag filters */}
        {(collections.length > 0 || allTags.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {collections.length > 0 && (
              <>
                <button onClick={() => setCollection(null)} className={cn("chip", !collection && "border-accent/50 bg-accent/10 text-[color:var(--accent)]")}>All</button>
                {collections.map((c) => (
                  <button key={c.id} onClick={() => setCollection(collection === c.id ? null : c.id)} className={cn("chip", collection === c.id && "border-accent/50 bg-accent/10 text-[color:var(--accent)]")}>
                    {c.name}<span className="text-muted">· {c.count}</span>
                  </button>
                ))}
              </>
            )}
            {allTags.length > 0 && <span className="mx-1 h-4 w-px bg-border" />}
            {allTags.slice(0, 14).map((t) => (
              <button key={t} onClick={() => setTag(tag === t ? null : t)} className={cn("chip", tag === t && "border-accent/50 bg-accent/10 text-[color:var(--accent)]")}>#{t}</button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        {filtered.length === 0 ? (
          <EmptyState title="No matches" desc={references.length === 0 ? "Add a website URL or upload screenshots above to extract Design DNA." : "Try a different search or clear the filters."} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <Link key={r.id} href={`/references/${r.id}`} className="card group overflow-hidden p-0 transition hover:border-accent/40">
                <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
                  {r.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.thumb} alt={r.title ?? "reference"} className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="grid h-full place-items-center text-muted">
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 15l5-4 4 3 3-2 6 4" /></svg>
                    </div>
                  )}
                  <div className="absolute left-2.5 top-2.5 flex gap-1.5">
                    <Badge>{r.kind === "url" ? "URL" : "Screenshot"}</Badge>
                    {r.hasDna ? <Badge tone="ok">DNA</Badge> : <Badge tone="warn">analyzing</Badge>}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="truncate text-sm font-semibold">{r.title || r.sourceUrl || "Untitled"}</h3>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted">
                    <span className="truncate">{r.style || r.sourceUrl || "uploaded"}</span>
                    <span className="shrink-0">{timeAgo(r.createdAt)}</span>
                  </div>
                  {r.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.tags.slice(0, 4).map((t) => <span key={t} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-fg-dim">#{t}</span>)}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
