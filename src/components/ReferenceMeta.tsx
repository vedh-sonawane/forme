"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Spinner, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

type Collection = { id: string; name: string; count: number };

export function ReferenceMeta({
  referenceId,
  initialTags,
  initialNotes,
  collections,
  memberIds,
}: {
  referenceId: string;
  initialTags: string[];
  initialNotes: string;
  collections: Collection[];
  memberIds: string[];
}) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState(initialNotes);
  const [selected, setSelected] = useState<Set<string>>(new Set(memberIds));
  const [cols, setCols] = useState<Collection[]>(collections);
  const [newCol, setNewCol] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t].slice(0, 24));
    setTagInput("");
  }
  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  function toggleCollection(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function createCollection() {
    const name = newCol.trim();
    if (!name) return;
    try {
      const c = await api<Collection>("/api/collections", { method: "POST", body: JSON.stringify({ name }) });
      setCols((prev) => (prev.some((p) => p.id === c.id) ? prev : [...prev, c].sort((a, b) => a.name.localeCompare(b.name))));
      setSelected((prev) => new Set(prev).add(c.id));
      setNewCol("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create collection");
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api(`/api/references/${referenceId}`, {
        method: "PATCH",
        body: JSON.stringify({ tags, notes, collectionIds: [...selected] }),
      });
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h3 className="mb-3 text-sm font-semibold">Organize</h3>

      {/* Tags */}
      <div className="mb-4">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">Tags</div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <button key={t} onClick={() => removeTag(t)} className="chip group" title="Remove tag">
              {t}
              <span className="text-muted transition group-hover:text-[color:var(--danger)]">×</span>
            </button>
          ))}
          {tags.length === 0 && <span className="text-xs text-muted">No tags yet</span>}
        </div>
        <input
          className="input mt-2"
          placeholder="Add a tag and press Enter (e.g. saas, minimal, editorial)"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(tagInput);
            }
          }}
        />
      </div>

      {/* Collections */}
      <div className="mb-4">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">Collections</div>
        <div className="flex flex-wrap gap-1.5">
          {cols.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleCollection(c.id)}
              className={cn("chip transition", selected.has(c.id) ? "border-accent/50 bg-accent/10 text-[color:var(--accent)]" : "hover:border-accent/30")}
            >
              {selected.has(c.id) && <span>✓</span>}
              {c.name}
            </button>
          ))}
          {cols.length === 0 && <span className="text-xs text-muted">No collections yet</span>}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className="input"
            placeholder="New collection (e.g. SaaS, Luxury, Brutalist)"
            value={newCol}
            onChange={(e) => setNewCol(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), createCollection())}
          />
          <button className="btn-subtle shrink-0" onClick={createCollection} disabled={!newCol.trim()}>Add</button>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-4">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">Notes</div>
        <textarea
          className="input min-h-[72px] resize-y"
          placeholder="What do you love about this reference?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : null}
          {busy ? "Saving…" : "Save"}
        </button>
        {saved && <Badge tone="ok">Saved</Badge>}
        {error && <span className="text-sm text-[color:var(--danger)]">{error}</span>}
      </div>
    </div>
  );
}
