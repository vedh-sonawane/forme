import type { ApplicationBlueprint, DesignSystem, AppDesignSpec } from "@/lib/design/schema";
import type { ProjectFile } from "./types";
import { planModels, renderPrismaSchema } from "./prisma";
import { scaffoldFiles, readmeFile } from "./scaffold";
import { authFiles } from "./auth";
import { crudFiles, appLayoutFile, dashboardFile, resolveArt, type PageArt } from "./pages";
import { appUiCss, MOTION_COMPONENT, DEFAULT_TREATMENTS } from "./ui";
import { PARTICLES_COMPONENT } from "./effects";
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
  /** Hosted deployments need Postgres — serverless filesystems can't persist SQLite. */
  dbProvider?: "sqlite" | "postgresql";
  /** AI art direction for the IN-APP pages (each page gets its own visual identity). */
  design?: AppDesignSpec | null;
}): ProjectFile[] {
  const { appName, slug, blueprint: bp, system, dbProvider = "sqlite", design = null } = input;
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

  // ── Visual layer: tokens + effects + AI page CSS + motion runtime + app shell ──
  // Page-scoped CSS from the AI is appended after the design system so every page keeps
  // the shared palette/type/spacing while adding its own bespoke scene styling.
  const pageCss = (design?.pages ?? [])
    .map((p) => (p.css || "").trim())
    .filter(Boolean)
    .map((css, i) => `/* ── page composition ${i + 1} ── */\n${css}`)
    .join("\n\n");
  files.push({ path: "src/app/globals.css", content: appUiCss(system, [design?.custom_css ?? "", pageCss].filter(Boolean).join("\n\n")) });
  files.push({ path: "src/components/Motion.tsx", content: MOTION_COMPONENT });
  // Canvas particle field, emitted whenever a composition asks for it.
  if ((design?.pages ?? []).some((p) => /fx-particles/.test(p.html || ""))) {
    files.push({ path: "src/components/Particles.tsx", content: PARTICLES_COMPONENT });
  }
  files.push({
    path: "src/app/layout.tsx",
    content: `import type { Metadata } from "next";
import Link from "next/link";
import { Motion } from "@/components/Motion";
import "./globals.css";

export const metadata: Metadata = {
  title: ${JSON.stringify(appName)},
  description: ${JSON.stringify((bp.summary || appName).slice(0, 200))},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="progress" />
        <header className="glass" style={{ position: "sticky", top: 0, zIndex: 60, borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
          <div className="wrap row" style={{ height: 68, justifyContent: "space-between" }}>
            <Link href="/" style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-.02em" }}>${appName}</Link>
            <nav className="row" style={{ gap: "1.4rem" }}>
${navLinks.map((l) => `              <Link href=${JSON.stringify(l.href)} className="muted" style={{ fontSize: ".88rem", fontWeight: 500 }}>${l.label}</Link>`).join("\n")}
            </nav>
          </div>
        </header>
        <main style={{ minHeight: "70vh" }}>{children}</main>
        <footer style={{ borderTop: "1px solid var(--border)", marginTop: "4rem" }}>
          <div className="wrap row" style={{ justifyContent: "space-between", paddingBlock: "2.2rem" }}>
            <span className="muted" style={{ fontSize: ".85rem" }}>© {new Date().getFullYear()} ${appName}</span>
            <span className="muted" style={{ fontSize: ".85rem" }}>Built with FORME</span>
          </div>
        </footer>
        <Motion />
      </body>
    </html>
  );
}
`,
  });
  files.push({ path: "prisma/schema.prisma", content: renderPrismaSchema(bp, models, authRequired, dbProvider) });

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

  // Per-page art direction: the AI's spec when present, otherwise a rotating default
  // so consecutive pages never share a hero/decor/layout.
  const byRoute = new Map((design?.pages ?? []).map((p) => [(p.route || "").toLowerCase().replace(/\/$/, ""), p]));
  const artFor = (route: string, i: number, defaults: { eyebrow: string; headline: string; subcopy: string }): PageArt =>
    resolveArt(byRoute.get(route.toLowerCase()) as unknown as Record<string, string> | undefined, DEFAULT_TREATMENTS[i % DEFAULT_TREATMENTS.length], defaults);

  files.push(
    dashboardFile(models, authRequired, appName, artFor("/dashboard", 0, { eyebrow: "Overview", headline: `Your ${appName} workspace`, subcopy: "Everything you've created, live from the database." }))
  );

  dataModels.forEach((m, i) => {
    const route = `/${kebabPlural(m.name)}`;
    const label = m.plural.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
    files.push(
      ...crudFiles(
        m,
        authRequired,
        artFor(route, i + 1, { eyebrow: label, headline: label.charAt(0).toUpperCase() + label.slice(1), subcopy: `Create, browse and manage ${m.name.toLowerCase()} records — stored in your database.` })
      )
    );
  });

  return files;
}

/** Friendly app name + url-safe slug from the project name. */
export function appIdentity(projectName: string): { appName: string; slug: string } {
  const appName = (projectName || "App").trim().slice(0, 40) || "App";
  const slug = appName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "generated-app";
  return { appName, slug };
}

export { pascal };
