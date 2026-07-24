import { env } from "@/lib/env";
import type { AiProvider, GenerateOptions, GenerateResult } from "./types";

// OpenRouter provider (OpenAI-compatible chat completions). Primary provider.
// Model is env-configured (e.g. Poolside "poolside/laguna-s-2.1"). Supports images
// via OpenAI-style content parts when the model allows it; otherwise the chain in
// provider.ts routes image requests to Gemini first.
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

type ORContent = string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

export class OpenRouterProvider implements AiProvider {
  readonly name = "openrouter";
  readonly supportsVision = env.openRouterVision;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const started = Date.now();
    const hasImages = !!opts.images?.length;
    const inputType = hasImages ? (opts.user ? "multimodal" : "vision") : "text";

    // Build the user message content (text + optional images as data URLs).
    let userContent: ORContent = opts.user;
    if (hasImages) {
      userContent = [
        { type: "text", text: opts.user },
        ...(opts.images ?? []).map((img) => ({
          type: "image_url" as const,
          image_url: { url: `data:${img.mimeType};base64,${img.dataBase64}` },
        })),
      ];
    }

    const body = {
      model: this.model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: userContent },
      ],
      temperature: opts.temperature ?? (opts.json ? 0.4 : 0.7),
      max_tokens: opts.maxOutputTokens ?? 8192,
    };

    const doCall = async (): Promise<Response> => {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 120_000);
      try {
        return await fetch(ENDPOINT, {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": env.appUrl,
            "X-Title": "FORME",
          },
          body: JSON.stringify(body),
        });
      } finally {
        clearTimeout(timeout);
      }
    };

    try {
      let res = await doCall();
      // One backoff retry on transient rate limits / overload.
      if ((res.status === 429 || res.status === 502 || res.status === 503) ) {
        await new Promise((r) => setTimeout(r, 4000));
        res = await doCall();
      }
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 200)}`);
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        error?: { message?: string };
      };
      if (json.error) throw new Error(json.error.message || "OpenRouter error");
      const text = json.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) throw new Error("OpenRouter returned an empty response");

      return {
        text,
        meta: {
          provider: this.name,
          model: this.model,
          operation: opts.operation,
          promptVersion: opts.promptVersion,
          inputType,
          inputTokens: json.usage?.prompt_tokens,
          outputTokens: json.usage?.completion_tokens,
          latencyMs: Date.now() - started,
          ok: true,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        text: "",
        meta: {
          provider: this.name,
          model: this.model,
          operation: opts.operation,
          promptVersion: opts.promptVersion,
          inputType,
          latencyMs: Date.now() - started,
          ok: false,
          error: message,
        },
      };
    }
  }
}
