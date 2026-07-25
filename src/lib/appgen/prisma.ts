import type { ApplicationBlueprint } from "@/lib/design/schema";
import { camel, pascal, pluralize } from "./naming";

// Blueprint entities → a VALID Prisma schema. Blueprint text is LLM-authored, so this
// is deliberately conservative: identifiers are sanitized, field names de-duplicated,
// and relations are only emitted when both sides resolve (one relation per model pair,
// so Prisma never sees an ambiguous relation it would reject).

/**
 * A "belongs to" link the UI can actually offer: the child's foreign key, the parent it
 * points at, and the parent field worth showing in a picker. Without this the schema has
 * relationships the interface can't reach, so every record is an island — which is what
 * made generated apps feel like a form bolted to a list.
 */
export type RelationPlan = {
  /** FK scalar on this model, e.g. "lessonId" */
  field: string;
  /** Parent model, e.g. "Lesson" */
  target: string;
  /** camelCase relation object, e.g. "lesson" */
  object: string;
  /** camelCase plural of the parent, e.g. "lessons" (its route/delegate) */
  targetPlural: string;
  /** Parent field to label options with, e.g. "title" */
  label: string;
  /** Human label for the form control, e.g. "Lesson" */
  title: string;
};

export type ModelPlan = {
  name: string; // PascalCase model name
  plural: string; // camelCase plural (back-relation field on User)
  fields: string[]; // rendered field lines
  declared: Set<string>; // field names already declared
  isUser: boolean;
  /** Scalar fields safe to render in a generated form/list (no id/timestamps/secrets). */
  simple: { name: string; type: "String" | "Int" | "Float" | "Boolean" | "DateTime" }[];
  /** Parents this model points at — rendered as real pickers, not free text. */
  belongsTo: RelationPlan[];
  /** Relation/ownership lines appended to the model block. */
  extra: string[];
};

function mapType(raw: string): string {
  const t = (raw || "").toLowerCase();
  if (/bool/.test(t)) return "Boolean";
  if (/(^|\W)(int|integer|number|count|quantity|qty)(\W|$)/.test(t)) return "Int";
  if (/(float|decimal|double|money|price|amount|rating)/.test(t)) return "Float";
  if (/(date|time)/.test(t)) return "DateTime";
  // uuid / string / text / enum(...) / json / anything unknown → String (SQLite-safe)
  return "String";
}

/** Build the model plans (used by both the schema and the CRUD generators). */
export function planModels(bp: ApplicationBlueprint, authRequired: boolean): ModelPlan[] {
  const models: ModelPlan[] = [];
  const seenNames = new Set<string>();

  for (const e of bp.entities ?? []) {
    const name = pascal(e.name || "Item");
    if (seenNames.has(name)) continue;
    seenNames.add(name);

    const declared = new Set<string>(["id"]);
    const fields: string[] = ["  id        String   @id @default(cuid())"];
    const simple: ModelPlan["simple"] = [];
    const isUser = /^users?$|^account$|^member$/i.test(name);

    for (const f of e.fields ?? []) {
      const fname = camel(f.name || "");
      if (!fname || declared.has(fname)) continue;
      // id / relation scalars are handled separately.
      if (fname === "id") continue;
      declared.add(fname);
      const type = mapType(f.type);
      if (fname === "createdAt") { fields.push("  createdAt DateTime @default(now())"); continue; }
      if (fname === "updatedAt") { fields.push("  updatedAt DateTime @updatedAt"); continue; }
      const unique = /unique/i.test(f.note || "") || fname === "email";
      fields.push(`  ${fname.padEnd(9)} ${type}?${unique ? " @unique" : ""}`);
      // Never surface secrets or foreign keys in generated forms/lists.
      const isSecret = /password|hash|token|secret/i.test(fname);
      const isFk = /Id$/.test(fname) && fname !== "id";
      if (!isSecret && !isFk && !unique) simple.push({ name: fname, type: type as ModelPlan["simple"][number]["type"] });
    }

    if (!declared.has("createdAt")) { fields.push("  createdAt DateTime @default(now())"); declared.add("createdAt"); }

    // Guarantee every non-user model has at least one editable field so CRUD works.
    if (!isUser && simple.length === 0) {
      if (!declared.has("title")) { fields.push("  title     String?"); declared.add("title"); }
      simple.push({ name: "title", type: "String" });
    }

    models.push({ name, plural: camel(pluralize(name)), fields, declared, isUser, simple: simple.slice(0, 6), belongsTo: [], extra: [] });
  }

  // Ensure a User model exists when the app needs authentication.
  if (authRequired && !models.some((m) => m.isUser)) {
    models.unshift({
      name: "User",
      plural: "users",
      simple: [],
      declared: new Set(["id", "email", "name", "passwordHash", "role", "createdAt"]),
      fields: [
        "  id        String   @id @default(cuid())",
        "  email     String   @unique",
        "  name      String?",
        "  passwordHash String",
        "  role      String   @default(\"user\")",
        "  createdAt DateTime @default(now())",
      ],
      isUser: true,
      belongsTo: [],
      extra: [],
    });
  }

  // Guarantee the auth fields exist on whichever model is the user.
  const user = models.find((m) => m.isUser);
  if (authRequired && user) {
    if (!user.declared.has("email")) { user.fields.push("  email     String   @unique"); user.declared.add("email"); }
    if (!user.declared.has("passwordHash")) { user.fields.push("  passwordHash String"); user.declared.add("passwordHash"); }
    if (!user.declared.has("name")) { user.fields.push("  name      String?"); user.declared.add("name"); }
    if (!user.declared.has("role")) { user.fields.push("  role      String   @default(\"user\")"); user.declared.add("role"); }
  }

  return models;
}

