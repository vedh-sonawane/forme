import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import type { AiProvider, GenerateOptions, GenerateResult } from "./types";

// Real Google Gemini provider (free-tier friendly).
// Uses responseMimeType application/json for structured requests; the structured()
// helper still zod-validates and repairs, so we don't depend on strict responseSchema.
export class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  private modelId(tier: GenerateOptions["model"]): string {
    return tier === "flash" ? env.geminiModelFlash : env.geminiModelPro;
  }

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const model = this.modelId(opts.model);
    const started = Date.now();
    const hasImages = !!opts.images?.length;
    const inputType = hasImages ? (opts.user ? "multimodal" : "vision") : "text";

    const parts: Array<Record<string, unknown>> = [{ text: opts.user }];
    for (const img of opts.images ?? []) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.dataBase64 } });
    }

    const doCall = () =>
      this.client.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: opts.system,
          responseMimeType: opts.json ? "application/json" : "text/plain",
          maxOutputTokens: opts.maxOutputTokens ?? 8192,
          temperature: opts.temperature ?? (opts.json ? 0.4 : 0.7),
          ...(opts.thinking === false ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      });

    try {
      let response;
      try {
        response = await doCall();
      } catch (e) {
        // One backoff retry on transient rate limits (free-tier RPM bursts).
        if (e instanceof Error && /429|rate|quota|overloaded|503/i.test(e.message)) {
          await new Promise((r) => setTimeout(r, 3500));
          response = await doCall();
        } else {
          throw e;
        }
      }

      const text = response.text ?? "";
      const usage = response.usageMetadata;
      const latencyMs = Date.now() - started;

      if (!text.trim()) {
        throw new Error("Gemini returned an empty response");
      }

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
          latencyMs,
          ok: true,
        },
      };
    } catch (err) {
      const latencyMs = Date.now() - started;
      const message = err instanceof Error ? err.message : String(err);
      return {
        text: "",
        meta: {
          provider: this.name,
          model,
          operation: opts.operation,
          promptVersion: opts.promptVersion,
          inputType,
          latencyMs,
          ok: false,
          error: message,
        },
      };
    }
  }
}
