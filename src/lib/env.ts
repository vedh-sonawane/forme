// Centralized, validated environment access.
export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  aiProvider: (process.env.AI_PROVIDER ?? "gemini") as "gemini" | "mock",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModelPro: process.env.GEMINI_MODEL_PRO ?? "gemini-flash-latest",
  geminiModelFlash: process.env.GEMINI_MODEL_FLASH ?? "gemini-flash-latest",
  storageDir: process.env.STORAGE_DIR ?? "./storage",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  disablePlaywright: process.env.DISABLE_PLAYWRIGHT === "1",
};

// Resolve which provider is actually usable. If gemini is selected but no key is
// present, we transparently fall back to the clearly-marked mock provider.
export function resolveProvider(): "gemini" | "mock" {
  if (env.aiProvider === "gemini" && env.geminiApiKey.trim().length > 0) {
    return "gemini";
  }
  return "mock";
}

export const isRealAI = () => resolveProvider() === "gemini";
