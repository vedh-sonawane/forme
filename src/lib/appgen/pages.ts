import type { ProjectFile } from "./types";
import type { ModelPlan } from "./prisma";
import { camel, kebabPlural } from "./naming";
import { decorMarkup, revealClass, type PageTreatment } from "./ui";
import { extractBindings, bindingQueries, bindingMap, normalizeBindings, scrubFabricatedStats } from "./bindings";

/** Runtime substitution of data bindings inside AI-composed markup. */
export const BIND_HELPER = `// Substitute {{count:Thing}}-style bindings with values queried from the database.
// Anything unresolved becomes an em dash: a new account has no data, and saying so is
// better than showing a number nobody earned.
export function bindValues(html: string, values: Record<string, string | number | null>): string {
  return html.replace(/\\{\\{[^{}]+\\}\\}/g, (token) => {
    const v = values[token];
    return v === null || v === undefined || v === "" ? "—" : String(v);
  });
}
`;

/** Prepare AI markup for binding: canonicalise tokens, strip invented statistics. */
export function prepareComposition(html: string, models: ModelPlan[]): { html: string; bindings: ReturnType<typeof extractBindings> } {
  const bindings = extractBindings(html, models);
  return { html: scrubFabricatedStats(normalizeBindings(html, bindings)), bindings };
}

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
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr", "path", "circle", "rect", "line", "polygon", "polyline", "stop", "use", "ellipse"]);

/**
 * True when every element opened in `html` is also closed. Splitting at an unbalanced
 * point would leave a dangling open tag, which the browser silently auto-closes —
 * producing an empty container and pushing the real content out of place.
 */
export function isBalanced(html: string): boolean {
  const stack: string[] = [];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g)) {
    const [, closing, rawTag, selfClose] = m;
    const tag = rawTag.toLowerCase();
    if (VOID_TAGS.has(tag) || selfClose === "/") continue;
    if (closing) {
      const i = stack.lastIndexOf(tag);
      if (i === -1) return false;
      stack.length = i;
    } else {
      stack.push(tag);
    }
  }
  return stack.length === 0;
}

/**
 * The AI composes the page; the interactive data component is injected at <!--DATA-->.
 * The marker is only honoured when the markup before it is balanced — otherwise the
 * data section is appended after the composition, which is always structurally safe.
 * Returns null when the markup is unusable so the caller falls back to a built-in
 * treatment: creative freedom, but never a broken page.
 */
