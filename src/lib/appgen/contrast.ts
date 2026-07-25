import type { DesignSystem } from "@/lib/design/schema";

// The AI's page CSS is appended AFTER the design system, so it is free to repaint the
// page — and it often does, giving a light-palette project a dark cinematic background.
// What it does NOT reliably do is update --text / --text-muted / --border to match. Every
// element that trusts those tokens (ghost buttons, labels, inputs, card copy) then keeps
// colours meant for the old background; in the worst case they render at ~1:1 contrast,
// i.e. invisible.
//
// A prompt can ask the model to keep them in sync, but it can't guarantee it. So the
// generator measures the background the page will ACTUALLY paint and, when that flips
// polarity against the tokens, re-derives the readable set deterministically. The brand
// hues are preserved — only the light/dark relationships are repaired.

type RGB = [number, number, number];

const NAMED: Record<string, RGB> = {
  black: [0, 0, 0], white: [255, 255, 255], transparent: [0, 0, 0],
};

function parseColor(raw: string): RGB | null {
  const v = (raw || "").trim().toLowerCase();
  if (!v) return null;
  if (NAMED[v] && v !== "transparent") return NAMED[v];

  const hex = v.match(/#([0-9a-f]{3,8})\b/i);
  if (hex) {
    const h = hex[1];
    const full = h.length === 3 || h.length === 4 ? h.slice(0, 3).split("").map((c) => c + c).join("") : h.slice(0, 6);
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = v.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

const channel = (c: number) => {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};

/** WCAG relative luminance, 0 (black) → 1 (white). */
export function luminance(rgb: RGB): number {
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

/** WCAG contrast ratio between two colours, 1 → 21. */
export function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The background the page ends up painting, according to the AI's own CSS: the last
 * `background`/`background-color`/`--bg` declaration on html, body or :root. Gradients
 * resolve to their first colour stop, which is all we need to judge light vs dark.
 */
export function effectiveBackground(css: string): RGB | null {
  let found: RGB | null = null;
  for (const rule of (css || "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = rule[1].toLowerCase();
    const targetsPage = selector
      .split(",")
      .some((s) => /^\s*(html|body|:root)(\s*,|\s*$)/.test(s) || /^\s*html\s+body\s*$/.test(s));
    if (!targetsPage) continue;
    const body = rule[2];
    for (const decl of body.matchAll(/(?:^|;)\s*(--bg|background-color|background)\s*:\s*([^;]+)/gi)) {
      const c = parseColor(decl[2]);
      if (c) found = c;
    }
  }
  return found;
}

/**
 * A final `:root` block that repairs the token palette when the painted background has
 * flipped polarity. Returns "" when the design is already coherent — a correct design is
 * never touched.
 */
export function reconcileTokens(customCss: string, s: DesignSystem): string {
  const painted = effectiveBackground(customCss);
  if (!painted) return "";

  const tokenBg = parseColor(s.colors.bg);
  const tokenText = parseColor(s.colors.text);
  if (!tokenBg || !tokenText) return "";

  // Only intervene on a genuine light↔dark flip: that is the case where token-driven
  // colours become unreadable. Subtle background tweaks are left to the designer.
  const flipped = Math.abs(luminance(painted) - luminance(tokenBg)) > 0.25;
  const unreadable = contrast(tokenText, painted) < 4.5;
  if (!flipped || !unreadable) return "";

  const dark = luminance(painted) < 0.4;
  // Prefer the project's own opposite colour so the brand survives the repair; fall back
  // to near-white / near-black only if that would still be unreadable.
  const candidate: RGB = tokenBg;
  const text: RGB = contrast(candidate, painted) >= 7 ? candidate : dark ? [244, 246, 248] : [20, 23, 26];
  const hex = (c: RGB) => "#" + c.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");

  // Surfaces are only re-derived when the AI didn't set them itself.
  const aiSetSurface = /--surface\s*:/i.test(customCss);
  const surfaces = aiSetSurface
    ? ""
    : `  --surface: color-mix(in srgb, var(--bg) 92%, var(--text));
  --surface-alt: color-mix(in srgb, var(--bg) 85%, var(--text));
`;

  return `
/* ── Contrast reconciliation ─────────────────────────────
   The page composition repainted the background ${dark ? "dark" : "light"}; the palette's
   foreground tokens are re-derived so text, borders and controls stay legible. */
:root{
  --bg: ${hex(painted)};
  --text: ${hex(text)};
  --text-muted: color-mix(in srgb, var(--text) 62%, var(--bg));
  --border: color-mix(in srgb, var(--text) 18%, var(--bg));
${surfaces}  --glass: color-mix(in srgb, var(--surface) 62%, transparent);
}
`.trim();
}
