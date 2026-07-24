import { env } from "@/lib/env";
import type { AiProvider, GenerateOptions, GenerateResult } from "./types";

// Generic OpenAI-compatible chat-completions provider. Backs every hosted text
// provider in the pool (OpenRouter, Groq, Cerebras, GitHub Models) — they all speak
// the same wire format, differing only in endpoint, auth header, model id, and caps.

export type CompatConfig = {
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
  supportsVision?: boolean;
  extraHeaders?: Record<string, string>;
  /** Provider max completion tokens (e.g. Groq 70B = 32768). Requests are clamped. */
  maxTokensCap?: number;
};

type ORContent = string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

export class OpenAICompatProvider implements AiProvider {
  readonly name: string;
  readonly supportsVision: boolean;
  private cfg: CompatConfig;

  constructor(cfg: CompatConfig) {
    this.name = cfg.name;
    this.supportsVision = !!cfg.supportsVision;
    this.cfg = cfg;
  }

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const started = Date.now();
    const hasImages = !!opts.images?.length;
    const inputType = hasImages ? (opts.user ? "multimodal" : "vision") : "text";

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

    const maxTokens = Math.min(opts.maxOutputTokens ?? 8192, this.cfg.maxTokensCap ?? 1_000_000);
    const body = {
      model: this.cfg.model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: userContent },
      ],
      temperature: opts.temperature ?? (opts.json ? 0.4 : 0.7),
      max_tokens: maxTokens,
    };

    const doCall = async (): Promise<Response> => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 120_000);
      try {
        return await fetch(this.cfg.endpoint, {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            Authorization: `Bearer ${this.cfg.apiKey}`,
            "Content-Type": "application/json",
            ...(this.cfg.extraHeaders ?? {}),
          },
          body: JSON.stringify(body),
        });
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      let res = await doCall();
      // Retry-After-aware single retry for short cooldowns; long cooldowns fall
      // through to the next provider in the chain (its own rate bucket).
      if (res.status === 429 || res.status >= 500) {
        const ra = Number(res.headers.get("retry-after"));
        const waitMs = Number.isFinite(ra) && ra > 0 ? ra * 1000 : 4000;
        if (waitMs <= 6000) {
          await new Promise((r) => setTimeout(r, waitMs));
          res = await doCall();
        }
      }
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`${res.status}: ${detail.slice(0, 180)}`);
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        error?: { message?: string };
      };
      if (json.error) throw new Error(json.error.message || "provider error");
      const text = json.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) throw new Error("empty response");

      return {
        text,
        meta: {
          provider: this.name,
          model: this.cfg.model,
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
          model: this.cfg.model,
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

// Named factory helpers for each hosted provider.
export function makeOpenRouter(model: string): OpenAICompatProvider {
  return new OpenAICompatProvider({
    name: `openrouter:${model.split("/").pop()}`,
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: env.openRouterApiKey,
    model,
    extraHeaders: { "HTTP-Referer": env.appUrl, "X-Title": "FORME" },
  });
}
export function makeGroq(): OpenAICompatProvider {
  return new OpenAICompatProvider({
    name: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    apiKey: env.groqApiKey,
    model: env.groqModel,
    maxTokensCap: 32768,
  });
}
export function makeCerebras(): OpenAICompatProvider {
  return new OpenAICompatProvider({
    name: "cerebras",
    endpoint: "https://api.cerebras.ai/v1/chat/completions",
    apiKey: env.cerebrasApiKey,
    model: env.cerebrasModel,
    maxTokensCap: 32768,
  });
}
export function makeGithubModels(): OpenAICompatProvider {
  return new OpenAICompatProvider({
    name: "github",
    endpoint: "https://models.github.ai/inference/chat/completions",
    apiKey: env.githubModelsKey,
    model: env.githubModel,
    maxTokensCap: 16000,
  });
}
