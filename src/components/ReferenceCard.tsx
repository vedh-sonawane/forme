import Link from "next/link";
import { Badge } from "@/components/ui";
import { timeAgo, parseJSON } from "@/lib/utils";

type Ref = {
  id: string;
  kind: string;
  title: string | null;
  sourceUrl: string | null;
  filePath: string | null;
  createdAt: Date;
  websiteAnalysis?: { fullScreenshot: string | null; viewportShots: string | null; status: string } | null;
};

function fileUrl(rel: string | null | undefined): string | null {
  return rel ? `/api/files/${rel}` : null;
}

export function ReferenceCard({ reference: r, hasDna }: { reference: Ref; hasDna: boolean }) {
  const thumb =
    r.kind === "screenshot"
      ? fileUrl(r.filePath)
      : fileUrl(r.websiteAnalysis?.fullScreenshot) ??
        fileUrl(parseJSON<string[]>(r.websiteAnalysis?.viewportShots, [])[0]);

  return (
    <Link href={`/references/${r.id}`} className="card group overflow-hidden p-0 transition hover:border-accent/40">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={r.title ?? "reference"} className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full place-items-center text-muted">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 15l5-4 4 3 3-2 6 4" /></svg>
          </div>
        )}
        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          <Badge>{r.kind === "url" ? "URL" : "Screenshot"}</Badge>
          {hasDna ? <Badge tone="ok">DNA</Badge> : <Badge tone="warn">analyzing</Badge>}
        </div>
      </div>
      <div className="p-4">
        <h3 className="truncate text-sm font-semibold">{r.title || r.sourceUrl || "Untitled"}</h3>
        <div className="mt-1 flex items-center justify-between text-xs text-muted">
          <span className="truncate">{r.sourceUrl ?? "uploaded"}</span>
          <span className="shrink-0">{timeAgo(r.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
