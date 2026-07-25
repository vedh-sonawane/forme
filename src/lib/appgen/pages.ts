import type { ProjectFile } from "./types";
import type { ModelPlan } from "./prisma";
import { camel, kebabPlural } from "./naming";
import { decorMarkup, revealClass, type PageTreatment } from "./ui";

// Art direction for a page, resolved from the AI's App Design Spec (with a safe default).
export type PageArt = PageTreatment & { eyebrow: string; headline: string; subcopy: string; visualIdea: string; html?: string; css?: string };

const DATA_MARKER = "<!--DATA-->";

/** Strip anything unsafe/unrenderable from AI-authored markup before embedding it. */
export function sanitizeMarkup(html: string): string {
  return (html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "") // inline handlers
    .replace(/javascript:/gi, "")
    .replace(/className=/g, "class=")
    .trim();
}

/**
 * The AI composes the page; the interactive data component is injected at <!--DATA-->.
 * Returns null when the markup is unusable so the caller falls back to a built-in
 * treatment — creative freedom, but never a broken page.
 */
export function composedPage(art: PageArt, dataJsx: string): string | null {
  const html = sanitizeMarkup(art.html ?? "");
  if (html.length < 120 || !html.includes(DATA_MARKER)) return null;
  const [before, after = ""] = html.split(DATA_MARKER);
  const block = (s: string) => (s.trim() ? `<div dangerouslySetInnerHTML={{ __html: ${JSON.stringify(s)} }} />` : "");
  return `<>
      ${block(before)}
      ${dataJsx}
      ${block(after)}
    </>`;
}

const HERO_OK = ["colossal", "editorial", "split", "centered", "minimal"];
const DECOR_OK = ["orbs", "mesh", "grid", "rays", "aurora", "none"];
const MOTION_OK = ["stagger", "mask", "rise", "blur", "slide"];
const LAYOUT_OK = ["cards", "magazine", "rows", "mosaic"];
const pick = <T extends string>(v: string, ok: string[], fallback: T): T => (ok.includes((v || "").toLowerCase()) ? ((v || "").toLowerCase() as T) : fallback);

export function resolveArt(raw: Partial<Record<string, string>> | undefined, fallback: PageTreatment, defaults: { eyebrow: string; headline: string; subcopy: string }): PageArt {
  return {
    hero: pick(raw?.hero ?? "", HERO_OK, fallback.hero),
    decor: pick(raw?.decor ?? "", DECOR_OK, fallback.decor),
    motion: pick(raw?.motion ?? "", MOTION_OK, fallback.motion),
    layout: pick(raw?.layout ?? "", LAYOUT_OK, fallback.layout),
    eyebrow: raw?.eyebrow?.trim() || defaults.eyebrow,
    headline: raw?.headline?.trim() || defaults.headline,
    subcopy: raw?.subcopy?.trim() || defaults.subcopy,
    visualIdea: raw?.visual_idea?.trim() || "",
    html: raw?.html ?? "",
    css: raw?.css ?? "",
  };
}

const esc = (s: string) => JSON.stringify(String(s ?? ""));

