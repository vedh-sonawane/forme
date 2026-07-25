import { db } from "@/lib/db";
import { createZip, type ZipFile } from "@/lib/export/zip";
import { parseJSON } from "@/lib/utils";
import { ApplicationBlueprintSchema, DesignSystemSchema, DesignDirectionSchema, RequirementsSchema, AppDesignSpecSchema, type AppDesignSpec } from "@/lib/design/schema";
import { buildApplicationFiles, appIdentity } from "@/lib/appgen";
import { designApplicationUI } from "@/lib/agents";
import { resolveImagePlaceholders } from "@/lib/images/provider";
import { kebabPlural, pascal } from "@/lib/appgen/naming";

// Build a downloadable .zip of a project: the runnable site (index.html) plus its
// Design DNA, direction, design system, and version history + a README. The generated
// site is a single self-contained HTML document, so index.html runs on its own.

const slug = (s: string) => (s || "forme-project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "forme-project";

export async function exportProject(projectId: string): Promise<{ filename: string; zip: Buffer } | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      generatedSites: {
        orderBy: { updatedAt: "desc" },
        include: { versions: { orderBy: { version: "desc" } } },
      },
      directions: {
        orderBy: { version: "desc" },
        take: 1,
        include: { designSystems: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
      dnaProfiles: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return null;

  const site = project.generatedSites[0] ?? null;
  const current = site ? site.versions.find((v) => v.id === site.currentVersionId) ?? site.versions[0] ?? null : null;
  const direction = project.directions[0] ?? null;
  const system = direction?.designSystems[0] ?? null;
  const name = slug(project.name);
  const exportedAt = new Date().toISOString();

  const files: ZipFile[] = [];

  // The runnable site.
  if (current?.html) {
    files.push({ name: "index.html", data: current.html });
  }

  // README.
  files.push({
    name: "README.md",
    data: [
      `# ${project.name}`,
      "",
      project.description ? project.description + "\n" : "",
      "Exported from **FORME** — AI design intelligence & website generation.",
      "",
      "## Run it",
      "`index.html` is a complete, self-contained website — just open it in a browser,",
      "or serve the folder with any static host (e.g. `npx serve .`).",
      "",
      "## What's inside",
      "- `index.html` — the current generated website (current version).",
      "- `forme/project.json` — project name, description, requirements.",
      "- `forme/design-direction.json` — the art-direction blueprint.",
      "- `forme/design-system.json` — design tokens (color, type, spacing, motion).",
      "- `forme/design-dna.json` — extracted Design DNA profiles.",
      "- `forme/versions.json` — version history metadata.",
      "",
      `_Exported ${exportedAt}._`,
      "",
    ].join("\n"),
  });

  files.push({
    name: "forme/project.json",
    data: JSON.stringify(
      {
        name: project.name,
        description: project.description,
        status: project.status,
        requirements: parseJSON(project.requirements, {}),
        exportedAt,
      },
      null,
      2
    ),
  });

  if (direction) files.push({ name: "forme/design-direction.json", data: JSON.stringify(parseJSON(direction.direction, {}), null, 2) });
  if (system) files.push({ name: "forme/design-system.json", data: JSON.stringify(parseJSON(system.tokens, {}), null, 2) });
  files.push({ name: "forme/design-dna.json", data: JSON.stringify(project.dnaProfiles.map((d) => parseJSON(d.profile, {})), null, 2) });

  if (site) {
    files.push({
      name: "forme/versions.json",
      data: JSON.stringify(
        site.versions.map((v) => ({ version: v.version, label: v.label, changeNote: v.changeNote, score: v.overallScore, current: v.id === site.currentVersionId, createdAt: v.createdAt })),
        null,
        2
      ),
    });
  }

  return { filename: `${name}.zip`, zip: createZip(files) };
}

/**
 * Export the project as a COMPLETE, RUNNABLE Next.js application generated from its
 * Application Blueprint (Track B): Prisma schema, real auth, CRUD pages + API routes,
 * design tokens, and the generated marketing site served at "/".
 */
export async function buildProjectApp(
  projectId: string,
  opts?: { dbProvider?: "sqlite" | "postgresql" }
): Promise<{ slug: string; appName: string; files: { path: string; content: string }[] } | { error: string }> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      generatedSites: { orderBy: { updatedAt: "desc" }, include: { versions: { orderBy: { version: "desc" } } } },
      directions: { orderBy: { version: "desc" }, take: 1, include: { designSystems: { orderBy: { createdAt: "desc" }, take: 1 } } },
    },
  });
  if (!project) return { error: "Project not found." };
  if (!project.blueprint) return { error: "Generate an Application Blueprint first (App Blueprint tab), then export the app." };

  const blueprint = ApplicationBlueprintSchema.parse(parseJSON(project.blueprint, {}));
  const systemRow = project.directions[0]?.designSystems[0] ?? null;
  const system = DesignSystemSchema.parse(systemRow ? parseJSON(systemRow.tokens, {}) : {});

  const site = project.generatedSites[0] ?? null;
  const current = site ? site.versions.find((v) => v.id === site.currentVersionId) ?? site.versions[0] ?? null : null;

  const { appName, slug } = appIdentity(project.name);

  // Art-direct the IN-APP pages with the same AI + direction that made the landing page,
  // so the product doesn't feel like a plain admin bolted onto a beautiful marketing site.
  let design: AppDesignSpec | null = null;
  try {
    const dirRow = project.directions[0];
    if (dirRow) {
      const direction = DesignDirectionSchema.parse(parseJSON(dirRow.direction, {}));
      const requirements = RequirementsSchema.parse(parseJSON(project.requirements, {}));
      const routes = [
        "/dashboard — the signed-in overview, with live counts",
        ...(blueprint.entities ?? [])
          .filter((e) => !/^users?$|^account$|^member$/i.test(pascal(e.name)))
          .slice(0, 6)
          .map((e) => `/${kebabPlural(pascal(e.name))} — browse and manage ${e.name} records`),
      ].join("\n");
      const res = await designApplicationUI(requirements, direction, routes);
      design = AppDesignSpecSchema.parse(res.data);
      // Swap <img data-image="…"> placeholders for real licensed photography.
      design.pages = await Promise.all(
        design.pages.map(async (p) => ({ ...p, html: await resolveImagePlaceholders(p.html) }))
      );
    }
  } catch {
    // Art direction is an enhancement — fall back to the rotating defaults.
  }

  const files = buildApplicationFiles({ appName, slug, blueprint, system, marketingHtml: current?.html ?? null, dbProvider: opts?.dbProvider, design });
  return { slug, appName, files };
}

export async function exportApplication(projectId: string): Promise<{ filename: string; zip: Buffer } | { error: string }> {
  const built = await buildProjectApp(projectId);
  if ("error" in built) return built;
  return { filename: `${built.slug}-app.zip`, zip: createZip(built.files.map((f) => ({ name: f.path, data: f.content }))) };
}
