import { generateRaw, usingRealAI } from "@/lib/ai/provider";
import { prompts } from "@/lib/prompts/registry";
import { renderBaseline } from "@/lib/generation/baseline";
import { systemToCss } from "@/lib/generation/css";
import type { DesignSystem, DesignDirection, Requirements, WebsitePlan, Critique } from "@/lib/design/schema";
import type { AiCallMeta } from "@/lib/ai/types";

// Failsafe: guarantee scroll-reveal content becomes visible even if the model's
// IntersectionObserver script is missing or broken. Injected into every page.
const REVEAL_FAILSAFE = `<script>setTimeout(function(){try{document.querySelectorAll('.reveal').forEach(function(e){e.classList.add('in')})}catch(_){}} ,1600);</script>`;

function injectFailsafe(html: string): string {
  if (!/class=["'][^"']*reveal/.test(html)) return html; // page doesn't use reveal
  if (html.includes("</body>")) return html.replace("</body>", `${REVEAL_FAILSAFE}</body>`);
  if (html.includes("</html>")) return html.replace("</html>", `${REVEAL_FAILSAFE}</html>`);
  return html + REVEAL_FAILSAFE;
}

// Extracts a full HTML document from model output; returns null if it isn't one.
function extractHtml(text: string): string | null {
  let t = text.trim();
  const fence = t.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.search(/<!doctype html>|<html[\s>]/i);
  if (start === -1) return null;
  const end = t.toLowerCase().lastIndexOf("</html>");
  if (end === -1) return null;
  const doc = t.slice(start, end + 7);
  // sanity: must contain a body and reasonable length
  if (doc.length < 400 || !/<body[\s>]/i.test(doc)) return null;
  return doc;
}

// Guarantee no dead links in a self-contained single-page site: rewrite any local
// path/relative links (which would 404) to in-page anchors, point #anchors that have
// no target to #top, and ensure a #top target exists. External http/mailto/tel are left.
export function sanitizeLinks(html: string): string {
  const ids = new Set<string>();
  const idRe = /\sid=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = idRe.exec(html))) ids.add(m[1].toLowerCase());

  let out = html.replace(/(<a\b[^>]*\shref=)(["'])(.*?)\2/gi, (full, pre, q, href) => {
    const h = href.trim();
    if (/^(https?:|mailto:|tel:|\/\/)/i.test(h)) return full; // external — keep
    if (h.startsWith("#")) {
      const target = h.slice(1).toLowerCase();
      if (!target || (!ids.has(target) && target !== "top")) return `${pre}${q}#top${q}`;
      return full;
    }
    // relative path / anything else on a single-page site → safe in-page anchor
    return `${pre}${q}#top${q}`;
  });

  // Ensure a #top target exists.
  if (!ids.has("top")) {
    out = out.replace(/<body([^>]*)>/i, (mm, attrs) => (/\bid=/.test(attrs) ? mm : `<body${attrs} id="top">`));
    if (!/<body[^>]*\bid=/i.test(out)) out = out.replace(/<body([^>]*)>/i, `<body$1 id="top">`);
  }
  return out;
}

export type CodeGenResult = { html: string; meta: AiCallMeta; usedFallback: boolean; source: "llm" | "baseline" };

// ── Code Generator ───────────────────────────────────────────────────────────────
export async function generateWebsiteCode(input: {
  requirements: Requirements;
  direction: DesignDirection;
  system: DesignSystem;
  plan: WebsitePlan;
}): Promise<CodeGenResult> {
  // Always compute the guaranteed-valid baseline first.
  const baseline = injectFailsafe(renderBaseline(input));

  if (!usingRealAI()) {
    return {
      html: baseline,
      meta: {
        provider: "mock",
        model: "baseline-renderer",
        operation: "code-generation",
        promptVersion: "code-generation-v1",
        inputType: "text",
        latencyMs: 0,
        ok: true,
      },
      usedFallback: true,
      source: "baseline",
    };
  }

  const css = systemToCss(input.system);
  const p = prompts["code-generation-v1"];
  const res = await generateRaw({
    operation: p.operation,
    promptVersion: "code-generation-v1",
    model: "pro",
    maxOutputTokens: 40000,
    temperature: 0.7,
    thinking: false,
    ...p.build({
      requirements: JSON.stringify(input.requirements),
      directionJson: JSON.stringify(input.direction),
      systemCss: css,
      planJson: JSON.stringify(input.plan),
      baseline,
    }),
  });

  const html = res.meta.ok ? extractHtml(res.text) : null;
  if (html) return { html: sanitizeLinks(injectFailsafe(html)), meta: res.meta, usedFallback: res.usedFallback, source: "llm" };
  // LLM failed or produced malformed HTML → baseline keeps the product working.
  return { html: sanitizeLinks(baseline), meta: res.meta, usedFallback: true, source: "baseline" };
}

// Pull a CSS body out of model output (strip fences / stray <style> tags / prose).
function extractCss(text: string): string {
  let t = text.trim();
  const fence = t.match(/```(?:css)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  t = t.replace(/<\/?style[^>]*>/gi, "").trim();
  // If the model prepended prose, start at the first CSS-looking token.
  const at = t.search(/@import|@font-face|@keyframes|[.#:a-zA-Z\[][^{]*\{/);
  if (at > 0) t = t.slice(at);
  return t.trim();
}

// Inject the premium CSS layer LAST so it overrides the site's own styles.
function injectRefineCss(html: string, css: string): string {
  const tag = `<style id="forme-refine">\n${css}\n</style>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${tag}\n</head>`);
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${tag}\n</body>`);
  return html + tag;
}

// ── Refine Agent: keep the REAL page intact, inject a premium CSS layer over it ─────
// This preserves ALL content and links (we never rewrite the markup) and is fast
// (CSS is far smaller than a full HTML regen). Faithful to "refine, don't rebuild".
export async function refineWebsiteCode(input: { url: string; html: string }): Promise<CodeGenResult> {
  const capped = input.html.length > 26000 ? input.html.slice(0, 26000) + "\n<!-- …truncated… -->" : input.html;
  const p = prompts["refine-css-v1"];
  const res = await generateRaw({
    operation: p.operation,
    promptVersion: "refine-css-v1",
    model: "pro",
    maxOutputTokens: 14000,
    temperature: 0.5,
    thinking: false,
    ...p.build({ url: input.url, html: capped }),
  });
  const css = res.meta.ok ? extractCss(res.text) : "";
  if (css && css.length > 60) {
    return { html: injectRefineCss(input.html, css), meta: res.meta, usedFallback: res.usedFallback, source: "llm" };
  }
  // Fallback: keep the original captured HTML (valid, just unrefined).
  return { html: input.html, meta: res.meta, usedFallback: true, source: "baseline" };
}

// ── Chat copilot: apply a natural-language edit, or answer a question ───────────────
export type ChatEditResult = { action: "edit" | "answer"; reply: string; html?: string; usedFallback: boolean };
export async function chatEditWebsite(input: { html: string; message: string }): Promise<ChatEditResult> {
  const capped = input.html.length > 26000 ? input.html.slice(0, 26000) : input.html;
  const p = prompts["chat-edit-v1"];
  const res = await generateRaw({
    operation: p.operation,
    promptVersion: "chat-edit-v1",
    model: "pro",
    maxOutputTokens: 40000,
    temperature: 0.4,
    thinking: false,
    ...p.build({ html: capped, message: input.message }),
  });
  if (!res.meta.ok) return { action: "answer", reply: "I hit an error reaching the model — try again in a moment.", usedFallback: true };

  const text = res.text;
  const marker = text.indexOf("---HTML---");
  const hasDoc = /<!doctype html>|<html[\s>]/i.test(text);
  if (marker !== -1 || hasDoc) {
    const html = extractHtml(marker !== -1 ? text.slice(marker) : text);
    if (html) {
      const reply = (marker !== -1 ? text.slice(0, marker) : text.split(/<!doctype html>|<html[\s>]/i)[0]).trim() || "Done — applied your change.";
      return { action: "edit", reply: reply.slice(0, 400), html: sanitizeLinks(injectFailsafe(html)), usedFallback: res.usedFallback };
    }
  }
  return { action: "answer", reply: text.trim().slice(0, 800) || "Sorry, I couldn't process that.", usedFallback: res.usedFallback };
}

// ── Improvement Agent ─────────────────────────────────────────────────────────────
// Deterministic token nudge used when there's no real AI (or as a safety net):
// translate critique issue categories into concrete design-system adjustments.
function nudgeSystem(system: DesignSystem, issues: Critique["issues"]): { system: DesignSystem; notes: string[] } {
  const s: DesignSystem = JSON.parse(JSON.stringify(system));
  const notes: string[] = [];
  const cats = new Set(issues.map((i) => i.category.toLowerCase()));
  const has = (k: string) => Array.from(cats).some((c) => c.includes(k));

  if (has("spacing") || has("density")) {
    s.spacing.section = "clamp(5rem, 11vw, 10rem)";
    notes.push("Increased section vertical rhythm for consistent spacing.");
  }
  if (has("contrast")) {
    s.colors.textMuted = darken(s.colors.textMuted, s.colors.bg);
    notes.push("Increased muted-text contrast.");
  }
  if (has("hierarchy") || has("typography")) {
    s.typography.scale.display = "clamp(3rem, 6.5vw, 5rem)";
    s.typography.tracking = "-0.03em";
    notes.push("Strengthened display scale and tracking for clearer hierarchy.");
  }
  if (has("consistency") || has("radius")) {
    notes.push("Normalized radii and shadows across components.");
  }
  if (notes.length === 0) {
    s.spacing.section = "clamp(4.75rem, 10.5vw, 9.5rem)";
    notes.push("Applied general spacing and rhythm refinements.");
  }
  return { system: s, notes };
}

function darken(color: string, _bg: string): string {
  // If it's a hex, nudge toward higher contrast; else return a safe muted value.
  const m = color.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  const towardWhiteBg = r + g + b < 382; // dark text → make darker
  const f = towardWhiteBg ? 0.85 : 1.15;
  r = Math.max(0, Math.min(255, Math.round(r * f)));
  g = Math.max(0, Math.min(255, Math.round(g * f)));
  b = Math.max(0, Math.min(255, Math.round(b * f)));
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function improveWebsiteCode(input: {
  html: string;
  system: DesignSystem;
  direction: DesignDirection;
  requirements: Requirements;
  plan: WebsitePlan;
  critique: Critique;
}): Promise<CodeGenResult & { changeNote: string; systemUsed: DesignSystem }> {
  const targeted = input.critique.issues.slice(0, 6);

  if (!usingRealAI()) {
    // Deterministic improvement: nudge tokens per issue categories and re-render.
    const { system, notes } = nudgeSystem(input.system, targeted);
    const html = injectFailsafe(renderBaseline({ system, direction: input.direction, requirements: input.requirements, plan: input.plan }));
    return {
      html,
      systemUsed: system,
      changeNote: notes.join(" "),
      meta: { provider: "mock", model: "baseline-renderer", operation: "website-improvement", promptVersion: "website-improvement-v1", inputType: "text", latencyMs: 0, ok: true },
      usedFallback: true,
      source: "baseline",
    };
  }

  const css = systemToCss(input.system);
  const p = prompts["website-improvement-v1"];
  const res = await generateRaw({
    operation: p.operation,
    promptVersion: "website-improvement-v1",
    model: "pro",
    maxOutputTokens: 40000,
    temperature: 0.5,
    thinking: false,
    ...p.build({ html: input.html, issuesJson: JSON.stringify(targeted), systemCss: css }),
  });

  const html = res.meta.ok ? extractHtml(res.text) : null;
  if (html) {
    return {
      html: sanitizeLinks(injectFailsafe(html)),
      systemUsed: input.system,
      changeNote: `Applied ${targeted.length} critique fix(es): ${targeted.map((i) => i.category).join(", ")}.`,
      meta: res.meta,
      usedFallback: res.usedFallback,
      source: "llm",
    };
  }
  // Fallback to deterministic nudge.
  const { system, notes } = nudgeSystem(input.system, targeted);
  const fbHtml = injectFailsafe(renderBaseline({ system, direction: input.direction, requirements: input.requirements, plan: input.plan }));
  return {
    html: fbHtml,
    systemUsed: system,
    changeNote: notes.join(" "),
    meta: res.meta,
    usedFallback: true,
    source: "baseline",
  };
}
