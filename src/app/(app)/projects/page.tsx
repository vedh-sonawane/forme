import Link from "next/link";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { Badge, EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "default" | "accent" | "ok" | "warn"> = {
  draft: "default",
  researching: "warn",
  directed: "accent",
  generating: "warn",
  critiquing: "warn",
  ready: "ok",
};

export default async function ProjectsPage() {
  const userId = await currentUserId();
  const projects = await db.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { references: true, dnaProfiles: true, generatedSites: true } } },
  });

  return (
    <div className="animate-in">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Projects</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-fg-dim">Design intelligence workspaces — analyze references, generate, critique, and improve.</p>
        </div>
        <CreateProjectDialog />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          desc="Create your first project to start analyzing references and generating intentionally-designed websites."
          action={<CreateProjectDialog />}
          icon={
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p: any) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="card-link group flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold leading-tight transition-colors group-hover:text-[color:var(--accent)]">{p.name}</h3>
                <Badge tone={statusTone[p.status] ?? "default"}>{p.status}</Badge>
              </div>
              <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm text-fg-dim">{p.description || "No description"}</p>
              <div className="mt-4 flex items-center gap-2.5 text-xs text-muted">
                <span className="tabular-nums">{p._count.references} refs</span>
                <span className="h-1 w-1 rounded-full bg-[color:var(--border)]" />
                <span className="tabular-nums">{p._count.dnaProfiles} DNA</span>
                <span className="h-1 w-1 rounded-full bg-[color:var(--border)]" />
                <span className="tabular-nums">{p._count.generatedSites} builds</span>
                <span className="ml-auto shrink-0">{timeAgo(p.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
