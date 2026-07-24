import Link from "next/link";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import { Card, Badge, EmptyState, ScoreRing } from "@/components/ui";
import { parseJSON, timeAgo } from "@/lib/utils";
import { DesignDNASchema } from "@/lib/design/schema";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const userId = await currentUserId();
  const [profiles, collections] = await Promise.all([
    db.designDNAProfile.findMany({
      where: { reference: { userId } },
      orderBy: { createdAt: "desc" },
      include: { reference: true },
      take: 60,
    }),
    db.collection.findMany({ where: { userId }, include: { _count: { select: { references: true } } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="animate-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Design Library</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-fg-dim">Every extracted Design DNA profile — your proprietary design intelligence dataset.</p>
      </div>

      {collections.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {collections.map((c) => (
            <span key={c.id} className="chip">{c.name}<span className="text-muted">· {c._count.references}</span></span>
          ))}
        </div>
      )}

      {profiles.length === 0 ? (
        <EmptyState title="No Design DNA yet" desc="Analyze references to build your library." action={<Link href="/references" className="btn-primary">Add references</Link>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => {
            const dna = DesignDNASchema.parse(parseJSON(p.profile, {}));
            const palette = dna.color?.palette?.slice(0, 5) ?? [];
            return (
              <Link key={p.id} href={p.reference ? `/references/${p.reference.id}` : "/library"} className="card-link group p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold capitalize transition-colors group-hover:text-[color:var(--accent)]">{dna.style?.primary_style || "Design DNA"}</h3>
                    <p className="mt-0.5 truncate text-xs text-muted">{p.reference?.title || p.source}</p>
                  </div>
                  <ScoreRing score={dna.style?.perceived_quality ?? 70} size={48} />
                </div>
                <div className="mt-3 flex gap-1.5 overflow-hidden rounded-md">
                  {palette.map((c, i) => (<span key={i} className="h-7 flex-1" style={{ background: c.hex }} title={c.hex} />))}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">{(dna.style?.mood ?? []).slice(0, 2).map((m) => (<Badge key={m}>{m}</Badge>))}</div>
                  <span className="text-[11px] text-muted">{timeAgo(p.createdAt)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