/** A varied, art-directed page header. */
function heroMarkup(art: PageArt, extra = ""): string {
  const rv = revealClass(art.motion);
  const decor = decorMarkup(art.decor);
  const eyebrow = `<span className="kicker ${rv}">{${esc(art.eyebrow)}}</span>`;
  const sub = `<p className="t-lead ${rv}" style={{ marginTop: "1rem" }}>{${esc(art.subcopy)}}</p>`;

  if (art.hero === "split") {
    return `<section className="scene pagehead">
      ${decor}
      <div className="wrap pagehead--split">
        <div>${eyebrow}<h1 className="t-display balance ${rv}" style={{ marginTop: "1.1rem" }}>{${esc(art.headline)}}</h1>${sub}</div>
        <div className="${rv} rv-scale" data-tilt>
          <div className="glass" style={{ padding: "1.6rem", display: "grid", gap: ".7rem" }}>
            <div style={{ height: 10, width: "55%", borderRadius: 99, background: "color-mix(in srgb, var(--primary) 55%, transparent)" }} />
            <div style={{ height: 8, width: "85%", borderRadius: 99, background: "color-mix(in srgb, var(--text) 12%, transparent)" }} />
            <div style={{ height: 8, width: "70%", borderRadius: 99, background: "color-mix(in srgb, var(--text) 12%, transparent)" }} />
            <div style={{ height: 120, borderRadius: "var(--r-md)", background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 40%, transparent), color-mix(in srgb, var(--accent) 34%, transparent))" }} />
          </div>
        </div>
      </div>
      ${extra}
    </section>`;
  }
  if (art.hero === "colossal") {
    return `<section className="scene pagehead">
      ${decor}
      <div className="wrap">${eyebrow}
        <h1 className="t-colossal balance ${rv}" style={{ marginTop: "1.2rem", maxWidth: "16ch" }}>{${esc(art.headline)}}</h1>${sub}
      </div>
      ${extra}
    </section>`;
  }
  if (art.hero === "centered") {
    return `<section className="scene pagehead" style={{ textAlign: "center" }}>
      ${decor}
      <div className="wrap-narrow">${eyebrow}
        <h1 className="t-display balance ${rv}" style={{ marginTop: "1.1rem" }}>{${esc(art.headline)}}</h1>
        <p className="t-lead ${rv}" style={{ marginTop: "1rem", marginInline: "auto" }}>{${esc(art.subcopy)}}</p>
      </div>
      ${extra}
    </section>`;
  }
  if (art.hero === "minimal") {
    return `<section className="scene pagehead pagehead--minimal">
      ${decor}
      <div className="wrap row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>${eyebrow}<h1 className="t-title ${rv}" style={{ marginTop: ".6rem" }}>{${esc(art.headline)}}</h1></div>
        <p className="muted ${rv}" style={{ fontSize: ".9rem", maxWidth: "38ch" }}>{${esc(art.subcopy)}}</p>
      </div>
      ${extra}
    </section>`;
  }
  // editorial
  return `<section className="scene pagehead">
    ${decor}
    <div className="wrap">
      <div style={{ maxWidth: "46rem" }}>${eyebrow}
        <h1 className="t-display balance ${rv}" style={{ marginTop: "1.1rem" }}>{${esc(art.headline)}}</h1>${sub}
      </div>
      <hr className="hairline ${rv}" style={{ marginTop: "2.4rem" }} />
    </div>
    ${extra}
  </section>`;
}

// Page + API generators. Everything is emitted with LITERAL field names (resolved at
// generation time) so the generated project type-checks under `strict` — no dynamic
// indexing, no `any`.

type F = ModelPlan["simple"][number];

const tsType = (f: F) => (f.type === "Boolean" ? "boolean" : f.type === "Int" || f.type === "Float" ? "number | null" : f.type === "DateTime" ? "string | null" : "string");
const initialValue = (f: F) => (f.type === "Boolean" ? "false" : '""');
const inputType = (f: F) => (f.type === "Int" || f.type === "Float" ? "number" : f.type === "DateTime" ? "date" : "text");
const labelOf = (f: F) => f.name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

/** `r.title ?? ""` style row → plain serializable object (client components need this). */
function rowMapper(fields: F[]): string {
  const parts = ["id: r.id"];
  for (const f of fields) {
    if (f.type === "Boolean") parts.push(`${f.name}: r.${f.name} ?? false`);
    else if (f.type === "DateTime") parts.push(`${f.name}: r.${f.name} ? r.${f.name}.toISOString() : null`);
    else if (f.type === "Int" || f.type === "Float") parts.push(`${f.name}: r.${f.name} ?? null`);
    else parts.push(`${f.name}: r.${f.name} ?? ""`);
  }
  return `{ ${parts.join(", ")} }`;
}

