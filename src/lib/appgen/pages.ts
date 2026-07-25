import type { ProjectFile } from "./types";
import type { ModelPlan } from "./prisma";
import { camel, kebabPlural } from "./naming";

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

export function crudFiles(m: ModelPlan, authRequired: boolean): ProjectFile[] {
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
    <div>
      <h1 className="text-2xl font-bold tracking-tight">${labelOf({ name: m.plural, type: "String" } as F)}</h1>
      <p className="mt-1 text-sm text-muted">Create, view and remove ${m.name.toLowerCase()} records — stored in the database.</p>
      <${comp} initial={initial} />
    </div>
  );
}
`;

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
    <div className="mt-6 space-y-6">
      <form onSubmit={create} className="card">
        <h2 className="text-sm font-semibold">New ${m.name.toLowerCase()}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
${fields
  .map((f) =>
    f.type === "Boolean"
      ? `          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.${f.name}} onChange={(e) => setForm({ ...form, ${f.name}: e.target.checked })} />
            ${labelOf(f)}
          </label>`
      : `          <div>
            <label className="label" htmlFor="${f.name}">${labelOf(f)}</label>
            <input id="${f.name}" type="${inputType(f)}" className="input" value={form.${f.name}} onChange={(e) => setForm({ ...form, ${f.name}: e.target.value })} />
          </div>`
  )
  .join("\n")}
        </div>
        {error && <p className="mt-3 text-sm" style={{ color: "#e5484d" }}>{error}</p>}
        <button type="submit" className="btn-primary mt-4" disabled={busy}>{busy ? "Saving…" : "Add ${m.name.toLowerCase()}"}</button>
      </form>

      {rows.length === 0 ? (
        <div className="card text-sm text-muted">Nothing here yet — add your first ${m.name.toLowerCase()} above.</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="card flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <div className="truncate font-medium">{${first.type === "Boolean" ? `r.${first.name} ? "Yes" : "No"` : `String(r.${first.name} ?? "")`} || "Untitled"}</div>
${fields
  .slice(1)
  .map((f) => `                <div className="text-xs text-muted">${labelOf(f)}: {${f.type === "Boolean" ? `r.${f.name} ? "Yes" : "No"` : `String(r.${f.name} ?? "—")`}}</div>`)
  .join("\n")}
              </div>
              <button className="btn-ghost shrink-0" onClick={() => remove(r.id)}>Delete</button>
            </li>
          ))}
        </ul>
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
  return <div>{children}</div>;
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
    <div>
      <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border bg-surface px-4 py-3">
        <span className="text-sm text-muted">Signed in to ${appName} as <span className="font-medium text-fg">{user.email}</span></span>
        <SignOutButton />
      </div>
      {children}
    </div>
  );
}
`,
  };
}

export function dashboardFile(models: ModelPlan[], authRequired: boolean, appName: string): ProjectFile {
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
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Everything in ${appName} at a glance.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
${data
  .map(
    (m) => `        <Link href="/${kebabPlural(m.name)}" className="card transition hover:border-accent">
          <div className="text-3xl font-bold">{${camel(m.name)}Count}</div>
          <div className="mt-1 text-sm text-muted">${m.plural}</div>
        </Link>`
  )
  .join("\n")}
      </div>
    </div>
  );
}
`,
  };
}