/** The parent field a picker should show — the first human-readable string on the model. */
function labelFieldOf(m: ModelPlan): string {
  const named = m.simple.find((f) => /^(title|name|label|headline|subject)$/i.test(f.name) && f.type === "String");
  return (named ?? m.simple.find((f) => f.type === "String"))?.name ?? "id";
}

/**
 * Ownership + blueprint relationships, recorded on the models so the SCHEMA and the
 * INTERFACE are generated from one source. Previously only the schema knew about these,
 * which is why the foreign keys existed but nothing could ever set them.
 */
export function planRelations(bp: ApplicationBlueprint, models: ModelPlan[], authRequired: boolean): void {
  // Must run on the FINAL model list. The generator caps how many models an app gets, and
  // a relation pointing at a model that was cut produces a schema Prisma rejects outright.
  for (const m of models) { m.extra = []; m.belongsTo = []; }
  const user = models.find((m) => m.isUser) ?? null;
  const byName = new Map(models.map((m) => [m.name, m]));
  const pairSeen = new Set<string>();

  // 1) Ownership: every non-user model belongs to a user (drives per-user CRUD).
  if (authRequired && user) {
    for (const m of models) {
      if (m.isUser) continue;
      if (!m.declared.has("ownerId")) { m.extra.push("  ownerId   String?"); m.declared.add("ownerId"); }
      if (!m.declared.has("owner")) { m.extra.push(`  owner     ${user.name}? @relation(fields: [ownerId], references: [id], onDelete: Cascade)`); m.declared.add("owner"); }
      if (!user.declared.has(m.plural)) { user.extra.push(`  ${m.plural.padEnd(9)} ${m.name}[]`); user.declared.add(m.plural); }
      pairSeen.add([user.name, m.name].sort().join("~"));
    }
  }

  // 2) Blueprint relationships between non-user models (one relation per pair).
  for (const rel of bp.relationships ?? []) {
    const a = byName.get(pascal(rel.from || ""));
    const b = byName.get(pascal(rel.to || ""));
    if (!a || !b || a.name === b.name) continue;
    if (a.isUser || b.isUser) continue; // ownership already covers user links
    const key = [a.name, b.name].sort().join("~");
    if (pairSeen.has(key)) continue;
    pairSeen.add(key);

    const kind = (rel.kind || "one-to-many").toLowerCase();
    if (kind.includes("many-to-many")) {
      if (!a.declared.has(b.plural)) { a.extra.push(`  ${b.plural.padEnd(9)} ${b.name}[]`); a.declared.add(b.plural); }
      if (!b.declared.has(a.plural)) { b.extra.push(`  ${a.plural.padEnd(9)} ${a.name}[]`); b.declared.add(a.plural); }
      continue;
    }
    // one-to-many (a has many b) and one-to-one both put the FK on b.
    const fk = camel(a.name) + "Id";
    const objField = camel(a.name);
    const one = kind.includes("one-to-one");
    if (!b.declared.has(fk)) { b.extra.push(`  ${fk.padEnd(9)} String?${one ? " @unique" : ""}`); b.declared.add(fk); }
    if (!b.declared.has(objField)) { b.extra.push(`  ${objField.padEnd(9)} ${a.name}? @relation(fields: [${fk}], references: [id])`); b.declared.add(objField); }
    const back = one ? camel(b.name) : b.plural;
    if (!a.declared.has(back)) { a.extra.push(`  ${back.padEnd(9)} ${b.name}${one ? "?" : "[]"}`); a.declared.add(back); }

    b.belongsTo.push({
      field: fk,
      target: a.name,
      object: objField,
      targetPlural: a.plural,
      label: labelFieldOf(a),
      title: a.name.replace(/([a-z0-9])([A-Z])/g, "$1 $2"),
    });
  }
}

export function renderPrismaSchema(_bp: ApplicationBlueprint, models: ModelPlan[], authRequired: boolean, provider: "sqlite" | "postgresql" = "sqlite"): string {
  const user = models.find((m) => m.isUser) ?? null;

  // Relations were planned alongside the models (see planRelations) so the schema and the
  // generated interface can never disagree about what links to what.
  const modelBlocks = models
    .map((m) => {
      const lines = [...m.fields, ...m.extra];
      if (authRequired && user && m.isUser) lines.push("  sessions  Session[]");
      return `model ${m.name} {\n${lines.join("\n")}\n}`;
    })
    .join("\n\n");

  const sessionBlock = authRequired && user
    ? `\n\n// Server-side sessions (httpOnly cookie holds the opaque token).\nmodel Session {\n  id        String   @id @default(cuid())\n  token     String   @unique\n  userId    String\n  expiresAt DateTime\n  createdAt DateTime @default(now())\n\n  user      ${user.name} @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@index([userId])\n}`
    : "";

  return `// Generated by FORME from the Application Blueprint.
${
  provider === "postgresql"
    ? "// Postgres — required for hosted deployments (serverless filesystems are read-only,\n// so SQLite cannot persist there)."
    : "// SQLite so the app runs immediately with zero setup. For a HOSTED deployment set\n// DATABASE_URL to a Postgres URL and change the provider below to \"postgresql\"."
}

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}

${modelBlocks}${sessionBlock}
`;
}
