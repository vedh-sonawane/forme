import type { DesignSystem } from "@/lib/design/schema";

// A real design-token system: full 50–950 scales derived from the project's palette,
// plus semantic colours, a typographic scale, spacing rhythm, radii, elevation and
// motion curves. Every page consumes THESE tokens, which is what makes the whole
// product feel like one design system instead of a set of unrelated pages.

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || "").replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const toHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((x) => clamp(x).toString(16).padStart(2, "0")).join("");

/** Perceptually-reasonable 50→950 ramp around a base colour. */
export function scale(hex: string): Record<number, string> {
  const [r, g, b] = hexToRgb(hex);
  const steps: Record<number, string> = {};
  const stops: [number, number][] = [
    [50, 0.94], [100, 0.86], [200, 0.7], [300, 0.52], [400, 0.28],
    [500, 0], [600, -0.14], [700, -0.28], [800, -0.42], [900, -0.56], [950, -0.68],
  ];
  for (const [stop, amt] of stops) {
    steps[stop] = amt >= 0
      ? toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt) // tint
      : toHex(r * (1 + amt), g * (1 + amt), b * (1 + amt)); // shade
  }
  return steps;
}

const ramp = (name: string, hex: string) =>
  Object.entries(scale(hex))
    .map(([k, v]) => `  --${name}-${k}: ${v};`)
    .join("\n");

/** The token layer — emitted once, imported by every page. */
export function tokenCss(s: DesignSystem): string {
  const c = s.colors;
  return `/* ── Design tokens — one system, used by every page ───────────────────── */
:root{
${ramp("primary", c.primary)}
${ramp("accent", c.accent)}
${ramp("neutral", c.textMuted)}

  /* semantic */
  --success: #16a34a; --success-soft: #dcfce7;
  --warning: #d97706; --warning-soft: #fef3c7;
  --danger:  #dc2626; --danger-soft:  #fee2e2;
  --info:    #2563eb; --info-soft:    #dbeafe;

  /* surfaces */
  --bg: ${c.bg};
  --surface: ${c.surface};
  --surface-alt: ${c.surfaceAlt};
  --border: ${c.border};
  --text: ${c.text};
  --text-muted: ${c.textMuted};
  --primary: ${c.primary};
  --primary-text: ${c.primaryText};
  --accent: ${c.accent};

  /* typography */
  --font-heading: ${s.typography.fontHeading};
  --font-body: ${s.typography.fontBody};
  --fs-xs: .78rem; --fs-sm: .88rem; --fs-base: 1rem;
  --fs-lg: 1.15rem; --fs-xl: 1.4rem;
  --fs-2xl: clamp(1.6rem, 2.4vw, 2.1rem);
  --fs-3xl: clamp(2rem, 3.4vw, 3rem);
  --fs-4xl: clamp(2.6rem, 5vw, 4.2rem);
  --fs-5xl: clamp(3.2rem, 8vw, 6.5rem);
  --lh-tight: 1.04; --lh-snug: 1.25; --lh-normal: 1.6;

  /* spacing rhythm (8pt) */
  --s-1: .25rem; --s-2: .5rem; --s-3: .75rem; --s-4: 1rem; --s-6: 1.5rem;
  --s-8: 2rem; --s-12: 3rem; --s-16: 4rem; --s-24: 6rem; --s-32: 8rem;
  --section: clamp(3.5rem, 9vw, 7rem);
  --container: 1180px;

  /* shape + elevation */
  --r-sm: ${s.radius.sm}; --r-md: ${s.radius.md}; --r-lg: ${s.radius.lg}; --r-pill: ${s.radius.pill};
  --e-1: 0 1px 2px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.05);
  --e-2: 0 4px 12px -2px rgba(0,0,0,.08), 0 2px 6px -2px rgba(0,0,0,.06);
  --e-3: 0 12px 32px -8px rgba(0,0,0,.14), 0 4px 12px -4px rgba(0,0,0,.08);
  --e-4: 0 28px 64px -16px rgba(0,0,0,.22), 0 8px 20px -8px rgba(0,0,0,.12);
  --glass: color-mix(in srgb, var(--surface) 60%, transparent);
  --glass-brd: color-mix(in srgb, var(--text) 10%, transparent);

  /* motion — one timing language everywhere */
  --ease: ${s.motion.easing};
  --ease-out: cubic-bezier(.16,1,.3,1);
  --ease-spring: cubic-bezier(.34,1.56,.64,1);
  --t-fast: 180ms; --t-base: ${s.motion.durationMs}ms; --t-slow: 900ms;
}`;
}
