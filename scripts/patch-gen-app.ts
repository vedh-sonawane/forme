/**
 * Apply the generator's CURRENT output for the three files a regeneration would change
 * (Motion runtime, root layout, marketing HTML) onto an already-generated app, so a fix
 * can be verified against real generated content without re-running the AI.
 *
 * Usage: npx tsx scripts/patch-gen-app.ts <path-to-generated-app>
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { MOTION_COMPONENT } from "../src/lib/appgen/ui";
import { retargetMarketingLinks } from "../src/lib/appgen/links";

const app = process.argv[2];
if (!app) throw new Error("pass the generated app directory");

// 1. Motion runtime
writeFileSync(join(app, "src/components/Motion.tsx"), MOTION_COMPONENT);

// 2. Marketing HTML — re-target dead CTAs at real routes.
const marketingPath = join(app, "src/lib/marketing.ts");
const src = readFileSync(marketingPath, "utf8");
const m = src.match(/export const MARKETING_HTML = ("(?:[^"\\]|\\.)*");/);
if (!m) throw new Error("could not read MARKETING_HTML");
const html: string = JSON.parse(m[1]);

// Routes are recoverable from the app's own route folders.
const appDir = join(app, "src/app/(app)");
const routes = readdirSync(appDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => ({ href: `/${d.name}`, label: d.name }));

const authRequired = existsSync(join(app, "src/app/login/page.tsx"));
const linked = retargetMarketingLinks(html, routes, authRequired ? "/login" : "/dashboard");
writeFileSync(marketingPath, src.replace(m[1], JSON.stringify(linked)));

// 3. Root layout — async session read, "Sign in" hidden when signed in.
const layoutPath = join(app, "src/app/layout.tsx");
let layout = readFileSync(layoutPath, "utf8");
if (authRequired && !layout.includes("getSessionUser")) {
  layout = layout
    .replace(`import Link from "next/link";`, `import Link from "next/link";\nimport { getSessionUser } from "@/lib/auth/session";`)
    .replace(
      `export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (`,
      `export default async function RootLayout({ children }: { children: React.ReactNode }) {\n  const user = await getSessionUser().catch(() => null);\n  return (`
    )
    .replace(/\n\s*<Link href="\/login"[^\n]*>Sign in<\/Link>/, `\n              {!user && <Link href="/login" className="muted" style={{ fontSize: ".88rem", fontWeight: 500 }}>Sign in</Link>}`);
  writeFileSync(layoutPath, layout);
}

const changed = readFileSync(layoutPath, "utf8").includes("getSessionUser");
console.log(JSON.stringify({ motion: true, marketingRetargeted: linked !== html, layoutSessionAware: changed, routes: routes.map((r) => r.href) }));
