import type { ApplicationBlueprint } from "@/lib/design/schema";
import { camel, pascal, pluralize } from "./naming";

// Blueprint entities → a VALID Prisma schema. Blueprint text is LLM-authored, so this
// is deliberately conservative: identifiers are sanitized, field names de-duplicated,
// and relations are only emitted when both sides resolve (one relation per model pair,
// so Prisma never sees an ambiguous relation it would reject).

export type ModelPlan = {
  name: string; // PascalCase model name
  plural: string; // camelCase plural (back-relation field on User)
  fields: string[]; // rendered field lines
  declared: Set<string>; // field names already declared
  isUser: boolean;
  /** Scalar fields safe to render in a generated form/list (no id/timestamps/secrets). */
  simple: { name: string; type: "String" | "Int" | "Float" | "Boolean" | "DateTime" }[];
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

    models.push({ name, plural: camel(pluralize(name)), fields, declared, isUser, simple: simple.slice(0, 6) });
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

export function renderPrismaSchema(bp: ApplicationBlueprint, models: ModelPlan[], authRequired: boolean): string {
  const user = models.find((m) => m.isUser) ?? null;
  const byName = new Map(models.map((m) => [m.name, m]));
  const pairSeen = new Set<string>();
  const extra: Record<string, string[]> = {};
  const push = (model: string, line: string) => { (extra[model] ??= []).push(line); };

  // 1) Ownership: every non-user model belongs to a user (drives per-user CRUD).
  if (authRequired && user) {
    for (const m of models) {
      if (m.isUser) continue;
      if (!m.declared.has("ownerId")) { push(m.name, "  ownerId   String?"); m.declared.add("ownerId"); }
      if (!m.declared.has("owner")) { push(m.name, `  owner     ${user.name}? @relation(fields: [ownerId], references: [id], onDelete: Cascade)`); m.declared.add("owner"); }
      if (!user.declared.has(m.plural)) { push(user.name, `  ${m.plural.padEnd(9)} ${m.name}[]`); user.declared.add(m.plural); }
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
      if (!a.declared.has(b.plural)) { push(a.name, `  ${b.plural.padEnd(9)} ${b.name}[]`); a.declared.add(b.plural); }
      if (!b.declared.has(a.plural)) { push(b.name, `  ${a.plural.padEnd(9)} ${a.name}[]`); b.declared.add(a.plural); }
      continue;
    }
    // one-to-many (a has many b) and one-to-one both put the FK on b.
    const fk = camel(a.name) + "Id";
    const objField = camel(a.name);
    const one = kind.includes("one-to-one");
    if (!b.declared.has(fk)) { push(b.name, `  ${fk.padEnd(9)} String?${one ? " @unique" : ""}`); b.declared.add(fk); }
    if (!b.declared.has(objField)) { push(b.name, `  ${objField.padEnd(9)} ${a.name}? @relation(fields: [${fk}], references: [id])`); b.declared.add(objField); }
    const back = one ? camel(b.name) : b.plural;
    if (!a.declared.has(back)) { push(a.name, `  ${back.padEnd(9)} ${b.name}${one ? "?" : "[]"}`); a.declared.add(back); }
  }

  const modelBlocks = models
    .map((m) => {
      const lines = [...m.fields, ...(extra[m.name] ?? [])];
      if (authRequired && user && m.isUser) lines.push("  sessions  Session[]");
      return `model ${m.name} {\n${lines.join("\n")}\n}`;
    })
    .join("\n\n");

  const sessionBlock = authRequired && user
    ? `\n\n// Server-side sessions (httpOnly cookie holds the opaque token).\nmodel Session {\n  id        String   @id @default(cuid())\n  token     String   @unique\n  userId    String\n  expiresAt DateTime\n  createdAt DateTime @default(now())\n\n  user      ${user.name} @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@index([userId])\n}`
    : "";

  return `// Generated by FORME from the Application Blueprint.
// SQLite by default so the app runs immediately; switch datasource to postgresql
// (and set DATABASE_URL) for production.

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

${modelBlocks}${sessionBlock}
`;
}