function coercion(f: F): string {
  const src = `body?.${f.name}`;
  if (f.type === "Boolean") return `    const ${f.name} = Boolean(${src});`;
  if (f.type === "Int") return `    const ${f.name}Raw = Number(${src});\n    const ${f.name} = ${src} !== "" && ${src} != null && Number.isFinite(${f.name}Raw) ? Math.trunc(${f.name}Raw) : null;`;
  if (f.type === "Float") return `    const ${f.name}Raw = Number(${src});\n    const ${f.name} = ${src} !== "" && ${src} != null && Number.isFinite(${f.name}Raw) ? ${f.name}Raw : null;`;
  if (f.type === "DateTime") return `    const ${f.name}Date = ${src} ? new Date(String(${src})) : null;\n    const ${f.name} = ${f.name}Date && !Number.isNaN(${f.name}Date.getTime()) ? ${f.name}Date : null;`;
  return `    const ${f.name} = typeof ${src} === "string" && ${src}.trim() ? ${src}.trim() : null;`;
}

export function crudFiles(m: ModelPlan, authRequired: boolean, art: PageArt): ProjectFile[] {
  const delegate = camel(m.name);
  const route = kebabPlural(m.name);
  const comp = `${m.name}Manager`;
  const fields = m.simple;
  const first = fields[0];
  const propType = fields.map((f) => `  ${f.name}: ${tsType(f)};`).join("\n");
  const scope = authRequired ? "where: { ownerId: user.id }, " : "";

  const listPage = `${authRequired ? 'import { redirect } from "next/navigation";\nimport { getSessionUser } from "@/lib/auth/session";\n' : ""}import { db } from "@/lib/db";
import { ${comp} } from "@/components/${comp}";

export const dynamic = "force-dynamic";

export default async function ${m.name}Page() {
${authRequired ? '  const user = await getSessionUser();\n  if (!user) redirect("/login");\n' : ""}  const rows = await db.${delegate}.findMany({ ${scope}orderBy: { createdAt: "desc" }, take: 100 });
  const initial = rows.map((r) => (${rowMapper(fields)}));

  return (
    ${composedPage(art, `<section className="wrap" style={{ paddingBlock: "clamp(2rem,5vw,3.5rem)" }}><${comp} initial={initial} /></section>`) ??
      `<>
      ${heroMarkup(art)}
      <section className="wrap" style={{ paddingBottom: "clamp(3rem,8vw,6rem)" }}>
        <${comp} initial={initial} />
      </section>
    </>`}
  );
}
`;

  const collectionClass = art.layout === "rows" ? "stack" : art.layout === "mosaic" ? "mosaic" : art.layout === "magazine" ? "magazine" : "grid g3";
  const itemClass = art.layout === "rows" ? "rowitem" : "card";

  const manager = `"use client";

import { useState } from "react";

export type ${m.name}Row = {
  id: string;
${propType}
};

export function ${comp}({ initial }: { initial: ${m.name}Row[] }) {
  const [rows, setRows] = useState<${m.name}Row[]>(initial);
  const [form, setForm] = useState({ ${fields.map((f) => `${f.name}: ${initialValue(f)}`).join(", ")} });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/${route}", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; data?: ${m.name}Row; error?: string } | null;
      if (!res.ok || !body?.ok || !body.data) throw new Error(body?.error || "Could not save");
      setRows((prev) => [body.data as ${m.name}Row, ...prev]);
      setForm({ ${fields.map((f) => `${f.name}: ${initialValue(f)}`).join(", ")} });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const previous = rows;
    setRows((prev) => prev.filter((r) => r.id !== id));
    const res = await fetch(\`/api/${route}/\${id}\`, { method: "DELETE" });
    if (!res.ok) setRows(previous);
  }


  return (
    <div className="stack" style={{ gap: "clamp(1.6rem,4vw,2.8rem)" }}>
      <form onSubmit={create} className="glass rv" style={{ padding: "clamp(1.3rem,3vw,2rem)" }} data-tilt>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 className="t-title">New ${m.name.toLowerCase()}</h2>
          <span className="tag">{rows.length} saved</span>
        </div>
        <div className="grid g2" style={{ marginTop: "1.4rem" }}>
${fields
  .map((f) =>
    f.type === "Boolean"
      ? `          <label className="row" style={{ gap: ".6rem", cursor: "pointer" }}>
            <input type="checkbox" checked={form.${f.name}} onChange={(e) => setForm({ ...form, ${f.name}: e.target.checked })} />
            <span>${labelOf(f)}</span>
          </label>`
      : `          <div>
            <label className="label" htmlFor="${f.name}">${labelOf(f)}</label>
            <input id="${f.name}" type="${inputType(f)}" className="input" value={form.${f.name}} onChange={(e) => setForm({ ...form, ${f.name}: e.target.value })} />
          </div>`
  )
  .join("\n")}
        </div>
        {error && <p style={{ marginTop: ".9rem", color: "#e5484d", fontSize: ".9rem" }}>{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ marginTop: "1.4rem" }} disabled={busy}>
          {busy ? "Saving…" : "Add ${m.name.toLowerCase()}"}
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="empty rv">
          <div className="empty-art" />
          <h3 className="t-title" style={{ marginTop: ".6rem" }}>Nothing here yet</h3>
          <p className="muted" style={{ maxWidth: "34ch" }}>Add your first ${m.name.toLowerCase()} above and it appears here instantly.</p>
        </div>
      ) : (
        <div className="${collectionClass} stagger">
          {rows.map((r) => (
            <article key={r.id} className="${itemClass}">
              <div style={{ minWidth: 0 }}>
                <h3 className="t-title" style={{ fontSize: "1.15rem" }}>{${first.type === "Boolean" ? `r.${first.name} ? "Yes" : "No"` : `String(r.${first.name} ?? "")`} || "Untitled"}</h3>
                <div style={{ marginTop: ".55rem", display: "grid", gap: ".25rem" }}>
${fields
  .slice(1)
  .map((f) => `                  <div className="muted" style={{ fontSize: ".82rem" }}><span style={{ opacity: .7 }}>${labelOf(f)}:</span> {${f.type === "Boolean" ? `r.${f.name} ? "Yes" : "No"` : `String(r.${f.name} ?? "—")`}}</div>`)
  .join("\n")}
                </div>
              </div>
              <button className="btn btn-ghost" style={{ marginTop: "${art.layout === "rows" ? "0" : "1.2rem"}", flexShrink: 0 }} onClick={() => remove(r.id)}>Delete</button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
`;

  const collectionApi = `import { NextResponse } from "next/server";
import { db } from "@/lib/db";
${authRequired ? 'import { getSessionUser } from "@/lib/auth/session";\n' : ""}
export const runtime = "nodejs";

export async function GET() {
${authRequired ? '  const user = await getSessionUser();\n  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });\n' : ""}  const rows = await db.${delegate}.findMany({ ${scope}orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ ok: true, data: rows.map((r) => (${rowMapper(fields)})) });
}

export async function POST(req: Request) {
  try {
${authRequired ? '    const user = await getSessionUser();\n    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });\n' : ""}    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
${fields.map(coercion).join("\n")}
${first.type === "Boolean" ? "" : `    if (${first.name} == null) return NextResponse.json({ ok: false, error: "${labelOf(first)} is required." }, { status: 400 });\n`}    const created = await db.${delegate}.create({
      data: { ${fields.map((f) => f.name).join(", ")}${authRequired ? ", ownerId: user.id" : ""} },
    });
    const r = created;
    return NextResponse.json({ ok: true, data: ${rowMapper(fields)} }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not create the record." }, { status: 500 });
  }
}
`;

  const itemApi = `import { NextResponse } from "next/server";
import { db } from "@/lib/db";
${authRequired ? 'import { getSessionUser } from "@/lib/auth/session";\n' : ""}
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
${authRequired ? '  const user = await getSessionUser();\n  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });\n  const existing = await db.' + delegate + '.findFirst({ where: { id, ownerId: user.id } });\n  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });\n' : ""}  await db.${delegate}.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
`;

  return [
    { path: `src/app/(app)/${route}/page.tsx`, content: listPage },
    { path: `src/components/${comp}.tsx`, content: manager },
    { path: `src/app/api/${route}/route.ts`, content: collectionApi },
    { path: `src/app/api/${route}/[id]/route.ts`, content: itemApi },
  ];
}

