// Centralized, validated environment access.
const list = (v: string | undefined, fallback: string[]): string[] => {
  const parsed = (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return parsed.length ? parsed : fallback;
};

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  aiProvider: (process.env.AI_PROVIDER ?? "gemini") as "mistral" | "openrouter" | "gemini" | "mock",

  // ── Mistral (OpenAI-compatible; free tier is rate-limited, not daily-capped) ──
  mistralApiKey: process.env.MISTRAL_API_KEY ?? "",
  mistralTextModels: list(process.env.MISTRAL_TEXT_MODELS, [
    "mistral-large-latest",
    "codestral-latest",
    "mistral-medium-latest",
  ]),
  mistralVisionModels: list(process.env.MISTRAL_VISION_MODELS, [
    "mistral-medium-latest",
    "pixtral-12b-latest",
    "mistral-large-latest",
  ]),

  // ── OpenRouter (one API, many free models — cascades when a model is busy) ──
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  // Text models, tried in order. Faster/smaller first so the fallback isn't slow;
  // the big 120B model is last (highest quality but slow). Only used when Gemini is out.
  openrouterTextModels: list(process.env.OPENROUTER_TEXT_MODELS, [
    "openai/gpt-oss-20b:free",
    "inclusionai/ling-3.0-flash:free",
    "cohere/north-mini-code:free",
    "google/gemma-4-31b-it:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
  ]),
  // Vision-capable models for screenshot / URL / critique analysis.
  openrouterVisionModels: list(process.env.OPENROUTER_VISION_MODELS, [
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  ]),

  // ── Google Gemini ──
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModelPro: process.env.GEMINI_MODEL_PRO ?? "gemini-flash-latest",
  geminiModelFlash: process.env.GEMINI_MODEL_FLASH ?? "gemini-flash-latest",
  // Cascaded when the primary model hits its (per-model, daily) free quota.
  geminiFallbackModels: list(process.env.GEMINI_FALLBACK_MODELS, [
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-flash-lite-latest",
  ]),

  // ── Deployment (Vercel) ──
  vercelToken: process.env.VERCEL_TOKEN ?? "",
  vercelTeamId: process.env.VERCEL_TEAM_ID ?? "",
  // DATABASE_URL handed to the DEPLOYED app (SQLite can't persist on Vercel — set a
  // managed Postgres URL here for a working database in production).
  deployDatabaseUrl: process.env.DEPLOY_DATABASE_URL ?? "",

  storageDir: process.env.STORAGE_DIR ?? "./storage",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  disablePlaywright: process.env.DISABLE_PLAYWRIGHT === "1",
};

// Resolve which provider is actually usable, honoring AI_PROVIDER + key availability,
// and degrading gracefully to the clearly-marked mock provider when no key is present.
export function resolveProvider(): "mistral" | "openrouter" | "gemini" | "mock" {
  const hasG = env.geminiApiKey.trim().length > 0;
  const hasM = env.mistralApiKey.trim().length > 0;
  const hasOR = env.openrouterApiKey.trim().length > 0;
  // Honor the explicitly-selected provider when its key is present.
  if (env.aiProvider === "mistral" && hasM) return "mistral";
  if (env.aiProvider === "openrouter" && hasOR) return "openrouter";
  if (env.aiProvider === "gemini" && hasG) return "gemini";
  // Otherwise fall back to any available real provider (quality order).
  if (hasG) return "gemini";
  if (hasM) return "mistral";
  if (hasOR) return "openrouter";
  return "mock";
}

export const isRealAI = () => resolveProvider() !== "mock";
