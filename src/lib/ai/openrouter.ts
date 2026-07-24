import { env } from "@/lib/env";
import type { AiProvider, GenerateOptions, GenerateResult } from "./types";

const isRateLimited = (msg: string) => /429|rate|quota|temporarily|overloaded|503|502|exhaust|unavailable/i.test(msg);

// OpenRouter provider — one OpenAI-compatible API over many free models.
// KEY reliability behaviour: it CASCADES through a list of models on any error/rate-
// limit, so when one free model is busy it transparently switches to another and keeps
// using REAL AI. Only when every candidate fails does the caller fall back to mock.
export class OpenRouterProvider implements AiProvider {
  readonly name = "openrouter";
  constructor(private apiKey: string) {}

  private models(opts: GenerateOptions): string[] {
    return opts.images?.length ? env.openrouterVisionModels : env.openrouterTextModels;
  }

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const models = this.models(opts);
    const started = Date.now();
    const hasImages = !!opts.images?.length;
    const inputType = hasImages ? (opts.user ? "multimodal" : "vision") : "text";

    // OpenAI-style message content: string, or array of text + image parts for vision.
    const userContent = hasImages
      ? [
          { type: "text", text: opts.user },
          ...(opts.images ?? []).map((img) => ({ type: "image_url", image_url: { url: `data:${img.mimeType};base64,${img.dataBase64}` } })),
        ]
      : opts.user;
    const messages: Array<Record<string, unknown>> = [];
    if (opts.system) messages.push({ role: "system", content: opts.system });
    messages.push({ role: "user", content: userContent });

    const bodyFor = (model: string) => ({
      model,
      messages,
      max_tokens: opts.maxOutputTokens ?? 8192,
      temperature: opts.temperature ?? (opts.json ? 0.4 : 0.7),
    });

    let lastError = "unknown error";
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": env.appUrl,
            "X-Title": "FORME",
          },
          body: JSON.stringify(bodyFor(model)),
        });
        const json = (await res.json().catch(() => null)) as
          | { error?: { message?: string; code?: number }; choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } }
          | null;
        if (!res.ok || json?.error) {
          throw new Error(`${json?.error?.message ?? `HTTP ${res.status}`} (${json?.error?.code ?? res.status})`);
        }
        const text = json?.choices?.[0]?.message?.content ?? "";
        if (!text.trim()) throw new Error("OpenRouter returned an empty response");
        return {
          text,
          meta: {
            provider: this.name,
            model,
            operation: opts.operation,
            promptVersion: opts.promptVersion,
            inputType,
            inputTokens: json?.usage?.prompt_tokens,
            outputTokens: json?.usage?.completion_tokens,
            latencyMs: Date.now() - started,
            ok: true,
          },
        };
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        // Free models can be busy or flaky — cascade to the next candidate on ANY error.
        if (i < models.length - 1) {
          await new Promise((r) => setTimeout(r, isRateLimited(lastError) ? 1400 : 600));
          continue;
        }
        break;
      }
    }

    return {
      text: "",
      meta: {
        provider: this.name,
        model: models[0] ?? "openrouter",
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
