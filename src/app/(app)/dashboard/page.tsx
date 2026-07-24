import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { AreaSpark, BarChart, Donut } from "@/components/charts";
import { EmptyState, scoreColor } from "@/components/ui";
import { timeAgo, parseJSON } from "@/lib/utils";
import { DesignDNASchema } from "@/lib/design/schema";

export const dynamic = "force-dynamic";

const fileUrl = (rel: string | null | undefined) => (rel ? `/api/files/${rel}` : null);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Bucket a list of dates into the last `n` month counts (oldest → newest).
function monthlyCounts(dates: Date[], n = 8): { label: string; value: number }[] {
  const now = new Date();
  const buckets: { key: string; label: string; value: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], value: 0 });
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const dt of dates) {
    const k = `${dt.getFullYear()}-${dt.getMonth()}`;
    const i = idx.get(k);
    if (i !== undefined) buckets[i].value += 1;
  }
  return buckets.map((b) => ({ label: b.label, value: b.value }));
}

const DONUT_COLORS = ["#4f8cff", "#a88bff", "#46d69f", "#f0b23a", "#ff5d67", "#22d3ee"];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const userId = user.id;

  const [projectCount, refCount, projects, recentRefs, allVersions, dnaProfiles, refDates, dnaDates] = await Promise.all([
    db.project.count({ where: { userId } }),
    db.reference.count({ where: { userId } }),
    db.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        generatedSites: { orderBy: { updatedAt: "desc" }, take: 1, include: { versions: { orderBy: { version: "desc" }, take: 1, include: { critiques: { take: 1, orderBy: { createdAt: "desc" } } } } } },
        _count: { select: { references: true } },
      },
    }),
    db.reference.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { websiteAnalysis: true, dnaProfiles: { take: 1, orderBy: { createdAt: "desc" } } },
    }),
    db.websiteVersion.findMany({
      where: { website: { project: { userId } } },
      orderBy: { createdAt: "asc" },
      include: { website: { include: { project: { select: { name: true } } } } },
    }),
    db.designDNAProfile.findMany({ where: { OR: [{ reference: { userId } }, { project: { userId } }] }, select: { profile: true } }),
    db.reference.findMany({ where: { userId }, select: { createdAt: true } }),
    db.designDNAProfile.findMany({ where: { OR: [{ reference: { userId } }, { project: { userId } }] }, select: { createdAt: true } }),
  ]);

  const scored = allVersions.filter((v) => v.overallScore != null);
  const avgScore = scored.length ? Math.round(scored.reduce((a, v) => a + (v.overallScore ?? 0), 0) / scored.length) : 0;
  const bestScore = scored.length ? Math.round(Math.max(...scored.map((v) => v.overallScore ?? 0))) : 0;

  // Stat card spark data
  const projSpark = monthlyCounts(projects.map((p) => p.createdAt)).map((m) => m.value);
  const refSpark = monthlyCounts(refDates.map((r) => r.createdAt)).map((m) => m.value);
  const qualitySpark = (scored.length ? scored : [{ overallScore: 0 }]).slice(-10).map((v) => v.overallScore ?? 0);

  // Big bar chart: quality of the last ~20 rendered versions
  const barData = scored.slice(-20).map((v, i) => ({ label: v.website.project.name, value: Math.round(v.overallScore ?? 0), key: i }));

  // Donut: design categories from DNA
  const catCount = new Map<string, number>();
  for (const d of dnaProfiles) {
    const dna = DesignDNASchema.parse(parseJSON(d.profile, {}));
    const raw = (dna.style?.design_category || dna.style?.primary_style || dna.style?.industry || "Uncategorized").trim();
    const cat = raw.charAt(0).toUpperCase() + raw.slice(1);
    catCount.set(cat, (catCount.get(cat) ?? 0) + 1);
  }
  const catTotal = [...catCount.values()].reduce((a, b) => a + b, 0) || 1;
  const segments = [...catCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value], i) => ({ label, value, color: DONUT_COLORS[i % DONUT_COLORS.length] }));

  const latest = [...allVersions].reverse().slice(0, 5);

  const stats = [
    { label: "Projects", value: String(projectCount), spark: projSpark, color: "var(--accent)", tone: "up" as const },
    { label: "References", value: String(refCount), spark: refSpark, color: "#46d69f", tone: "up" as const },
    { label: "Avg quality", value: avgScore ? String(avgScore) : "—", spark: qualitySpark, color: "#a88bff", tone: "up" as const },
  ];

  return (
    <div className="animate-in">
      {/* Topbar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input placeholder="Search projects, references, DNA…" className="input rounded-full pl-10" />
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-full border bg-surface/70 text-fg-dim transition hover:text-fg" aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        </button>
      </div>

      {/* Header + controls */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-fg-dim">Your design-intelligence analytics, live.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip gap-2"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M7 12h10M10 18h4" /></svg>Filter</span>
          <span className="chip gap-2">Last 30 days <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg></span>
          <Link href="/projects" className="btn-primary">New project</Link>
        </div>
      </div>

      {/* Stat cards with mini charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="text-sm text-fg-dim">{s.label}</div>
            <div className="mt-1 font-display text-3xl font-bold tracking-tight tabular-nums">{s.value}</div>
            <div className="mt-3"><AreaSpark data={s.spark} color={s.color} tone={s.tone} /></div>
          </div>
        ))}
      </div>

      {/* Big chart + donut */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-fg-dim">Quality score</div>
              <div className="mt-1 font-display text-3xl font-bold tracking-tight tabular-nums">{avgScore || "—"}<span className="ml-2 align-middle text-sm font-normal text-fg-dim">avg</span></div>
            </div>
            <span className="chip"><span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" />Rendered versions</span>
          </div>
          <div className="mt-4">
            {barData.length ? <BarChart data={barData} /> : <div className="grid h-[260px] place-items-center text-sm text-muted">No rendered versions yet — generate a website to populate this.</div>}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-fg-dim">Design categories</div>
          <div className="mt-1 font-display text-3xl font-bold tracking-tight tabular-nums">{dnaProfiles.length}<span className="ml-2 align-middle text-sm font-normal text-fg-dim">profiles</span></div>
          <div className="relative mt-4 grid place-items-center">
            {segments.length ? (
              <>
                <Donut segments={segments} />
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <div className="font-display text-lg font-bold leading-none">Design DNA</div>
                    <div className="mt-1 text-[11px] text-muted">all time</div>
                  </div>
                </div>
              </>
            ) : <div className="grid h-[190px] place-items-center text-sm text-muted">Analyze references to map categories.</div>}
          </div>
          {segments.length > 0 && (
            <div className="mt-5 space-y-2.5">
              <div className="flex justify-between text-[11px] uppercase tracking-wider text-muted"><span>Category</span><span>Share</span></div>
              {segments.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} /><span className="truncate">{s.label}</span></span>
                  <span className="tabular-nums text-fg-dim">{Math.round((s.value / catTotal) * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Two tables */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Latest generations</h2>
          {latest.length === 0 ? (
            <EmptyState title="Nothing generated yet" desc="Generate a website to see it here." action={<Link href="/projects" className="btn-primary">New project</Link>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                    <th className="pb-2 font-medium">Project</th><th className="pb-2 font-medium">Version</th><th className="pb-2 font-medium">Date</th><th className="pb-2 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.map((v) => (
                    <tr key={v.id} className="border-t">
                      <td className="max-w-[160px] truncate py-2.5 pr-2 font-medium">{v.website.project.name}</td>
                      <td className="py-2.5 pr-2 text-fg-dim">{v.label || `v${v.version}`}</td>
                      <td className="py-2.5 pr-2 text-fg-dim">{timeAgo(v.createdAt)}</td>
                      <td className="py-2.5 text-right">
                        {v.overallScore != null ? <span className="rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums" style={{ color: scoreColor(v.overallScore), background: "color-mix(in srgb, currentColor 12%, transparent)" }}>{Math.round(v.overallScore)}</span> : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Top references</h2>
          {recentRefs.length === 0 ? (
            <p className="text-sm text-muted">No references analyzed yet.</p>
          ) : (
            <div className="space-y-2">
              {recentRefs.map((r) => {
                const thumb = r.kind === "screenshot" ? fileUrl(r.filePath) : fileUrl(r.websiteAnalysis?.fullScreenshot) ?? fileUrl(parseJSON<string[]>(r.websiteAnalysis?.viewportShots, [])[0]);
                const dna = r.dnaProfiles[0] ? DesignDNASchema.parse(parseJSON(r.dnaProfiles[0].profile, {})) : null;
                return (
                  <Link key={r.id} href={`/references/${r.id}`} className="flex items-center gap-3 rounded-2xl border bg-surface/50 p-2.5 transition hover:border-accent/40">
                    <span className="h-11 w-16 shrink-0 overflow-hidden rounded-xl border bg-surface-2">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={r.title ?? ""} className="h-full w-full object-cover object-top" />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.title || r.sourceUrl || "Reference"}</div>
                      <div className="truncate text-xs text-muted">{dna?.style?.primary_style || r.kind}</div>
                    </div>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums" style={{ color: scoreColor(dna?.style?.perceived_quality ?? 70), background: "color-mix(in srgb, currentColor 12%, transparent)" }}>{Math.round(dna?.style?.perceived_quality ?? 70)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
