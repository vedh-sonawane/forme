import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import { ProjectWorkspace } from "@/components/workspace/ProjectWorkspace";
import { serializeProject } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await currentUserId();
  const project = await db.project.findFirst({
    where: { id, userId },
    include: {
      references: { include: { reference: { include: { websiteAnalysis: true, dnaProfiles: { take: 1, orderBy: { createdAt: "desc" } } } } } },
      dnaProfiles: { orderBy: { createdAt: "desc" } },
      directions: { orderBy: { version: "desc" }, include: { designSystems: { orderBy: { createdAt: "desc" }, take: 1 } } },
      generatedSites: {
        orderBy: { updatedAt: "desc" },
        include: { versions: { orderBy: { version: "desc" }, include: { critiques: { orderBy: { createdAt: "desc" }, take: 1 } } } },
      },
    },
  });
  if (!project) notFound();

  return <ProjectWorkspace initial={serializeProject(project)} />;
}
