import { structured, generateRaw, type StructuredResult } from "@/lib/ai/provider";
import { prompts } from "@/lib/prompts/registry";
import type { ImageInput } from "@/lib/ai/types";
import {
  DesignDNASchema,
  DesignDirectionSchema,
  DesignSystemSchema,
  WebsitePlanSchema,
  ScenePlanSchema,
  ApplicationBlueprintSchema,
  AppDesignSpecSchema,
  RequirementsSchema,
  CritiqueSchema,
  QualityEvalSchema,
  type DesignDNA,
  type DesignDirection,
  type DesignSystem,
  type WebsitePlan,
  type ScenePlan,
  type ApplicationBlueprint,
  type AppDesignSpec,
  type Requirements,
  type Critique,
  type QualityEval,
} from "@/lib/design/schema";

// The specialized "agents" of the FORME pipeline. Each is a thin, testable function:
// pick a versioned prompt → call structured() (validation + repair + fallback + logging)
// → return typed data plus AI-call metadata. No agent embeds prompt text directly.

// ── Requirement Analyst ─────────────────────────────────────────────────────────
export async function analyzeRequirements(userRequest: string, extra?: string): Promise<StructuredResult<Requirements>> {
  const p = prompts["requirement-analysis-v1"];
  return structured({ operation: p.operation, promptVersion: "requirement-analysis-v1", model: "flash", ...p.build(userRequest, extra) }, RequirementsSchema);
}

// ── Reference Analyst (URL) ─────────────────────────────────────────────────────
export async function analyzeReference(
  input: { url?: string; structure?: string; htmlSignals?: string },
  images: ImageInput[]
): Promise<StructuredResult<DesignDNA>> {
  const p = prompts["reference-analysis-v1"];
  return structured({ operation: p.operation, promptVersion: "reference-analysis-v1", model: "pro", images, ...p.build(input) }, DesignDNASchema);
}

// ── Reference Analyst (screenshots) ─────────────────────────────────────────────
export async function analyzeScreenshots(
  input: { device?: string; note?: string; count: number },
  images: ImageInput[]
): Promise<StructuredResult<DesignDNA>> {
  const p = prompts["screenshot-analysis-v1"];
  return structured({ operation: p.operation, promptVersion: "screenshot-analysis-v1", model: "pro", images, ...p.build(input) }, DesignDNASchema);
}

// ── Design Intelligence Extractor: synthesize multiple DNA into one ─────────────
export async function synthesizeDNA(profiles: DesignDNA[], intent?: string): Promise<StructuredResult<DesignDNA>> {
  const p = prompts["dna-synthesis-v1"];
  return structured(
    { operation: p.operation, promptVersion: "dna-synthesis-v1", model: "pro", ...p.build({ profilesJson: JSON.stringify(profiles), intent }) },
    DesignDNASchema
  );
}

// ── Design Director ─────────────────────────────────────────────────────────────
export async function generateDirection(requirements: Requirements, dna?: DesignDNA | null): Promise<StructuredResult<DesignDirection>> {
  const p = prompts["design-direction-v1"];
  return structured(
    {
      operation: p.operation,
      promptVersion: "design-direction-v1",
      model: "pro",
      ...p.build({ requirements: JSON.stringify(requirements), dnaJson: dna ? JSON.stringify(dna) : undefined }),
    },
    DesignDirectionSchema
  );
}

// ── Design System Generator ─────────────────────────────────────────────────────
export async function generateDesignSystem(direction: DesignDirection, brandColors?: string[]): Promise<StructuredResult<DesignSystem>> {
  const p = prompts["design-system-v1"];
  return structured(
    { operation: p.operation, promptVersion: "design-system-v1", model: "flash", ...p.build({ directionJson: JSON.stringify(direction), brandColors }) },
    DesignSystemSchema
  );
}

// ── Website Architect ───────────────────────────────────────────────────────────
export async function planWebsite(requirements: Requirements, direction: DesignDirection): Promise<StructuredResult<WebsitePlan>> {
  const p = prompts["website-architecture-v1"];
  return structured(
    { operation: p.operation, promptVersion: "website-architecture-v1", model: "flash", ...p.build({ requirements: JSON.stringify(requirements), directionJson: JSON.stringify(direction) }) },
    WebsitePlanSchema
  );
}

// ── Scene Director: direct the cinematic scroll experience ──────────────────────
export async function planSceneExperience(requirements: Requirements, direction: DesignDirection): Promise<StructuredResult<ScenePlan>> {
  const p = prompts["scene-plan-v1"];
  return structured(
    { operation: p.operation, promptVersion: "scene-plan-v1", model: "pro", maxOutputTokens: 16000, ...p.build({ requirements: JSON.stringify(requirements), directionJson: JSON.stringify(direction) }) },
    ScenePlanSchema
  );
}

// ── App Art Director: gives every IN-APP page its own visual identity ────────────
export async function designApplicationUI(requirements: Requirements, direction: DesignDirection, pages: string): Promise<StructuredResult<AppDesignSpec>> {
  const p = prompts["app-design-v1"];
  return structured(
    { operation: p.operation, promptVersion: "app-design-v1", model: "pro", maxOutputTokens: 12000, ...p.build({ requirements: JSON.stringify(requirements), directionJson: JSON.stringify(direction), pages }) },
    AppDesignSpecSchema
  );
}

// ── Design Assistant: project-aware conversation (free-form, not structured) ─────
export async function askDesignAssistant(input: { context: string; history: string; message: string }) {
  const p = prompts["design-assistant-v1"];
  return generateRaw({
    operation: p.operation,
    promptVersion: "design-assistant-v1",
    model: "flash",
    maxOutputTokens: 2000,
    temperature: 0.6,
    ...p.build(input),
  });
}

// ── Application Architect: plan a full-stack app before generation ──────────────
export async function planApplicationBlueprint(requirements: Requirements, direction?: DesignDirection | null): Promise<StructuredResult<ApplicationBlueprint>> {
  const p = prompts["application-blueprint-v1"];
  return structured(
    { operation: p.operation, promptVersion: "application-blueprint-v1", model: "pro", maxOutputTokens: 16000, ...p.build({ requirements: JSON.stringify(requirements), directionJson: direction ? JSON.stringify(direction) : undefined }) },
    ApplicationBlueprintSchema
  );
}

// ── Visual Critic ───────────────────────────────────────────────────────────────
export async function critiqueWebsite(
  images: ImageInput[],
  ctx: { requirements?: string; directionJson?: string }
): Promise<StructuredResult<Critique>> {
  const p = prompts["visual-critique-v1"];
  return structured({ operation: p.operation, promptVersion: "visual-critique-v1", model: "pro", images, ...p.build(ctx) }, CritiqueSchema);
}

// ── Quality Evaluator ───────────────────────────────────────────────────────────
export async function evaluateQuality(
  images: ImageInput[],
  ctx: { requirements?: string; dnaJson?: string }
): Promise<StructuredResult<QualityEval>> {
  const p = prompts["quality-eval-v1"];
  return structured({ operation: p.operation, promptVersion: "quality-eval-v1", model: "pro", images, ...p.build(ctx) }, QualityEvalSchema);
}
