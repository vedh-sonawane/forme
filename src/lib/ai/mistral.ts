import { env } from "@/lib/env";
import type { AiProvider, GenerateOptions, GenerateResult } from "./types";

const isRateLimited = (msg: string) => /429|rate|capacity|overloaded|503|502|tier|quota|exhaust|too many/i.test(msg);

// Mistral provider (OpenAI-compatible chat API). Its free tier is rate-limited
// per-minute/second rather than a hard daily cap, so it's a strong #2 in the chain:
// when Gemini's daily quota runs out, Mistral keeps producing good-quality output
// instead of dropping to the weak free models. Cascades across models on any error.
export class MistralProvider implements AiProvider {
  readonly name = "mistral";
  constructor(private apiKey: string) {}

  private models(opts: GenerateOptions): string[] {
    return opts.images?.length ? env.mistralVisionModels : env.mistralTextModels;
  }

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const models = this.models(opts);
    const started = Date.now();
    const hasImages = !!opts.images?.length;
    const inputType = hasImages ? (opts.user ? "multimodal" : "vision") : "text";

    // Mistral takes image_url as a plain data-URI string in the content parts.
    const userContent = hasImages
      ? [
          { type: "text", text: opts.user },
          ...(opts.images ?? []).map((img) => ({ type: "image_url", image_url: `data:${img.mimeType};base64,${img.dataBase64}` })),
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
        const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(bodyFor(model)),
        });
        const json = (await res.json().catch(() => null)) as
          | { error?: unknown; message?: string; choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } }
          | null;
        if (!res.ok || json?.error) {
          const msg = typeof json?.error === "string" ? json.error : json?.message ?? `HTTP ${res.status}`;
          throw new Error(`${msg} (${res.status})`);
        }
        const text = json?.choices?.[0]?.message?.content ?? "";
        if (!text.trim()) throw new Error("Mistral returned an empty response");
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
        if (i < models.length - 1) {
          await new Promise((r) => setTimeout(r, isRateLimited(lastError) ? 1600 : 500));
          continue;
        }
        break;
      }
    }

    return {
      text: "",
      meta: {
        provider: this.name,
        model: models[0] ?? "mistral",
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
