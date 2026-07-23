import type { AiProvider, GenerateOptions, GenerateResult } from "./types";

// Clearly-marked development fallback provider.
// Produces DETERMINISTIC, schema-valid JSON for every structured operation so the
// full FORME pipeline runs end-to-end with no API key. It is seeded by a hash of the
// input, so different inputs yield different-but-stable outputs. This is NOT a
// simulation of the real model's quality — it is a functional stand-in, and every
// output it produces is surfaced in the UI as "development fallback".

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

const pick = <T,>(arr: T[], r: number) => arr[Math.floor(r * arr.length) % arr.length];

const PALETTES = [
  { bg: "#0a0b0f", surface: "#12141c", surfaceAlt: "#1a1d29", text: "#f4f6fb", textMuted: "#9aa3b2", border: "#242838", primary: "#6366f1", primaryText: "#ffffff", accent: "#22d3ee" },
  { bg: "#ffffff", surface: "#f7f8fa", surfaceAlt: "#eef1f6", text: "#0b0d12", textMuted: "#5b616e", border: "#e4e8ef", primary: "#111827", primaryText: "#ffffff", accent: "#f97316" },
  { bg: "#fbfaf7", surface: "#f3f0e9", surfaceAlt: "#e9e4d8", text: "#1c1a17", textMuted: "#6b6459", border: "#ded7c7", primary: "#8b5cf6", primaryText: "#ffffff", accent: "#059669" },
  { bg: "#05070d", surface: "#0d1117", surfaceAlt: "#161b22", text: "#e6edf3", textMuted: "#8b949e", border: "#21262d", primary: "#2dd4bf", primaryText: "#04110f", accent: "#f472b6" },
];

const STYLES = ["modern minimal", "editorial", "bold brutalist", "refined luxury", "playful", "futuristic tech", "clean corporate"];
const MOODS = ["confident", "calm", "energetic", "premium", "trustworthy", "innovative", "approachable"];
const FONTS = [
  { h: "'Space Grotesk', system-ui, sans-serif", b: "'Inter', system-ui, sans-serif" },
  { h: "'Fraunces', Georgia, serif", b: "'Inter', system-ui, sans-serif" },
  { h: "'Sora', system-ui, sans-serif", b: "'Sora', system-ui, sans-serif" },
  { h: "'Clash Display', system-ui, sans-serif", b: "'General Sans', system-ui, sans-serif" },
];

function designDNA(seed: number) {
  const r = rng(seed);
  const pal = pick(PALETTES, r());
  const dark = pal.bg.startsWith("#0") || pal.bg.startsWith("#05");
  return {
    style: {
      primary_style: pick(STYLES, r()),
      secondary_styles: [pick(STYLES, r()), pick(STYLES, r())],
      mood: [pick(MOODS, r()), pick(MOODS, r())],
      visual_personality: "Deliberate, high-contrast composition with generous negative space and a clear focal path.",
      design_category: pick(["SaaS landing", "product marketing", "portfolio", "editorial", "e-commerce"], r()),
      industry: pick(["technology", "AI", "finance", "creative", "healthcare"], r()),
      target_audience: "Design-literate professionals evaluating a premium product.",
      perceived_quality: 68 + Math.floor(r() * 22),
    },
    typography: {
      heading_style: "Large, tightly-tracked display headings with strong weight contrast.",
      body_style: "Comfortable 16–18px body with 1.6 line-height for readability.",
      hierarchy: "3–4 distinct levels; dramatic jump from display to body.",
      scale: "Roughly 1.25–1.333 modular scale.",
      font_characteristics: "Geometric sans for headings, humanist sans for body.",
      sizes_note: "Display ~64px desktop, H2 ~34px, body ~17px.",
    },
    layout: {
      structure: "Single-column narrative with full-bleed hero and centered content max-width ~1200px.",
      grid: "12-column responsive grid, generous gutters.",
      spacing: "Consistent 8px spacing system; large section padding.",
      density: pick(["airy", "balanced", "compact"], r()),
      composition: "Z-pattern hero, alternating feature rows.",
      balance: "Asymmetric hero balanced by symmetric feature grid.",
      symmetry: pick(["asymmetric", "symmetric"], r()),
    },
    color: {
      palette: [
        { name: "background", hex: pal.bg, role: "background" },
        { name: "text", hex: pal.text, role: "text" },
        { name: "primary", hex: pal.primary, role: "primary" },
        { name: "accent", hex: pal.accent, role: "accent" },
        { name: "muted", hex: pal.textMuted, role: "muted" },
      ],
      contrast: dark ? "High contrast on dark canvas." : "Crisp high contrast on light canvas.",
      accent_usage: "Accent reserved for primary CTAs and key highlights only.",
    },
    components: {
      navigation: "Slim sticky top nav, logo left, links center/right, single primary CTA.",
      hero: "Oversized headline, one-line subhead, dual CTA, supporting visual.",
      cta: "High-contrast pill buttons with clear primary/secondary distinction.",
      cards: "Soft-radius cards with subtle border and low shadow.",
      buttons: "Pill radius, medium weight label, hover lift.",
      border_radius: pick(["small (8px)", "medium (14px)", "large (22px)"], r()),
      shadows: "Low, diffuse shadows for depth without heaviness.",
    },
    imagery: {
      style: "Abstract 3D/gradient hero visuals, product UI mockups.",
      illustration: "Minimal line + gradient accents.",
      iconography: "Consistent 1.5px stroke line icons.",
    },
    motion: { characteristics: "Subtle fade-and-rise on scroll, hover micro-interactions.", intensity: pick(["subtle", "moderate"], r()) },
    visual_hierarchy: {
      description: "Eye lands on headline → CTA → supporting proof.",
      focal_points: ["hero headline", "primary CTA", "social proof row"],
    },
    responsive: { behavior: "Fluid type via clamp(); nav collapses to menu; grids reflow to single column on mobile." },
    information_density: pick(["low", "medium"], r()),
    design_principles: [
      "Establish one clear focal path per screen.",
      "Reserve accent color for a single primary action.",
      "Use a consistent 8px spacing rhythm.",
      "Let negative space carry the premium feel.",
    ],
    strengths: ["Clear hierarchy", "Restrained, confident color use", "Consistent spacing rhythm"],
    weaknesses: ["Hero could show more product proof", "Secondary CTA competes with primary", "Mobile density slightly high"],
  };
}

