"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Spinner } from "@/components/ui";

export function CreateProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const project = await api<{ id: string }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name, description: desc, requirements: idea ? { rawIdea: idea } : undefined }),
      });
      setOpen(false);
      setName("");
      setDesc("");
      setIdea("");
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        New project
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm animate-in" onClick={() => !busy && setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
            <h2 className="text-lg font-semibold">Create a project</h2>
            <p className="mt-1 text-sm text-fg-dim">A workspace for references, design direction, and generated versions.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="label">Project name *</label>
                <input autoFocus className="input" placeholder="Aurora — AI robotics startup" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="label">Short description</label>
                <input className="input" placeholder="Marketing site for a humanoid robotics company" value={desc} onChange={(e) => setDesc(e.target.value)} />
              </div>
              <div>
                <label className="label">Your website idea (optional)</label>
                <textarea className="input min-h-[90px] resize-y" placeholder="Create a website for an AI robotics startup targeting enterprise logistics…" value={idea} onChange={(e) => setIdea(e.target.value)} />
              </div>
            </div>

            {error && <div className="mt-4 rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-3 py-2 text-sm text-[color:var(--danger)]">{error}</div>}

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-subtle" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
                {busy && <Spinner className="h-4 w-4" />}
                {busy ? "Creating…" : "Create project"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
