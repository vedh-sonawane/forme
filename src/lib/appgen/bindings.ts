import type { ModelPlan } from "./prisma";
import { camel } from "./naming";

// Composed app pages used to invent their own numbers: a freshly created account opened
// its dashboard and was told "88% Overall Curriculum Mastery" and "5 Days Purr-fect" when
// it had done nothing at all. Decorative markup presented as data is worse than no data —
// it makes the whole product feel fake.
//
// The model keeps its creative freedom over WHAT to show and how it looks. What it may no
// longer do is make the value up: every number comes through a binding that this module
// resolves against the real database, and anything it can't resolve is removed rather than
// rendered as a plausible-looking lie.

export type Binding = {
  /** The raw token as written in the markup, e.g. "count:Exercise" */
  token: string;
  kind: "count" | "sum" | "avg" | "latest";
  model: string;
  field?: string;
  /** JS identifier holding the resolved value in the generated page. */
  ident: string;
};

const BINDING_RE = /\{\{\s*(count|sum|avg|latest)\s*:\s*([A-Za-z0-9_]+)(?:\.([A-Za-z0-9_]+))?\s*\}\}/g;

/** Every binding the composition asks for, resolved against models that actually exist. */
export function extractBindings(html: string, models: ModelPlan[]): Binding[] {
  const byName = new Map(models.filter((m) => !m.isUser).map((m) => [m.name.toLowerCase(), m]));
  const found = new Map<string, Binding>();

  for (const m of (html || "").matchAll(BINDING_RE)) {
    const [, kindRaw, modelRaw, fieldRaw] = m;
    const kind = kindRaw.toLowerCase() as Binding["kind"];
    const model = byName.get(modelRaw.toLowerCase());
    if (!model) continue;

    let field = fieldRaw ? camel(fieldRaw) : undefined;
    if (kind === "sum" || kind === "avg") {
      // Only a numeric column can be summed or averaged.
      const numeric = model.simple.find((f) => f.name === field && (f.type === "Int" || f.type === "Float"));
      if (!numeric) continue;
    }
    if (kind === "latest") {
      const exists = model.simple.some((f) => f.name === field);
      if (!exists) field = model.simple[0]?.name;
      if (!field) continue;
    }

    const token = m[0].replace(/\s+/g, "");
    const ident = `bind_${kind}_${model.name}${field ? "_" + field : ""}`.replace(/[^A-Za-z0-9_]/g, "");
    found.set(token, { token, kind, model: model.name, field, ident });
  }
  return [...found.values()];
}

/** Prisma statements that compute each binding for the signed-in user. */
export function bindingQueries(bindings: Binding[], authRequired: boolean): string {
  const scope = authRequired ? "where: { ownerId: user.id }, " : "";
  const scopeOnly = authRequired ? "{ where: { ownerId: user.id } }" : "";
  return bindings
    .map((b) => {
      const delegate = camel(b.model);
      if (b.kind === "count") return `  const ${b.ident} = await db.${delegate}.count(${scopeOnly});`;
      if (b.kind === "sum" || b.kind === "avg") {
        const op = b.kind === "sum" ? "_sum" : "_avg";
        return `  const ${b.ident}Agg = await db.${delegate}.aggregate({ ${scope}${op}: { ${b.field}: true } });\n  const ${b.ident} = Math.round(${b.ident}Agg.${op}.${b.field} ?? 0);`;
      }
      return `  const ${b.ident}Row = await db.${delegate}.findFirst({ ${scope}orderBy: { createdAt: "desc" } });\n  const ${b.ident} = ${b.ident}Row?.${b.field} ?? null;`;
    })
    .join("\n");
}

/** `{ "{{count:Exercise}}": bind_count_Exercise, … }` for the runtime substitution. */
export function bindingMap(bindings: Binding[]): string {
  if (!bindings.length) return "{}";
  return `{ ${bindings.map((b) => `${JSON.stringify(b.token)}: ${b.ident}`).join(", ")} }`;
}

/**
 * Normalise binding tokens to their canonical (whitespace-free) form so the runtime map
 * matches, and drop any binding that didn't resolve to a real model/field.
 */
export function normalizeBindings(html: string, bindings: Binding[]): string {
  const known = new Set(bindings.map((b) => b.token));
  return (html || "").replace(BINDING_RE, (raw) => {
    const token = raw.replace(/\s+/g, "");
    return known.has(token) ? token : "—";
  });
}

/**
 * Numbers the composition wrote directly into a statistic — `<div class="stat-num">88</div>`,
 * `data-countup="342"` — with no binding behind them. There is no way to tell an invented
 * figure from a real one once it's baked into the markup, so the honest move is to blank
 * it: an em dash reads as "no data yet", which is the truth for a new account.
 */
export function scrubFabricatedStats(html: string): string {
  if (!html) return html;
  let out = html;

  // data-countup="123" → only meaningful when bound; otherwise the animation is a lie.
  out = out.replace(/\sdata-countup\s*=\s*"(?!\{\{)[^"]*"/gi, "");

  // Any element carrying a stat class whose entire text is a bare number/percentage.
  out = out.replace(
    /(<([a-zA-Z][\w-]*)\b[^>]*class="[^"]*\b(?:stat-num|stat|metric|kpi|counter)\b[^"]*"[^>]*>)([\s\S]*?)(<\/\2>)/gi,
    (full, open: string, _tag: string, inner: string, close: string) => {
      if (/\{\{/.test(inner)) return full; // bound — keep it
      if (/<[a-zA-Z]/.test(inner)) return full; // structural, not a bare figure
      return /^[\s\d.,%+$£€kKmM]*$/.test(inner) && /\d/.test(inner) ? `${open}—${close}` : full;
    }
  );
  return out;
}

/** The catalogue of bindings this product can actually offer, for the design prompt. */
export function availableBindings(models: ModelPlan[]): string {
  const lines: string[] = [];
  for (const m of models.filter((x) => !x.isUser)) {
    lines.push(`{{count:${m.name}}} — how many ${m.plural} exist`);
    const label = m.simple.find((f) => f.type === "String");
    if (label) lines.push(`{{latest:${m.name}.${label.name}}} — the newest ${m.name}'s ${label.name}`);
    for (const f of m.simple.filter((x) => x.type === "Int" || x.type === "Float").slice(0, 2)) {
      lines.push(`{{sum:${m.name}.${f.name}}} and {{avg:${m.name}.${f.name}}}`);
    }
  }
  return lines.join("\n");
}