function designDirection(seed: number) {
  const r = rng(seed);
  return {
    visual_concept: "A calm, confident, high-contrast interface that feels engineered and premium — restraint over decoration.",
    design_personality: [pick(MOODS, r()), pick(MOODS, r()), "intentional"],
    typography_direction: "Geometric display sans for headlines with tight tracking; humanist sans for body. Big display-to-body jump.",
    color_direction: "Near-neutral canvas with a single saturated primary and one cool accent used sparingly.",
    layout_direction: "Narrative single-column with full-bleed hero, alternating feature rows, and a strong closing CTA band.",
    component_direction: "Pill buttons, soft-radius bordered cards, slim sticky nav, low diffuse shadows.",
    imagery_direction: "Abstract gradient/3D hero visual plus crisp product UI mockups; avoid generic stock photos.",
    motion_direction: "Subtle fade-and-rise reveals on scroll and gentle hover lifts; nothing bouncy.",
    avoid: ["generic stock imagery", "rainbow gradients", "competing CTAs", "cramped spacing", "center-everything monotony"],
    rationale: "Synthesizes the references' clarity and restraint while giving the brand a distinct, ownable accent and rhythm.",
  };
}

function designSystem(seed: number) {
  const r = rng(seed);
  const pal = pick(PALETTES, r());
  const font = pick(FONTS, r());
  return {
    colors: pal,
    typography: {
      fontHeading: font.h,
      fontBody: font.b,
      weightHeading: pick([600, 700, 800], r()),
      weightBody: 400,
      scale: {
        display: "clamp(2.8rem, 6vw, 4.6rem)",
        h1: "clamp(2.1rem, 4vw, 3.1rem)",
        h2: "clamp(1.6rem, 2.6vw, 2.2rem)",
        h3: "1.35rem",
        body: "1.06rem",
        small: "0.875rem",
      },
      tracking: "-0.02em",
      lineHeight: "1.6",
    },
    spacing: { unit: 8, section: "clamp(4.5rem, 10vw, 9rem)", container: "1180px" },
    radius: { sm: "8px", md: "14px", lg: "22px", pill: "999px" },
    shadow: {
      sm: "0 1px 2px rgba(0,0,0,0.06)",
      md: "0 10px 34px rgba(0,0,0,0.12)",
      lg: "0 30px 70px rgba(0,0,0,0.20)",
    },
    motion: { easing: "cubic-bezier(0.16, 1, 0.3, 1)", durationMs: 520 },
  };
}

function requirements(userText: string) {
  return {
    business: userText.slice(0, 160),
    product: "",
    industry: "technology",
    target_audience: "early adopters and decision-makers",
    goals: ["communicate value clearly", "drive sign-ups", "establish credibility"],
    tone: ["confident", "clear", "modern"],
    pages: ["Home"],
    functionality: ["hero", "features", "social proof", "pricing", "CTA"],
    brand_colors: [],
    must_include: [],
    constraints: [],
  };
}

