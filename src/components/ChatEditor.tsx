"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/client";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "ai"; text: string; edited?: boolean };

// In-app design copilot. The user types natural-language requests ("move the CTA up",
// "make the hero darker") or questions; edits produce a new version and refresh the
// live preview via onNewVersion.
export function ChatEditor({ versionId, onNewVersion }: { versionId: string; onNewVersion: (id: string) => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: "I'm your design copilot. Tell me what to change — e.g. “make the hero more premium”, “move the nav CTA up”, “add a testimonials section” — or ask me anything about this page." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const suggestions = ["Make it feel more premium", "Improve the spacing & hierarchy", "Add subtle scroll animations", "Make the hero darker"];

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setBusy(true);
    try {
      const res = await api<{ action: string; reply: string; versionId?: string }>("/api/chat-edit", {
        method: "POST",
        body: JSON.stringify({ versionId, message: msg }),
      });
      setMessages((m) => [...m, { role: "ai", text: res.reply, edited: res.action === "edit" }]);
      if (res.action === "edit" && res.versionId) onNewVersion(res.versionId);
    } catch (e) {
      setMessages((m) => [...m, { role: "ai", text: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }));
    }
  }

  return (
    <div className="glass flex h-full min-h-[520px] flex-col overflow-hidden">
      <div className="flex items-center gap-2.5 border-b px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[color:var(--accent)] text-[color:var(--accent-fg)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4z" /><path d="M5 17l.9 2.1L8 20l-2.1.9L5 23l-.9-2.1L2 20l2.1-.9z" /></svg>
        </span>
        <div>
          <div className="text-sm font-semibold">Design copilot</div>
          <div className="text-[11px] text-muted">Edits apply live to the preview</div>
        </div>
      </div>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm", m.role === "user" ? "bg-[color:var(--accent)] text-[color:var(--accent-fg)]" : "border bg-surface text-fg")}>
              {m.edited && <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-[color:var(--ok)]">✓ Applied</span>}
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border bg-surface px-3.5 py-2.5 text-sm text-fg-dim">
              <Spinner className="h-4 w-4" /> Working on it…
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} disabled={busy} className="chip hover:border-accent/40">{s}</button>
          ))}
        </div>
      )}

      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <textarea
            className="input max-h-32 min-h-[44px] resize-none py-2.5"
            placeholder="Ask for a change, or a question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            disabled={busy}
            rows={1}
          />
          <button className="btn-primary h-11 shrink-0 px-4" onClick={() => send(input)} disabled={busy || !input.trim()}>
            {busy ? <Spinner className="h-4 w-4" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>}
          </button>
        </div>
      </div>
    </div>
  );
}
