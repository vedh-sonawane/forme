import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { ScoreRing, EmptyState } from "@/components/ui";
import { timeAgo, parseJSON } from "@/lib/utils";
import { DesignDNASchema } from "@/lib/design/schema";

export const dynamic = "force-dynamic";

const fileUrl = (rel: string | null | undefined) => (rel ? `/api/files/${rel}` : null);

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const userId = user.id;

  const [projectCount, refCount, dnaCount, projects, recentRefs, scoredVersions] = await Promise.all([
    db.project.count({ where: { userId } }),
    db.reference.count({ where: { userId } }),
    db.designDNAProfile.count({ where: { OR: [{ reference: { userId } }, { project: { userId } }] } }),
    db.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        generatedSites: { orderBy: { updatedAt: "desc" }, take: 1, include: { versions: { orderBy: { version: "desc" }, take: 1 } } },
        _count: { select: { references: true, directions: true } },
      },
    }),
    db.reference.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { websiteAnalysis: true, dnaProfiles: { take: 1, orderBy: { createdAt: "desc" } } },
    }),
    db.websiteVersion.findMany({
      where: { website: { project: { userId } }, overallScore: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { overallScore: true },
    }),
  ]);

  const avgScore = scoredVersions.length
    ? Math.round(scoredVersions.reduce((a, v) => a + (v.overallScore ?? 0), 0) / scoredVersions.length)
    : null;

  const firstName = (user.name || user.email.split("@")[0] || "there").split(" ")[0];

  const stats = [
    { label: "Projects", value: projectCount, tone: "var(--accent)" },
    { label: "References", value: refCount, tone: "var(--mint)" },
    { label: "DNA profiles", value: dnaCount, tone: "var(--violet)" },
    { label: "Renders scored", value: scoredVersions.length, tone: "var(--spark)" },
  ];

  return (
    <div className="animate-in">
      {/* Welcome header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-[color:var(--spark)]" /> Workspace</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Welcome back, <span className="serif italic font-normal">{firstName}</span>
          </h1>
          <p className="mt-2 max-w-md text-sm text-fg-dim">Your design-intelligence workspace — analyze the best, then generate sites that look intentional.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/references" className="btn-ghost">Add reference</Link>
          <Link href="/projects" className="btn-primary">New project</Link>
        </div>
      </div>

      {/* Stat band */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass p-5">
            <div className="flex items-center justify-between">
              <span className="h-9 w-9 rounded-2xl" style={{ background: s.tone }} />
              <span className="font-display text-4xl font-bold tracking-tight tabular-nums">{s.value}</span>
            </div>
            <div className="mt-3 text-sm text-fg-dim">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* Recent projects */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Recent projects</h2>
            <Link href="/projects" className="text-sm text-fg-dim transition hover:text-fg">View all →</Link>
          </div>
          {projects.length === 0 ? (
            <EmptyState title="No projects yet" desc="Create your first project and let FORME design it." action={<Link href="/projects" className="btn-primary">New project</Link>} />
          ) : (
            <div className="space-y-2.5">
              {projects.map((p) => {
                const site = p.generatedSites[0];
                const score = site?.versions[0]?.overallScore ?? null;
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} className="group flex items-center gap-4 rounded-2xl border bg-surface/60 p-4 transition hover:-translate-y-0.5 hover:border-accent/40">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 font-display text-lg font-bold">{p.name.slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{p.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 capitalize">{p.status}</span>
                        <span>{p._count.references} refs</span>
                        <span>· {timeAgo(p.updatedAt)}</span>
                      </div>
                    </div>
                    {typeof score === "number" ? <ScoreRing score={score} size={46} /> : <span className="text-xs text-muted">not built</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: quality + references */}
        <div className="space-y-6">
          <div className="glass p-6">
            <h2 className="font-display text-lg font-bold">Average quality</h2>
            <p className="mt-1 text-xs text-fg-dim">Across every rendered & critiqued version.</p>
            <div className="mt-4 flex items-center gap-5">
              {avgScore !== null ? <ScoreRing score={avgScore} size={92} label="score" /> : <div className="grid h-[92px] w-[92px] place-items-center rounded-full border text-xs text-muted">—</div>}
              <div className="flex-1 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-fg-dim">Versions scored</span><span className="font-semibold tabular-nums">{scoredVersions.length}</span></div>
                <div className="flex justify-between"><span className="text-fg-dim">Best</span><span className="font-semibold tabular-nums">{scoredVersions.length ? Math.round(Math.max(...scoredVersions.map((v) => v.overallScore ?? 0))) : "—"}</span></div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Latest references</h2>
              <Link href="/references" className="text-sm text-fg-dim transition hover:text-fg">All →</Link>
            </div>
            {recentRefs.length === 0 ? (
              <p className="text-sm text-muted">No references analyzed yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {recentRefs.map((r) => {
                  const thumb = r.kind === "screenshot" ? fileUrl(r.filePath) : fileUrl(r.websiteAnalysis?.fullScreenshot) ?? fileUrl(parseJSON<string[]>(r.websiteAnalysis?.viewportShots, [])[0]);
                  const style = r.dnaProfiles[0] ? DesignDNASchema.parse(parseJSON(r.dnaProfiles[0].profile, {})).style?.primary_style : null;
                  return (
                    <Link key={r.id} href={`/references/${r.id}`} className="group overflow-hidden rounded-2xl border bg-surface-2" title={style || r.title || ""}>
                      <div className="aspect-square overflow-hidden">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt={r.title ?? ""} className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105" />
                        ) : <div className="grid h-full place-items-center text-[10px] text-muted">—</div>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
