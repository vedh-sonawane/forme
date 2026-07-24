import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import { AddReference } from "@/components/AddReference";
import { ReferenceBrowser, type BrowserRef } from "@/components/ReferenceBrowser";
import { parseJSON } from "@/lib/utils";
import { DesignDNASchema } from "@/lib/design/schema";

export const dynamic = "force-dynamic";

const fileUrl = (rel: string | null | undefined) => (rel ? `/api/files/${rel}` : null);

export default async function ReferencesPage() {
  const userId = await currentUserId();
  const [references, collections] = await Promise.all([
    db.reference.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        websiteAnalysis: true,
        dnaProfiles: { take: 1, orderBy: { createdAt: "desc" } },
        collections: { select: { collectionId: true } },
      },
    }),
    db.collection.findMany({ where: { userId }, include: { _count: { select: { references: true } } }, orderBy: { name: "asc" } }),
  ]);

  const serialized: BrowserRef[] = references.map((r) => {
    const dnaRow = r.dnaProfiles[0];
    const style = dnaRow ? DesignDNASchema.parse(parseJSON(dnaRow.profile, {})).style?.primary_style || null : null;
    const thumb =
      r.kind === "screenshot"
        ? fileUrl(r.filePath)
        : fileUrl(r.websiteAnalysis?.fullScreenshot) ?? fileUrl(parseJSON<string[]>(r.websiteAnalysis?.viewportShots, [])[0]);
    return {
      id: r.id,
      kind: r.kind,
      title: r.title,
      sourceUrl: r.sourceUrl,
      thumb,
      hasDna: r.dnaProfiles.length > 0,
      style,
      tags: parseJSON<string[]>(r.tags, []),
      collectionIds: r.collections.map((c) => c.collectionId),
      createdAt: r.createdAt.toISOString(),
    };
  });

  return (
    <div className="animate-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">References</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-fg-dim">Analyze websites and screenshots. FORME extracts their Design DNA — the reusable principles, not a copy.</p>
      </div>

      <AddReference />

      <div className="mt-8">
        <ReferenceBrowser
          references={serialized}
          collections={collections.map((c) => ({ id: c.id, name: c.name, count: c._count.references }))}
        />
      </div>
    </div>
  );
}
