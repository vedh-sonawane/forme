// Centralized, validated environment access.

function list(v: string | undefined, fallback: string[]): string[] {
  const parsed = (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return parsed.length ? parsed : fallback;
}

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  // Provider preference. "mock" forces the fake provider; anything else uses the
  // multi-provider pool (see src/lib/ai/provider.ts): rotate across all configured
  // free text providers, fall back through the rest, then Gemini (vision), then Mock.
  aiProvider: (process.env.AI_PROVIDER ?? "openrouter") as "openrouter" | "gemini" | "mock",

  // Minimum gap between AI calls (global throttle) — keeps bursts under per-minute caps.
  aiMinGapMs: Number(process.env.AI_MIN_GAP_MS ?? 800),

  // OpenRouter (OpenAI-compatible). Can run several free models — rotated in the pool.
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterModel: process.env.OPENROUTER_MODEL ?? "poolside/laguna-m.1:free",
  openRouterModels: list(process.env.OPENROUTER_MODELS, [
    process.env.OPENROUTER_MODEL ?? "poolside/laguna-m.1:free",
  ]),
  openRouterVision: process.env.OPENROUTER_VISION === "1",

  // Groq (OpenAI-compatible) — very fast, generous free tier.
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",

  // Cerebras (OpenAI-compatible).
  cerebrasApiKey: process.env.CEREBRAS_API_KEY ?? "",
  cerebrasModel: process.env.CEREBRAS_MODEL ?? "zai-glm-4.7",

  // GitHub Models — requires a PAT with the "models: read" permission.
  githubModelsKey: process.env.GITHUB_MODELS_KEY ?? "",
  githubModel: process.env.GITHUB_MODEL ?? "openai/gpt-4o-mini",

  // Gemini — the vision-capable provider (image analysis + a text fallback).
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModelPro: process.env.GEMINI_MODEL_PRO ?? "gemini-2.5-pro",
  geminiModelFlash: process.env.GEMINI_MODEL_FLASH ?? "gemini-2.5-flash",

  storageDir: process.env.STORAGE_DIR ?? "./storage",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  disablePlaywright: process.env.DISABLE_PLAYWRIGHT === "1",
};

export const hasOpenRouter = () => env.openRouterApiKey.trim().length > 0;
export const hasGroq = () => env.groqApiKey.trim().length > 0;
export const hasCerebras = () => env.cerebrasApiKey.trim().length > 0;
export const hasGithubModels = () => env.githubModelsKey.trim().length > 0;
export const hasGemini = () => env.geminiApiKey.trim().length > 0;

// The nominal primary provider (first configured), for display only.
export function resolveProvider(): "openrouter" | "groq" | "cerebras" | "github" | "gemini" | "mock" {
  if (env.aiProvider === "mock") return "mock";
  if (hasOpenRouter()) return "openrouter";
  if (hasGroq()) return "groq";
  if (hasCerebras()) return "cerebras";
  if (hasGithubModels()) return "github";
  if (hasGemini()) return "gemini";
  return "mock";
}

// True when at least one real (non-mock) provider is configured.
export const isRealAI = () => hasOpenRouter() || hasGroq() || hasCerebras() || hasGithubModels() || hasGemini();
