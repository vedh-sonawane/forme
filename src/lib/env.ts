// Centralized, validated environment access.
export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  // Primary provider preference. OpenRouter is the default primary; Gemini is the
  // vision-capable fallback; Mock is the always-available last resort.
  aiProvider: (process.env.AI_PROVIDER ?? "openrouter") as "openrouter" | "gemini" | "mock",

  // OpenRouter (OpenAI-compatible). Model is fully configurable — verify the exact
  // slug at https://openrouter.ai/models (e.g. "poolside/laguna-s-2.1").
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterModel: process.env.OPENROUTER_MODEL ?? "poolside/laguna-m.1:free",
  // Whether the OpenRouter model can accept images. Laguna is text/code-only, so
  // image requests are routed to Gemini first by default (set to "1" to override).
  openRouterVision: process.env.OPENROUTER_VISION === "1",

  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModelPro: process.env.GEMINI_MODEL_PRO ?? "gemini-2.5-pro",
  geminiModelFlash: process.env.GEMINI_MODEL_FLASH ?? "gemini-2.5-flash",

  storageDir: process.env.STORAGE_DIR ?? "./storage",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  disablePlaywright: process.env.DISABLE_PLAYWRIGHT === "1",
};

export const hasOpenRouter = () => env.openRouterApiKey.trim().length > 0;
export const hasGemini = () => env.geminiApiKey.trim().length > 0;

// The primary provider that will actually be used (first available in the chain).
export function resolveProvider(): "openrouter" | "gemini" | "mock" {
  if (env.aiProvider === "mock") return "mock";
  if (hasOpenRouter()) return "openrouter";
  if (hasGemini()) return "gemini";
  return "mock";
}

// True when at least one real (non-mock) provider is configured.
export const isRealAI = () => hasOpenRouter() || hasGemini();
