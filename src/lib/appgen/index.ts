import type { ApplicationBlueprint, DesignSystem } from "@/lib/design/schema";
import type { ProjectFile } from "./types";
import { planModels, renderPrismaSchema } from "./prisma";
import { scaffoldFiles, readmeFile } from "./scaffold";
import { authFiles } from "./auth";
import { crudFiles, appLayoutFile, dashboardFile } from "./pages";
import { camel, kebabPlural, pascal } from "./naming";

export type { ProjectFile } from "./types";

const MAX_MODELS = 6;

// A floating "Open app" link injected into the marketing page so the generated site
// connects to the generated application.
const OPEN_APP_LINK = (href: string) =>
  `<a href="${href}" style="position:fixed;right:18px;bottom:18px;z-index:99999;padding:.75rem 1.15rem;border-radius:999px;background:#111;color:#fff;font:600 14px/1 system-ui,sans-serif;text-decoration:none;box-shadow:0 12px 34px rgba(0,0,0,.28)">Open app →</a>`;

function injectOpenApp(html: string, href: string): string {
  const link = OPEN_APP_LINK(href);
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${link}</body>`);
  return html + link;
}

/**
 * Blueprint (+ the generated marketing site) → a complete, runnable Next.js project.
 * Deterministic by design: the scaffold is templated from structured data, so the
 * output always compiles — the LLM's role was planning, not emitting the file tree.
 */
export function buildApplicationFiles(input: {
  appName: string;
  slug: string;
  blueprint: ApplicationBlueprint;
  system: DesignSystem;
  marketingHtml?: string | null;
}): ProjectFile[] {
  const { appName, slug, blueprint: bp, system } = input;
  const authRequired = bp.auth?.required === true;

  const allModels = planModels(bp, authRequired);
  const models = allModels.slice(0, MAX_MODELS + (authRequired ? 1 : 0));
  const dataModels = models.filter((m) => !m.isUser);
  const userModel = models.find((m) => m.isUser) ?? null;

  const files: ProjectFile[] = [];

  const entityRoutes = dataModels.map((m) => ({ label: m.plural, href: `/${kebabPlural(m.name)}` }));
  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    ...entityRoutes.map((e) => ({ href: e.href, label: e.label.replace(/([a-z0-9])([A-Z])/g, "$1 $2") })),
    ...(authRequired ? [{ href: "/login", label: "Sign in" }] : []),
  ];

  files.push(...scaffoldFiles({ appName, slug, bp, system, authRequired, navLinks }));
  files.push(readmeFile({ appName, bp, authRequired, entityRoutes }));
  files.push({ path: "prisma/schema.prisma", content: renderPrismaSchema(bp, models, authRequired) });

  // Marketing site: served verbatim at "/" by a route handler so the generated design
  // is pixel-identical and its global CSS can't leak into the application pages.
  const html = (input.marketingHtml || "").trim();
  if (html) {
    files.push({
      path: "src/lib/marketing.ts",
      content: `// The website FORME generated for this project, served verbatim at "/".\nexport const MARKETING_HTML = ${JSON.stringify(injectOpenApp(html, authRequired ? "/login" : "/dashboard"))};\n`,
    });
    files.push({
      path: "src/app/route.ts",
      content: `import { MARKETING_HTML } from "@/lib/marketing";

export const runtime = "nodejs";
export const dynamic = "force-static";

// GET / → the generated marketing site.
export async function GET() {
  return new Response(MARKETING_HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
`,
    });
  } else {
    files.push({
      path: "src/app/page.tsx",
      content: `import Link from "next/link";

export default function HomePage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight">${appName}</h1>
      <p className="mx-auto mt-3 max-w-xl text-muted">${(bp.summary || "").replace(/[<>{}]/g, "").slice(0, 200)}</p>
      <Link href="${authRequired ? "/login" : "/dashboard"}" className="btn-primary mt-8">Open the app</Link>
    </div>
  );
}
`,
    });
  }

  if (authRequired && userModel) {
    files.push(...authFiles(camel(userModel.name), userModel.name));
  }

  files.push(appLayoutFile(authRequired, appName));
  files.push(dashboardFile(models, authRequired, appName));
  for (const m of dataModels) files.push(...crudFiles(m, authRequired));

  return files;
}

/** Friendly app name + url-safe slug from the project name. */
export function appIdentity(projectName: string): { appName: string; slug: string } {
  const appName = (projectName || "App").trim().slice(0, 40) || "App";
  const slug = appName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "generated-app";
  return { appName, slug };
}

export { pascal };
