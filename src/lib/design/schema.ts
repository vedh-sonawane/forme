import { z } from "zod";

// Lenient schemas: real model output is sometimes slightly off-shape, so we default
// generously rather than reject. These are the canonical structured representations
// stored (as JSON strings) throughout FORME.

const str = z.string().default("");
const strArr = z.array(z.string()).default([]);

// ── DESIGN DNA PROFILE ───────────────────────────────────────────────────────
export const ColorSwatch = z.object({
  name: str,
  hex: z.string().default("#000000"),
  role: str, // background | text | primary | accent | ...
});

export const DesignDNASchema = z.object({
  style: z
    .object({
      primary_style: str,
      secondary_styles: strArr,
      mood: strArr,
      visual_personality: str,
      design_category: str,
      industry: str,
      target_audience: str,
      perceived_quality: z.number().min(0).max(100).default(70),
    })
    .default({}),
  typography: z
    .object({
      heading_style: str,
      body_style: str,
      hierarchy: str,
      scale: str,
      font_characteristics: str,
      sizes_note: str,
    })
    .default({}),
  layout: z
    .object({
      structure: str,
      grid: str,
      spacing: str,
      density: str,
      composition: str,
      balance: str,
      symmetry: str,
    })
    .default({}),
  color: z
    .object({
      palette: z.array(ColorSwatch).default([]),
      contrast: str,
      accent_usage: str,
    })
    .default({}),
  components: z
    .object({
      navigation: str,
      hero: str,
      cta: str,
      cards: str,
      buttons: str,
      border_radius: str,
      shadows: str,
    })
    .default({}),
  imagery: z
    .object({ style: str, illustration: str, iconography: str })
    .default({}),
  motion: z.object({ characteristics: str, intensity: str }).default({}),
  visual_hierarchy: z
    .object({ description: str, focal_points: strArr })
    .default({}),
  responsive: z.object({ behavior: str }).default({}),
  information_density: str,
  design_principles: strArr,
  strengths: strArr,
  weaknesses: strArr,
});
export type DesignDNA = z.infer<typeof DesignDNASchema>;

// ── DESIGN DIRECTION ──────────────────────────────────────────────────────────
export const DesignDirectionSchema = z.object({
  visual_concept: str,
  design_personality: strArr,
  typography_direction: str,
  color_direction: str,
  layout_direction: str,
  component_direction: str,
  imagery_direction: str,
  motion_direction: str,
  avoid: strArr,
  rationale: str,
});
export type DesignDirection = z.infer<typeof DesignDirectionSchema>;

// ── DESIGN SYSTEM (tokens) ─────────────────────────────────────────────────────
export const DesignSystemSchema = z.object({
  colors: z
    .object({
      bg: z.string().default("#ffffff"),
      surface: z.string().default("#f7f7f8"),
      surfaceAlt: z.string().default("#eef0f3"),
      text: z.string().default("#0b0d12"),
      textMuted: z.string().default("#565b66"),
      border: z.string().default("#e3e6eb"),
      primary: z.string().default("#3d5afe"),
      primaryText: z.string().default("#ffffff"),
      accent: z.string().default("#00c2a8"),
    })
    .default({}),
  typography: z
    .object({
      fontHeading: z.string().default("'Inter', system-ui, sans-serif"),
      fontBody: z.string().default("'Inter', system-ui, sans-serif"),
      weightHeading: z.number().default(700),
      weightBody: z.number().default(400),
      scale: z
        .object({
          display: z.string().default("clamp(2.6rem, 5vw, 4.2rem)"),
          h1: z.string().default("clamp(2rem, 3.5vw, 3rem)"),
          h2: z.string().default("clamp(1.5rem, 2.5vw, 2.1rem)"),
          h3: z.string().default("1.35rem"),
          body: z.string().default("1.05rem"),
          small: z.string().default("0.875rem"),
        })
        .default({}),
      tracking: z.string().default("-0.01em"),
      lineHeight: z.string().default("1.6"),
    })
    .default({}),
  spacing: z
    .object({
      unit: z.number().default(8),
      section: z.string().default("clamp(4rem, 9vw, 8rem)"),
      container: z.string().default("1200px"),
    })
    .default({}),
  radius: z
    .object({
      sm: z.string().default("8px"),
      md: z.string().default("14px"),
      lg: z.string().default("22px"),
      pill: z.string().default("999px"),
    })
    .default({}),
  shadow: z
    .object({
      sm: z.string().default("0 1px 2px rgba(10,12,20,0.06)"),
      md: z.string().default("0 8px 30px rgba(10,12,20,0.10)"),
      lg: z.string().default("0 30px 60px rgba(10,12,20,0.16)"),
    })
    .default({}),
  motion: z
    .object({
      easing: z.string().default("cubic-bezier(0.16, 1, 0.3, 1)"),
      durationMs: z.number().default(500),
    })
    .default({}),
});
export type DesignSystem = z.infer<typeof DesignSystemSchema>;

// ── WEBSITE PLAN (architecture) ─────────────────────────────────────────────────
export const WebsitePlanSchema = z.object({
  pages: z
    .array(
      z.object({
        name: str,
        path: z.string().default("/"),
        sections: z
          .array(z.object({ type: str, purpose: str, note: str }))
          .default([]),
      })
    )
    .default([]),
  components: strArr,
  navigation: strArr,
});
export type WebsitePlan = z.infer<typeof WebsitePlanSchema>;

// ── REQUIREMENTS ────────────────────────────────────────────────────────────────
export const RequirementsSchema = z.object({
  business: str,
  product: str,
  industry: str,
  target_audience: str,
  goals: strArr,
  tone: strArr,
  pages: strArr,
  functionality: strArr,
  brand_colors: strArr,
  must_include: strArr,
  constraints: strArr,
});
export type Requirements = z.infer<typeof RequirementsSchema>;

// ── CRITIQUE ─────────────────────────────────────────────────────────────────────
export const CritiqueIssue = z.object({
  category: str, // spacing | hierarchy | typography | color | contrast | ...
  severity: z.enum(["low", "medium", "high"]).catch("medium"),
  description: str,
  suggested_fix: str,
});

export const CritiqueSchema = z.object({
  overall_score: z.number().min(0).max(100).default(70),
  dimensions: z
    .array(z.object({ name: str, score: z.number().min(0).max(100).default(70), note: str }))
    .default([]),
  issues: z.array(CritiqueIssue).default([]),
  strengths: strArr,
  improvements: strArr,
});
export type Critique = z.infer<typeof CritiqueSchema>;

// ── QUALITY EVALUATION (multi-dimensional) ───────────────────────────────────────
export const QualityEvalSchema = z.object({
  dimensions: z
    .array(z.object({ name: str, score: z.number().min(0).max(100).default(70), explanation: str }))
    .default([]),
  overall: z.number().min(0).max(100).default(70),
  verdict: str,
});
export type QualityEval = z.infer<typeof QualityEvalSchema>;

// Registry of schemas by operation, for the structured() helper + docs.
export const Schemas = {
  DesignDNASchema,
  DesignDirectionSchema,
  DesignSystemSchema,
  WebsitePlanSchema,
  RequirementsSchema,
  CritiqueSchema,
  QualityEvalSchema,
};