function websitePlan() {
  return {
    pages: [
      {
        name: "Home",
        path: "/",
        sections: [
          { type: "nav", purpose: "wayfinding + primary CTA", note: "sticky, slim" },
          { type: "hero", purpose: "value proposition", note: "headline + dual CTA + visual" },
          { type: "logos", purpose: "social proof", note: "trusted-by row" },
          { type: "features", purpose: "explain benefits", note: "3-up alternating rows" },
          { type: "showcase", purpose: "product proof", note: "UI mockup" },
          { type: "metrics", purpose: "credibility", note: "3 key numbers" },
          { type: "testimonial", purpose: "trust", note: "single strong quote" },
          { type: "pricing", purpose: "conversion", note: "3 tiers" },
          { type: "cta", purpose: "final conversion", note: "full-width band" },
          { type: "footer", purpose: "navigation + legal", note: "multi-column" },
        ],
      },
    ],
    components: ["Button", "Nav", "Card", "Section", "Badge", "Metric", "PricingTier", "Footer"],
    navigation: ["Features", "Showcase", "Pricing", "Contact"],
  };
}

function critique(seed: number) {
  const r = rng(seed);
  const base = 70 + Math.floor(r() * 16);
  const dims = ["visual hierarchy", "spacing", "alignment", "typography", "color harmony", "contrast", "consistency", "composition", "responsiveness", "originality", "clarity of CTA", "accessibility"];
  return {
    overall_score: base,
    dimensions: dims.map((name, i) => ({ name, score: Math.max(40, Math.min(96, base + Math.floor((rng(seed + i)() - 0.5) * 26))), note: "" })),
    issues: [
      { category: "spacing", severity: "medium", description: "Section padding is slightly inconsistent between the features and pricing blocks.", suggested_fix: "Normalize all top-level sections to the same vertical rhythm token (section spacing)." },
      { category: "hierarchy", severity: "low", description: "Secondary CTA has nearly equal weight to the primary, diluting focus.", suggested_fix: "Demote the secondary CTA to a ghost/outline style." },
      { category: "contrast", severity: "low", description: "Muted body text on surface panels is near the low end of comfortable contrast.", suggested_fix: "Darken muted text by ~8% or lighten the surface." },
    ],
    strengths: ["Clear focal path in the hero", "Consistent radius + shadow language", "Restrained, confident color use"],
    improvements: ["Unify section vertical rhythm", "Strengthen primary/secondary CTA distinction", "Add one concrete proof metric to the hero"],
  };
}

function qualityEval(seed: number) {
  const r = rng(seed);
  const base = 72 + Math.floor(r() * 14);
  const dims = ["visual quality", "usability", "accessibility", "responsiveness", "consistency", "originality", "requirement alignment", "DNA alignment", "technical quality"];
  return {
    dimensions: dims.map((name, i) => ({ name, score: Math.max(45, Math.min(95, base + Math.floor((rng(seed + i * 7)() - 0.5) * 22))), explanation: "Automated development-fallback estimate." })),
    overall: base,
    verdict: "Solid, coherent baseline. Aesthetic quality is inherently subjective — treat this as one signal, not ground truth.",
  };
}

export class MockProvider implements AiProvider {
  readonly name = "mock";

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const seed = hash(opts.operation + "::" + opts.user + "::" + (opts.images?.length ?? 0));
    let payload: unknown = { note: "development fallback", operation: opts.operation };

    switch (opts.operation) {
      case "reference-analysis":
      case "screenshot-analysis":
      case "dna-synthesis":
        payload = designDNA(seed);
        break;
      case "requirement-analysis":
        payload = requirements(opts.user);
        break;
      case "design-direction":
        payload = designDirection(seed);
        break;
      case "design-system":
        payload = designSystem(seed);
        break;
      case "website-architecture":
        payload = websitePlan();
        break;
      case "visual-critique":
        payload = critique(seed);
        break;
      case "quality-eval":
        payload = qualityEval(seed);
        break;
      default:
        payload = { note: "development fallback", operation: opts.operation };
    }

    // Simulate a tiny latency band deterministically (no Date.random needed).
    const latencyMs = 40 + (seed % 60);
    return {
      text: opts.json ? JSON.stringify(payload) : String((payload as { note?: string }).note ?? ""),
      meta: {
        provider: this.name,
        model: "mock",
        operation: opts.operation,
        promptVersion: opts.promptVersion,
        inputType: opts.images?.length ? "vision" : "text",
        inputTokens: Math.ceil(opts.user.length / 4),
        outputTokens: 200,
        latencyMs,
        ok: true,
      },
    };
  }
}
