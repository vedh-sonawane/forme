import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import type { AiProvider, GenerateOptions, GenerateResult } from "./types";

const isRateLimited = (e: unknown) => e instanceof Error && /429|rate|quota|overloaded|503|exhaust|resource_exhausted/i.test(e.message);

// Real Google Gemini provider (free-tier friendly).
// KEY reliability behaviour: a single model's DAILY free quota exhausts fast (each
// generation fires several calls). Rather than falling straight back to the generic
// mock, we CASCADE through a list of models on any rate-limit — so generation keeps
// using REAL AI (even a lighter model) and only drops to mock when every model is out.
export class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  // Ordered candidate models for a tier: preferred first, lighter/higher-quota last.
  private candidates(tier: GenerateOptions["model"]): string[] {
    const primary = tier === "flash" ? env.geminiModelFlash : env.geminiModelPro;
    const fallbacks = env.geminiFallbackModels;
    return Array.from(new Set([primary, ...fallbacks].filter(Boolean)));
  }

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const models = this.candidates(opts.model);
    const started = Date.now();
    const hasImages = !!opts.images?.length;
    const inputType = hasImages ? (opts.user ? "multimodal" : "vision") : "text";

    const parts: Array<Record<string, unknown>> = [{ text: opts.user }];
    for (const img of opts.images ?? []) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.dataBase64 } });
    }

    const config = {
      systemInstruction: opts.system,
      responseMimeType: opts.json ? "application/json" : "text/plain",
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
      temperature: opts.temperature ?? (opts.json ? 0.4 : 0.7),
      ...(opts.thinking === false ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    };

    let lastError = "unknown error";
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      try {
        const response = await this.client.models.generateContent({ model, contents: [{ role: "user", parts }], config });
        const text = response.text ?? "";
        if (!text.trim()) throw new Error("Gemini returned an empty response");
        const usage = response.usageMetadata;
        return {
          text,
          meta: {
            provider: this.name,
            model,
            operation: opts.operation,
            promptVersion: opts.promptVersion,
            inputType,
            inputTokens: usage?.promptTokenCount,
            outputTokens: usage?.candidatesTokenCount,
            latencyMs: Date.now() - started,
            ok: true,
          },
        };
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        // Try the next model on ANY error (rate-limit, or a per-model 400 like an
        // unsupported arg) — a different model may accept the request. Longer pause
        // for rate-limits so we space out; short pause otherwise.
        if (i < models.length - 1) {
          await new Promise((r) => setTimeout(r, isRateLimited(e) ? 1500 : 400));
          continue;
        }
        break;
      }
    }

    return {
      text: "",
      meta: {
        provider: this.name,
        model: models[0],
        operation: opts.operation,
        promptVersion: opts.promptVersion,
        inputType,
        latencyMs: Date.now() - started,
        ok: false,
        error: lastError,
      },
    };
  }
}
