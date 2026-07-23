import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import { DnaViewer } from "@/components/DnaViewer";
import { Badge } from "@/components/ui";
import { parseJSON } from "@/lib/utils";
import { DesignDNASchema } from "@/lib/design/schema";

export const dynamic = "force-dynamic";

export default async function ReferenceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await currentUserId();
  const reference = await db.reference.findFirst({
    where: { id, userId },
    include: { websiteAnalysis: true, dnaProfiles: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!reference) notFound();

  const dnaRow = reference.dnaProfiles[0];
  const dna = dnaRow ? DesignDNASchema.parse(parseJSON(dnaRow.profile, {})) : null;
  const meta = dnaRow ? parseJSON<{ provider?: string }>(dnaRow.modelMeta, {}) : {};
  const fallback = meta.provider === "mock";

  const shot =
    reference.kind === "screenshot"
      ? reference.filePath
      : reference.websiteAnalysis?.fullScreenshot ?? parseJSON<string[]>(reference.websiteAnalysis?.viewportShots, [])[0];

  return (
    <div className="animate-in">
      <Link href="/references" className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-dim hover:text-fg">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        References
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{reference.title || "Reference"}</h1>
        <Badge>{reference.kind === "url" ? "URL" : "Screenshot"}</Badge>
        {reference.sourceUrl && (
          <a href={reference.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-sm text-[color:var(--accent)] hover:underline">
            {reference.sourceUrl} ↗
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="card overflow-hidden p-0">
            {shot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/files/${shot}`} alt={reference.title ?? "capture"} className="max-h-[70vh] w-full object-cover object-top" />
            ) : (
              <div className="grid aspect-video place-items-center text-muted">No screenshot captured</div>
            )}
          </div>
          {reference.websiteAnalysis?.status === "error" && (
            <p className="mt-2 text-xs text-[color:var(--danger)]">Capture note: {reference.websiteAnalysis.error}</p>
          )}
        </div>

        <div>
          {dna ? (
            <DnaViewer dna={dna} fallback={fallback} />
          ) : (
            <div className="card p-8 text-center text-fg-dim">Design DNA is still being extracted…</div>
          )}
        </div>
      </div>
    </div>
  );
}
