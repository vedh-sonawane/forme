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

/** The last page-level override of a custom property in the AI's CSS, if any. */
export function effectiveToken(css: string, name: string): RGB | null {
  let found: RGB | null = null;
  const decl = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, "gi");
  for (const rule of (css || "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = rule[1].toLowerCase();
    if (!selector.split(",").some((s) => /^\s*(:root|html|body)\s*$/.test(s))) continue;
    for (const m of rule[2].matchAll(decl)) {
      const c = parseColor(m[1]);
      if (c) found = c;
    }
  }
  return found;
}

/**
 * The palette the page will ACTUALLY render with. The design system is the starting
 * point; anything the page composition redefines at `:root` wins, because it is applied
 * last. Every repair has to reason about these values — computing an "ink" from the
 * original purple is useless when the CSS has since repainted --primary navy.
 */
export function effectiveColors(css: string, s: DesignSystem): DesignSystem["colors"] {
  const of = (name: string, fallback: string) => {
    const c = effectiveToken(css, name);
    return c ? hex(c) : fallback;
  };
  const painted = effectiveBackground(css);
  return {
    ...s.colors,
    bg: painted ? hex(painted) : of("--bg", s.colors.bg),
    primary: of("--primary", s.colors.primary),
    accent: of("--accent", s.colors.accent),
    surface: of("--surface", s.colors.surface),
    surfaceAlt: of("--surface-alt", s.colors.surfaceAlt),
    text: of("--text", s.colors.text),
  };
}

const hex = (c: RGB) => "#" + c.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/**
 * The foreground that actually reads on `bg`. Keeps the design's own choice when it's
 * legible, otherwise takes whichever of black/white contrasts more.
 */
export function readableOn(bg: RGB, preferred: RGB | null, min = 4.5): RGB {
  if (preferred && contrast(preferred, bg) >= min) return preferred;
  const black: RGB = [17, 17, 17];
  const white: RGB = [255, 255, 255];
  return contrast(black, bg) >= contrast(white, bg) ? black : white;
}

/**
 * A brand colour darkened (or lightened) just far enough to be readable AS TEXT on the
 * page background. Mid-tone brand colours — a #4EAE8E green, a #FF7A00 orange — look
 * right as a button fill and fail badly as body text, so text gets its own "ink" variant
 * while fills keep the vivid original.
 */
export function inkFor(colorHex: string, bgHex: string, min = 4.5): string {
  const c = parseColor(colorHex);
  const bg = parseColor(bgHex);
  if (!c || !bg) return colorHex;
  if (contrast(c, bg) >= min) return colorHex;
  const toward: RGB = luminance(bg) > 0.4 ? [0, 0, 0] : [255, 255, 255];
  for (let t = 0.1; t <= 1; t += 0.1) {
    const candidate = mix(c, toward, t);
    if (contrast(candidate, bg) >= min) return hex(candidate);
  }
  return hex(toward);
}

/** Brand-colour text variants, emitted alongside the palette so every page can use them. */
export function inkTokens(s: DesignSystem, palette: DesignSystem["colors"] = s.colors): string {
  return `  --primary-ink: ${inkFor(palette.primary, palette.bg)};
  --accent-ink: ${inkFor(palette.accent, palette.bg)};
  --primary-text: ${hex(readableOn(parseColor(palette.primary) ?? [0, 0, 0], parseColor(palette.primaryText)))};`;
}

/**
 * Brand colours used as TEXT are switched to their readable ink variant. Only the `color`
 * property is touched — fills, borders and gradients keep the vivid original, so the
 * design still looks like itself.
 */
export function useInkForText(css: string): string {
  return (css || "")
    .replace(/([^-\w])color\s*:\s*var\(\s*--primary\s*\)/gi, "$1color:var(--primary-ink)")
    .replace(/([^-\w])color\s*:\s*var\(\s*--accent\s*\)/gi, "$1color:var(--accent-ink)");
}

/**
 * Repair rules that set BOTH a background and a text colour but pair them unreadably —
 * `.btn-primary { background: var(--primary); color: white }` on a mid-tone orange being
 * the canonical example. A literal `color: white` beats any token override, so the
 * declaration itself has to change.
 *
 * Scope is deliberately one rule at a time: the background is stated right there, so no
 * cross-rule cascade reasoning is involved, and the test is a defect ("this text can't be
 * read on the surface it is painted on"), not a matter of taste.
 */
export function repairRuleContrast(css: string, s: DesignSystem): string {
  const p = effectiveColors(css, s);
  const token: Record<string, string> = {
    "--primary": p.primary,
    "--accent": p.accent,
    "--surface": p.surface,
    "--surface-alt": p.surfaceAlt,
    "--bg": p.bg,
    "--text": p.text,
    "--primary-text": p.primaryText,
  };
  const resolve = (raw: string): RGB | null => {
    const v = (raw || "").trim().toLowerCase();
    const varMatch = v.match(/^var\(\s*(--[a-z-]+)\s*\)$/);
    if (varMatch) return token[varMatch[1]] ? parseColor(token[varMatch[1]]) : null;
    if (/gradient|url\(|inherit|transparent|currentcolor|none/.test(v)) return null;
    return parseColor(v);
  };

  return (css || "").replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selector: string, body: string) => {
    const bgDecl = [...body.matchAll(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/gi)].pop();
    const fgDecl = [...body.matchAll(/(?:^|;)\s*color\s*:\s*([^;]+)/gi)].pop();
    if (!bgDecl || !fgDecl) return rule;

    const bg = resolve(bgDecl[1]);
    const fg = resolve(fgDecl[1]);
    if (!bg || !fg || contrast(fg, bg) >= 4.5) return rule;

    const fixed = hex(readableOn(bg, fg));
    const repaired = body.replace(fgDecl[0], fgDecl[0].replace(fgDecl[1], ` ${fixed}`));
    return `${selector}{${repaired}}`;
  });
}

/**
 * A final `:root` block that repairs the token palette when the painted background has
 * flipped polarity. Returns "" when the design is already coherent — a correct design is
 * never touched.
 */
export function reconcileTokens(customCss: string, s: DesignSystem): string {
  const painted = effectiveBackground(customCss);
  const tokenBg = parseColor(s.colors.bg);
  const tokenText = parseColor(s.colors.text);
  // The ink variants and the on-primary foreground are re-stated AFTER the page CSS,
  // because that CSS is appended last and will happily redefine --primary-text to white
  // on a mid-tone brand colour. Restating them is what makes the repair actually apply.
  const inks = `:root{\n${inkTokens(s, effectiveColors(customCss, s))}\n}`;

  if (!painted || !tokenBg || !tokenText) return inks;

  // Beyond that, only intervene on a genuine light↔dark flip: that is the case where
  // token-driven colours become unreadable. Subtle background tweaks are the designer's.
  const flipped = Math.abs(luminance(painted) - luminance(tokenBg)) > 0.25;
  const unreadable = contrast(tokenText, painted) < 4.5;
  if (!flipped || !unreadable) return inks;

  const dark = luminance(painted) < 0.4;
  // Prefer the project's own opposite colour so the brand survives the repair; fall back
  // to near-white / near-black only if that would still be unreadable.
  const candidate: RGB = tokenBg;
  const text: RGB = contrast(candidate, painted) >= 7 ? candidate : dark ? [244, 246, 248] : [20, 23, 26];

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
${inkTokens(s, effectiveColors(customCss, s))}
}
`.trim();
}
