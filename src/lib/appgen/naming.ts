// Naming helpers for generated application code. Blueprint text comes from an LLM,
// so every identifier that lands in generated code must be sanitized into a valid,
// predictable form (models, fields, routes, components).

const RESERVED = new Set([
  "new", "delete", "class", "function", "return", "const", "let", "var", "import", "export",
  "default", "await", "async", "type", "interface", "enum", "package", "public", "private",
]);

/** "listening room" → "ListeningRoom" (safe TS/Prisma model identifier). */
export function pascal(input: string, fallback = "Item"): string {
  const parts = (input || "").replace(/[^A-Za-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  let out = parts.map((p) => p[0].toUpperCase() + p.slice(1)).join("");
  if (/^[0-9]/.test(out)) out = "X" + out;
  if (RESERVED.has(out.toLowerCase())) out += "Model";
  return out || fallback;
}

/** "Owner Id" → "ownerId" (safe field identifier). */
export function camel(input: string, fallback = "field"): string {
  const p = pascal(input, fallback);
  let out = p[0].toLowerCase() + p.slice(1);
  if (/^[0-9]/.test(out)) out = "f" + out;
  if (RESERVED.has(out)) out = out + "Value";
  return out || fallback;
}

/** "ListeningRoom" → "listening-rooms" (safe URL segment, pluralized). */
export function kebabPlural(input: string, fallback = "items"): string {
  const k = (input || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  if (!k) return fallback;
  return pluralize(k);
}

export function pluralize(word: string): string {
  if (!word) return word;
  if (/(s|x|z|ch|sh)$/i.test(word)) return word + "es";
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + "ies";
  if (/s$/i.test(word)) return word;
  return word + "s";
}

/** Safe file/route path segment from a blueprint page path ("/app/items" → "app/items"). */
export function routeSegments(path: string): string[] {
  return (path || "/")
    .split("?")[0]
    .split("/")
    .map((s) => s.trim().toLowerCase().replace(/[^a-z0-9\-_[\]]/g, ""))
    .filter(Boolean);
}

/** Escape a string for embedding inside a double-quoted TS/JSX string literal. */
export function q(s: string): string {
  return JSON.stringify(String(s ?? ""));
}

/** Escape text that goes inside JSX as literal content. */
export function jsxText(s: string): string {
  return String(s ?? "").replace(/[{}<>]/g, (c) => ({ "{": "&#123;", "}": "&#125;", "<": "&lt;", ">": "&gt;" }[c] as string));
}