export function appLayoutFile(authRequired: boolean, appName: string): ProjectFile {
  if (!authRequired) {
    return {
      path: "src/app/(app)/layout.tsx",
      content: `export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
`,
    };
  }
  return {
    path: "src/app/(app)/layout.tsx",
    content: `import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <>
      <div className="wrap" style={{ paddingTop: "1.2rem" }}>
        <div className="glass rv" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: ".85rem 1.2rem" }}>
          <span className="muted" style={{ fontSize: ".86rem" }}>
            Signed in to ${appName} as <strong style={{ color: "var(--text)" }}>{user.email}</strong>
          </span>
          <SignOutButton />
        </div>
      </div>
      {children}
    </>
  );
}
`,
  };
}

export function dashboardFile(models: ModelPlan[], authRequired: boolean, appName: string, art: PageArt): ProjectFile {
  const data = models.filter((m) => !m.isUser);
  const scope = authRequired ? "{ where: { ownerId: user.id } }" : "";
  const counts = data.map((m) => `    db.${camel(m.name)}.count(${scope})`).join(",\n");
  return {
    path: "src/app/(app)/dashboard/page.tsx",
    content: `${authRequired ? 'import { redirect } from "next/navigation";\nimport { getSessionUser } from "@/lib/auth/session";\n' : ""}import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
${authRequired ? '  const user = await getSessionUser();\n  if (!user) redirect("/login");\n' : ""}${
      data.length
        ? `  const [${data.map((m) => camel(m.name) + "Count").join(", ")}] = await Promise.all([
${counts},
  ]);
`
        : ""
    }
  return (
    ${composedPage(art, `<section className="wrap" style={{ paddingBlock: "clamp(2rem,5vw,3.5rem)" }}>${dashboardCards(data)}</section>`) ?? `<>
      ${heroMarkup(art)}
      <section className="wrap" style={{ paddingBottom: "clamp(3rem,8vw,6rem)" }}>
        <div className="grid g3 stagger">
${data
  .map(
    (m) => `          <Link href="/${kebabPlural(m.name)}" className="card" data-tilt style={{ display: "block" }}>
            <div className="stat-num" data-countup={${camel(m.name)}Count}>{${camel(m.name)}Count}</div>
            <div className="row" style={{ justifyContent: "space-between", marginTop: ".9rem" }}>
              <span style={{ fontWeight: 600 }}>${m.plural}</span>
              <span className="muted" style={{ fontSize: ".8rem" }}>View →</span>
            </div>
          </Link>`
  )
  .join("\n")}
        </div>
      </section>
    </>`}
  );
}
`,
  };
}

/** The dashboard's live metric cards (shared by the composed + fallback layouts). */
function dashboardCards(data: ModelPlan[]): string {
  return `<div className="grid g3 stagger">
${data
  .map(
    (m) => `          <Link href="/${kebabPlural(m.name)}" className="card" data-tilt style={{ display: "block" }}>
            <div className="stat-num" data-countup={${camel(m.name)}Count}>{${camel(m.name)}Count}</div>
            <div className="row" style={{ justifyContent: "space-between", marginTop: ".9rem" }}>
              <span style={{ fontWeight: 600 }}>${m.plural}</span>
              <span className="muted" style={{ fontSize: ".8rem" }}>View →</span>
            </div>
          </Link>`
  )
  .join("\n")}
        </div>`;
}