export function composedPage(art: PageArt, dataJsx: string): string | null {
  const html = sanitizeMarkup(art.html ?? "");
  if (html.length < 120) return null;
  // Values are substituted at request time from real queries — see bindValues.
  const block = (s: string) =>
    s.trim() ? `<div data-composed style={{ position: "relative", display: "flow-root" }} dangerouslySetInnerHTML={{ __html: bindValues(${JSON.stringify(s)}, __data) }} />` : "";

  if (html.includes(DATA_MARKER)) {
    const idx = html.indexOf(DATA_MARKER);
    const before = html.slice(0, idx);
    const after = html.slice(idx + DATA_MARKER.length);
    if (isBalanced(before) && isBalanced(after)) {
      return `<>
      ${block(before)}
      ${dataJsx}
      ${block(after)}
    </>`;
    }
    // Marker sat inside an open element — render the whole composition, then the data.
    return `<>
      ${block(html.replace(DATA_MARKER, ""))}
      ${dataJsx}
    </>`;
  }
  return `<>
      ${block(html)}
      ${dataJsx}
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
function rowMapper(fields: F[], rels: ModelPlan["belongsTo"] = []): string {
  const parts = ["id: r.id"];
  for (const f of fields) {
    if (f.type === "Boolean") parts.push(`${f.name}: r.${f.name} ?? false`);
    else if (f.type === "DateTime") parts.push(`${f.name}: r.${f.name} ? r.${f.name}.toISOString() : null`);
    else if (f.type === "Int" || f.type === "Float") parts.push(`${f.name}: r.${f.name} ?? null`);
    else parts.push(`${f.name}: r.${f.name} ?? ""`);
  }
  for (const r of rels) {
    parts.push(`${r.field}: r.${r.field} ?? null`);
    parts.push(`${r.object}Label: r.${r.object}?.${r.label} ? String(r.${r.object}.${r.label}) : null`);
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

export function crudFiles(m: ModelPlan, authRequired: boolean, art: PageArt, models: ModelPlan[] = []): ProjectFile[] {
  const delegate = camel(m.name);
  const route = kebabPlural(m.name);
  const comp = `${m.name}Manager`;
  const fields = m.simple;
  const first = fields[0];
  const rels = m.belongsTo;
  const propType = [
    ...fields.map((f) => `  ${f.name}: ${tsType(f)};`),
    ...rels.map((r) => `  ${r.field}: string | null;\n  ${r.object}Label: string | null;`),
  ].join("\n");
  const scope = authRequired ? "where: { ownerId: user.id }, " : "";

  const { html: composedHtml, bindings } = prepareComposition(art.html ?? "", models);
  const boundArt: PageArt = { ...art, html: composedHtml };
  const dataSection = `<section className="wrap" style={{ paddingBlock: "clamp(2rem,5vw,3.5rem)" }}><${comp} initial={initial}${rels.map((r) => ` ${r.object}Options={${r.object}Options}`).join("")} /></section>`;

  const listPage = `${authRequired ? 'import { redirect } from "next/navigation";\nimport { getSessionUser } from "@/lib/auth/session";\n' : ""}import { db } from "@/lib/db";
import { bindValues } from "@/lib/bind";
import { ${comp} } from "@/components/${comp}";

export const dynamic = "force-dynamic";

export default async function ${m.name}Page() {
${authRequired ? '  const user = await getSessionUser();\n  if (!user) redirect("/login");\n' : ""}  const rows = await db.${delegate}.findMany({ ${scope}orderBy: { createdAt: "desc" }, take: 100${rels.length ? `, include: { ${rels.map((r) => `${r.object}: { select: { ${r.label}: true } }`).join(", ")} }` : ""} });
  const initial = rows.map((r) => (${rowMapper(fields, rels)}));
${rels
  .map(
    (r) => `  const ${r.object}Options = (await db.${camel(r.target)}.findMany({ ${scope}orderBy: { createdAt: "desc" }, take: 200, select: { id: true, ${r.label}: true } })).map((o) => ({ id: o.id, label: String(o.${r.label} ?? "Untitled") }));`
  )
  .join("\n")}
${bindingQueries(bindings, authRequired)}
  const __data = ${bindingMap(bindings)};

  return (
    ${composedPage(boundArt, dataSection) ??
      `<>
      ${heroMarkup(art)}
      <section className="wrap" style={{ paddingBottom: "clamp(3rem,8vw,6rem)" }}>
        <${comp} initial={initial}${rels.map((r) => ` ${r.object}Options={${r.object}Options}`).join("")} />
      </section>
    </>`}
  );
}
`;

  const collectionClass = art.layout === "rows" ? "stack" : art.layout === "mosaic" ? "mosaic" : art.layout === "magazine" ? "magazine" : "grid g3";
  const itemClass = art.layout === "rows" ? "rowitem" : "card";

  const blankForm = `{ ${[...fields.map((f) => `${f.name}: ${initialValue(f)}`), ...rels.map((r) => `${r.field}: ""`)].join(", ")} }`;
  const formField = (f: F) =>
    f.type === "Boolean"
      ? `          <label className="row" style={{ gap: ".6rem", cursor: "pointer" }}>
            <input type="checkbox" checked={form.${f.name}} onChange={(e) => setForm({ ...form, ${f.name}: e.target.checked })} />
            <span>${labelOf(f)}</span>
          </label>`
      : `          <div>
            <label className="label" htmlFor="${f.name}">${labelOf(f)}</label>
            <input id="${f.name}" type="${inputType(f)}" className="input" value={form.${f.name}} onChange={(e) => setForm({ ...form, ${f.name}: e.target.value })} />
          </div>`;

  const relField = (r: ModelPlan["belongsTo"][number]) => `          <div>
            <label className="label" htmlFor="${r.field}">${r.title}</label>
            <select id="${r.field}" className="input" value={form.${r.field}} onChange={(e) => setForm({ ...form, ${r.field}: e.target.value })}>
              <option value="">— none —</option>
              {${r.object}Options.map((o) => (<option key={o.id} value={o.id}>{o.label}</option>))}
            </select>
            {${r.object}Options.length === 0 && (
              <p className="muted" style={{ fontSize: ".78rem", marginTop: ".35rem" }}>
                No ${r.title.toLowerCase()} records yet — <a href="/${kebabPlural(r.target)}" style={{ textDecoration: "underline" }}>create one first</a>.
              </p>
            )}
          </div>`;

  const searchable = fields.filter((f) => f.type === "String").map((f) => `String(r.${f.name} ?? "")`);
  const optionsProps = rels.map((r) => `${r.object}Options`).join(", ");
  const optionsType = rels.map((r) => `${r.object}Options: Option[]`).join("; ");

  const manager = `"use client";

import { useMemo, useState } from "react";

export type Option = { id: string; label: string };

export type ${m.name}Row = {
  id: string;
${propType}
};

export function ${comp}({ initial${rels.length ? ", " + optionsProps : ""} }: { initial: ${m.name}Row[]${rels.length ? "; " + optionsType : ""} }) {
  const [rows, setRows] = useState<${m.name}Row[]>(initial);
  const [form, setForm] = useState(${blankForm});
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [${searchable.length ? searchable.join(", ") : '""'}${rels.length ? ", " + rels.map((r) => `String(r.${r.object}Label ?? "")`).join(", ") : ""}].join(" ").toLowerCase().includes(q));
  }, [rows, query]);

  function reset() {
    setForm(${blankForm});
    setEditing(null);
    setError(null);
  }

  function startEdit(r: ${m.name}Row) {
    setEditing(r.id);
    setError(null);
    setForm({ ${[
      ...fields.map((f) => (f.type === "Boolean" ? `${f.name}: Boolean(r.${f.name})` : f.type === "DateTime" ? `${f.name}: r.${f.name} ? String(r.${f.name}).slice(0, 10) : ""` : `${f.name}: r.${f.name} == null ? "" : String(r.${f.name})`)),
      ...rels.map((r) => `${r.field}: r.${r.field} ?? ""`),
    ].join(", ")} });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Create when nothing is selected, update in place when something is — the same form
  // does both, so a record can be corrected instead of only added and deleted.
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(editing ? \`/api/${route}/\${editing}\` : "/api/${route}", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; data?: ${m.name}Row; error?: string } | null;
      if (!res.ok || !body?.ok || !body.data) throw new Error(body?.error || "Could not save");
      const saved = body.data as ${m.name}Row;
      setRows((prev) => (editing ? prev.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...prev]));
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const previous = rows;
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (editing === id) reset();
    const res = await fetch(\`/api/${route}/\${id}\`, { method: "DELETE" });
    if (!res.ok) setRows(previous);
  }

  return (
    <div className="stack" style={{ gap: "clamp(1.6rem,4vw,2.8rem)" }}>
      <form onSubmit={submit} className="glass rv" style={{ padding: "clamp(1.3rem,3vw,2rem)" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 className="t-title">{editing ? "Edit ${m.name.toLowerCase()}" : "New ${m.name.toLowerCase()}"}</h2>
          <span className="tag">{rows.length} saved</span>
        </div>
        <div className="grid g2" style={{ marginTop: "1.4rem" }}>
${[...fields.map(formField), ...rels.map(relField)].join("\n")}
        </div>
        {error && <p style={{ marginTop: ".9rem", color: "#e5484d", fontSize: ".9rem" }}>{error}</p>}
        <div className="row" style={{ marginTop: "1.4rem", gap: ".6rem" }}>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add ${m.name.toLowerCase()}"}
          </button>
          {editing && <button type="button" className="btn btn-ghost" onClick={reset}>Cancel</button>}
        </div>
      </form>

      {rows.length > 3 && (
        <input
          className="input"
          placeholder="Search ${m.plural.toLowerCase()}…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search ${m.plural.toLowerCase()}"
        />
      )}

      {rows.length === 0 ? (
        <div className="empty rv">
          <div className="empty-art" />
          <h3 className="t-title" style={{ marginTop: ".6rem" }}>Nothing here yet</h3>
          <p className="muted" style={{ maxWidth: "34ch" }}>Add your first ${m.name.toLowerCase()} above and it appears here instantly.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty rv">
          <h3 className="t-title">No matches</h3>
          <p className="muted">Nothing matches “{query}”.</p>
        </div>
      ) : (
        <div className="${collectionClass} stagger">
          {visible.map((r) => (
            <article key={r.id} className="${itemClass}">
              <div style={{ minWidth: 0 }}>
                <h3 className="t-title" style={{ fontSize: "1.15rem" }}>{${first.type === "Boolean" ? `r.${first.name} ? "Yes" : "No"` : `String(r.${first.name} ?? "")`} || "Untitled"}</h3>
                <div style={{ marginTop: ".55rem", display: "grid", gap: ".25rem" }}>
${[
  ...fields
    .slice(1)
    .map((f) => `                  <div className="muted" style={{ fontSize: ".82rem" }}><span style={{ opacity: .7 }}>${labelOf(f)}:</span> {${f.type === "Boolean" ? `r.${f.name} ? "Yes" : "No"` : `String(r.${f.name} ?? "—")`}}</div>`),
  ...rels.map(
    (r) => `                  {r.${r.object}Label && (
                    <div className="muted" style={{ fontSize: ".82rem" }}>
                      <span style={{ opacity: .7 }}>${r.title}:</span>{" "}
                      <a href="/${kebabPlural(r.target)}" style={{ textDecoration: "underline" }}>{r.${r.object}Label}</a>
                    </div>
                  )}`
  ),
].join("\n")}
                </div>
              </div>
              <div className="row" style={{ marginTop: "${art.layout === "rows" ? "0" : "1.2rem"}", gap: ".4rem", flexShrink: 0 }}>
                <button className="btn btn-ghost" onClick={() => startEdit(r)}>Edit</button>
                <button className="btn btn-ghost" onClick={() => remove(r.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
`;

  const include = rels.length ? `, include: { ${rels.map((r) => `${r.object}: { select: { ${r.label}: true } }`).join(", ")} }` : "";
  // A foreign key is only accepted if that parent row exists AND belongs to the caller —
  // otherwise a crafted request could attach one account's record to another's.
  const relCoercion = rels
    .map(
      (r) => `    const ${r.field}Raw = typeof body?.${r.field} === "string" && body.${r.field} ? String(body.${r.field}) : null;
    const ${r.field} = ${r.field}Raw && (await db.${camel(r.target)}.findFirst({ where: { id: ${r.field}Raw${authRequired ? ", ownerId: user.id" : ""} }, select: { id: true } })) ? ${r.field}Raw : null;`
    )
    .join("\n");
  const writable = [...fields.map((f) => f.name), ...rels.map((r) => r.field)];

  const collectionApi = `import { NextResponse } from "next/server";
import { db } from "@/lib/db";
${authRequired ? 'import { getSessionUser } from "@/lib/auth/session";\n' : ""}
export const runtime = "nodejs";

export async function GET() {
${authRequired ? '  const user = await getSessionUser();\n  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });\n' : ""}  const rows = await db.${delegate}.findMany({ ${scope}orderBy: { createdAt: "desc" }, take: 100${include} });
  return NextResponse.json({ ok: true, data: rows.map((r) => (${rowMapper(fields, rels)})) });
}

export async function POST(req: Request) {
  try {
${authRequired ? '    const user = await getSessionUser();\n    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });\n' : ""}    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
${fields.map(coercion).join("\n")}
${relCoercion}
${first.type === "Boolean" ? "" : `    if (${first.name} == null) return NextResponse.json({ ok: false, error: "${labelOf(first)} is required." }, { status: 400 });\n`}    const created = await db.${delegate}.create({
      data: { ${writable.join(", ")}${authRequired ? ", ownerId: user.id" : ""} },
    });
    const r = await db.${delegate}.findUnique({ where: { id: created.id }${include} });
    if (!r) return NextResponse.json({ ok: false, error: "Could not read the record back." }, { status: 500 });
    return NextResponse.json({ ok: true, data: ${rowMapper(fields, rels)} }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not create the record." }, { status: 500 });
  }
}
`;

  const ownerGuard = authRequired
    ? `  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const existing = await db.${delegate}.findFirst({ where: { id, ownerId: user.id }, select: { id: true } });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
`
    : "";

  const itemApi = `import { NextResponse } from "next/server";
import { db } from "@/lib/db";
${authRequired ? 'import { getSessionUser } from "@/lib/auth/session";\n' : ""}
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
${ownerGuard}  const r = await db.${delegate}.findUnique({ where: { id }${include} });
  if (!r) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, data: ${rowMapper(fields, rels)} });
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
${ownerGuard}    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
${fields.map(coercion).join("\n")}
${relCoercion}
${first.type === "Boolean" ? "" : `    if (${first.name} == null) return NextResponse.json({ ok: false, error: "${labelOf(first)} is required." }, { status: 400 });\n`}    await db.${delegate}.update({ where: { id }, data: { ${writable.join(", ")} } });
    const r = await db.${delegate}.findUnique({ where: { id }${include} });
    if (!r) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: ${rowMapper(fields, rels)} });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not update the record." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
${ownerGuard}  await db.${delegate}.delete({ where: { id } }).catch(() => null);
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
  const { html: composedHtml, bindings } = prepareComposition(art.html ?? "", models);
  const boundArt: PageArt = { ...art, html: composedHtml };

  // A brand-new account should see zeros and an invitation to start, not a fabricated
  // "88% mastery". Recent activity is read from the database, so it's empty until it isn't.
  const recent = data
    .slice(0, 4)
    .map(
      (m) => `    db.${camel(m.name)}.findMany({ ${authRequired ? "where: { ownerId: user.id }, " : ""}orderBy: { createdAt: "desc" }, take: 3, select: { id: true${m.simple[0] ? `, ${m.simple[0].name}: true` : ""}, createdAt: true } }).then((rows) => rows.map((r) => ({ id: r.id, kind: ${JSON.stringify(m.name)}, href: ${JSON.stringify("/" + kebabPlural(m.name))}, label: ${m.simple[0] ? `String(r.${m.simple[0].name} ?? "Untitled")` : '"Untitled"'}, at: r.createdAt.toISOString() })))`
    )
    .join(",\n");

  return {
    path: "src/app/(app)/dashboard/page.tsx",
    content: `${authRequired ? 'import { redirect } from "next/navigation";\nimport { getSessionUser } from "@/lib/auth/session";\n' : ""}import Link from "next/link";
import { db } from "@/lib/db";
import { bindValues } from "@/lib/bind";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
${authRequired ? '  const user = await getSessionUser();\n  if (!user) redirect("/login");\n' : ""}${
      data.length
        ? `  const [${data.map((m) => camel(m.name) + "Count").join(", ")}] = await Promise.all([
${counts},
  ]);
  const activity = (await Promise.all([
${recent},
  ])).flat().sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 6);
  const total = ${data.map((m) => camel(m.name) + "Count").join(" + ")};
`
        : "  const activity: { id: string; kind: string; href: string; label: string; at: string }[] = [];\n  const total = 0;\n"
    }${bindingQueries(bindings, authRequired)}
  const __data = ${bindingMap(bindings)};

  return (
    ${composedPage(boundArt, `<section className="wrap" style={{ paddingBlock: "clamp(2rem,5vw,3.5rem)" }}>${dashboardCards(data)}${ACTIVITY_JSX}</section>`) ?? `<>
      ${heroMarkup(art)}
      <section className="wrap" style={{ paddingBottom: "clamp(3rem,8vw,6rem)" }}>
        ${dashboardCards(data)}
        ${ACTIVITY_JSX}
      </section>
    </>`}
  );
}
`,
  };
}

/** Recent activity, or an honest empty state for an account that hasn't started yet. */
const ACTIVITY_JSX = `
        <div className="rv" style={{ marginTop: "clamp(1.6rem,4vw,2.6rem)" }}>
          <h2 className="t-title" style={{ marginBottom: "1rem" }}>Recent activity</h2>
          {activity.length === 0 ? (
            <div className="empty">
              <div className="empty-art" />
              <h3 className="t-title" style={{ marginTop: ".6rem" }}>Nothing yet</h3>
              <p className="muted" style={{ maxWidth: "38ch" }}>
                {total === 0
                  ? "Create your first record from any section above and it shows up here."
                  : "Your newest records will appear here as you add them."}
              </p>
            </div>
          ) : (
            <div className="stack" style={{ gap: ".6rem" }}>
              {activity.map((a) => (
                <Link key={a.kind + a.id} href={a.href} className="rowitem">
                  <div style={{ minWidth: 0 }}>
                    <strong>{a.label}</strong>
                    <div className="muted" style={{ fontSize: ".8rem" }}>{a.kind}</div>
                  </div>
                  <span className="muted" style={{ fontSize: ".8rem" }}>{new Date(a.at).toLocaleDateString()}</span>
                </Link>
              ))}
            </div>
          )}
        </div>`;

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
