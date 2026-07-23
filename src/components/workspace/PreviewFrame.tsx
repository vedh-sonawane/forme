"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Sandboxed live preview of a generated version. The generated HTML is LLM output,
// so it renders inside a sandboxed iframe (scripts allowed for the reveal animation,
// but same-origin is NOT granted → it cannot touch FORME's cookies/DOM).
export function PreviewFrame({ versionId }: { versionId: string }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [loading, setLoading] = useState(true);

  const widths = { desktop: "100%", mobile: "390px" };

  return (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b bg-surface-2/40 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--danger)]/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--warn)]/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--ok)]/60" />
          <span className="ml-2 text-xs text-muted">live preview</span>
        </div>
        <div className="inline-flex rounded-lg border bg-surface p-0.5">
          {(["desktop", "mobile"] as const).map((d) => (
            <button key={d} onClick={() => setDevice(d)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition", device === d ? "bg-surface-2 text-fg" : "text-fg-dim hover:text-fg")}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="relative grid place-items-center bg-[#0a0a0c] p-4" style={{ minHeight: 520 }}>
        {loading && <div className="absolute inset-0 grid place-items-center text-sm text-muted">Loading preview…</div>}
        <iframe
          key={device}
          src={`/api/versions/${versionId}/preview`}
          title="Website preview"
          onLoad={() => setLoading(false)}
          sandbox="allow-scripts"
          className="h-[70vh] rounded-lg border bg-white shadow-2xl transition-all"
          style={{ width: widths[device], maxWidth: "100%" }}
        />
      </div>
    </div>
  );
}
