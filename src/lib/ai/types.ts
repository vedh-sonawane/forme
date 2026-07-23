// Provider-agnostic AI interface. Concrete providers (Gemini, Mock) implement this.
// A higher-level `structured()` helper (see ./structured.ts) adds JSON parsing,
// zod validation, repair-retry, and AiCall logging on top of any provider.

export type ImageInput = {
  mimeType: string;
  /** base64-encoded image bytes (no data: prefix). */
  dataBase64: string;
};

export type ModelTier = "pro" | "flash";

export type GenerateOptions = {
  /** Logical operation name, e.g. "reference-analysis". Used for logging. */
  operation: string;
  /** Named+versioned prompt, e.g. "reference-analysis-v1". */
  promptVersion: string;
  /** System instruction — trusted app instructions only. */
  system: string;
  /** User content. Untrusted website/screenshot data must be clearly delimited here. */
  user: string;
  images?: ImageInput[];
  model?: ModelTier;
  /** Request strict JSON output. */
  json?: boolean;
  maxOutputTokens?: number;
  temperature?: number;
  /** Disable model "thinking" tokens (Gemini 2.5). Use for large deterministic
   *  outputs like full-page HTML so the token budget isn't consumed by reasoning. */
  thinking?: boolean;
};

export type AiCallMeta = {
  provider: string;
  model: string;
  operation: string;
  promptVersion: string;
  inputType: "text" | "vision" | "multimodal";
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
};

export type GenerateResult = {
  text: string;
  meta: AiCallMeta;
};

export interface AiProvider {
  readonly name: string;
  generate(opts: GenerateOptions): Promise<GenerateResult>;
}
