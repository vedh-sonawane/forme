import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import { AddReference } from "@/components/AddReference";
import { ReferenceCard } from "@/components/ReferenceCard";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReferencesPage() {
  const userId = await currentUserId();
  const references = await db.reference.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { websiteAnalysis: true, dnaProfiles: { take: 1, orderBy: { createdAt: "desc" } } },
  });

  return (
    <div className="animate-in">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">References</h1>
          <p className="mt-1 text-sm text-fg-dim">Analyze websites and screenshots. FORME extracts their Design DNA — the reusable principles, not a copy.</p>
        </div>
      </div>

      <AddReference />

      <div className="mt-8">
        {references.length === 0 ? (
          <EmptyState title="No references yet" desc="Add a website URL or upload screenshots above to extract Design DNA." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {references.map((r: any) => (
              <ReferenceCard key={r.id} reference={r} hasDna={r.dnaProfiles.length > 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
