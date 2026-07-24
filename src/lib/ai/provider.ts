import { z } from "zod";
import { db } from "@/lib/db";
import { env, hasOpenRouter, hasGemini, isRealAI } from "@/lib/env";
import { OpenRouterProvider } from "./openrouter";
import { GeminiProvider } from "./gemini";
import { MockProvider } from "./mock";
import type { AiProvider, GenerateOptions, GenerateResult, AiCallMeta } from "./types";

let _mock: MockProvider | null = null;
let _gemini: GeminiProvider | null = null;
let _openrouter: OpenRouterProvider | null = null;

function mockProvider(): MockProvider {
  if (!_mock) _mock = new MockProvider();
  return _mock;
}
function geminiProvider(): GeminiProvider {
  if (!_gemini) _gemini = new GeminiProvider(env.geminiApiKey);
  return _gemini;
}
function openrouterProvider(): OpenRouterProvider {
  if (!_openrouter) _openrouter = new OpenRouterProvider(env.openRouterApiKey, env.openRouterModel);
  return _openrouter;
}

type ChainEntry = { provider: AiProvider; vision: boolean };

// The ordered provider chain: OpenRouter (primary) → Gemini (fallback) → Mock (last
// resort). Only configured providers are included; Mock is always present.
function chain(): ChainEntry[] {
  const entries: ChainEntry[] = [];
  if (env.aiProvider !== "mock") {
    if (hasOpenRouter()) entries.push({ provider: openrouterProvider(), vision: env.openRouterVision });
    if (hasGemini()) entries.push({ provider: geminiProvider(), vision: true });
  }
  entries.push({ provider: mockProvider(), vision: true });
  return entries;
}

// For a given request, order the chain. Image requests prefer vision-capable
// providers first (so a text-only primary like Laguna doesn't burn a failed call).
function orderedFor(needsVision: boolean): AiProvider[] {
  const c = chain();
  if (!needsVision) return c.map((e) => e.provider);
  const visionFirst = [...c.filter((e) => e.vision), ...c.filter((e) => !e.vision)];
  return visionFirst.map((e) => e.provider);
}

/** The provider actually used first, based on env + key availability. */
export function getProvider(): AiProvider {
  return orderedFor(false)[0];
}

export function usingRealAI(): boolean {
  return isRealAI();
}

async function logCall(meta: AiCallMeta) {
  try {
    await db.aiCall.create({
      data: {
        operation: meta.operation,
        promptVersion: meta.promptVersion,
        provider: meta.provider,
        model: meta.model,
        inputType: meta.inputType,
        inputTokens: meta.inputTokens ?? null,
        outputTokens: meta.outputTokens ?? null,
        latencyMs: meta.latencyMs,
        ok: meta.ok,
        error: meta.error ?? null,
      },
    });
  } catch {
    // logging must never break the request path
  }
}

/**
 * Raw text generation with logging + graceful fallback down the provider chain.
 * Tries each provider in order until one returns a usable response; every attempt
 * (success or failure) is logged. Mock is always last, so this never throws.
 */
export async function generateRaw(opts: GenerateOptions): Promise<GenerateResult & { usedFallback: boolean }> {
  const providers = orderedFor(!!opts.images?.length);

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const result = await provider.generate(opts);
    await logCall(result.meta);
    if (result.meta.ok && result.text.trim()) {
      // Fell back if we didn't succeed on the first provider, or landed on mock.
      const usedFallback = i > 0 || provider.name === "mock";
      return { ...result, usedFallback };
    }
  }
  // Shouldn't happen (mock always succeeds), but stay safe.
  const fallback = await mockProvider().generate(opts);
  await logCall(fallback.meta);
  return { ...fallback, usedFallback: true };
}

function extractJSON(text: string): string {
  const t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  const first = Math.min(...["{", "["].map((c) => (t.indexOf(c) === -1 ? Infinity : t.indexOf(c))));
  const lastObj = t.lastIndexOf("}");
  const lastArr = t.lastIndexOf("]");
  const last = Math.max(lastObj, lastArr);
  if (first !== Infinity && last > first) return t.slice(first, last + 1);
  return t;
}

export type StructuredResult<T> = {
  data: T;
  meta: AiCallMeta;
  usedFallback: boolean;
  raw: string;
};

/**
 * Generate structured output validated against a zod schema.
 * - parses + validates
 * - on validation failure with a real provider, retries once with a repair note
 * - on repeated failure, uses the mock provider's schema-valid output
 */
export async function structured<S extends z.ZodTypeAny>(
  opts: Omit<GenerateOptions, "json">,
  schema: S
): Promise<StructuredResult<z.infer<S>>> {
  const attempt = async (o: GenerateOptions) => {
    const res = await generateRaw(o);
    try {
      const parsed = JSON.parse(extractJSON(res.text));
      const validated = schema.parse(parsed);
      return { ok: true as const, data: validated, res };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e), res };
    }
  };

  const first = await attempt({ ...opts, json: true });
  if (first.ok) {
    return { data: first.data, meta: first.res.meta, usedFallback: first.res.usedFallback, raw: first.res.text };
  }

  const repair = await attempt({
    ...opts,
    json: true,
    user:
      opts.user +
      `\n\n[SYSTEM REPAIR] Your previous output failed schema validation (${first.error}). ` +
      `Return ONLY valid minified JSON matching the requested schema. No prose, no code fences.`,
  });
  if (repair.ok) {
    return { data: repair.data, meta: repair.res.meta, usedFallback: repair.res.usedFallback, raw: repair.res.text };
  }

  // Guaranteed schema-valid fallback via the mock provider.
  const mock = await mockProvider().generate({ ...opts, json: true });
  await logCall(mock.meta);
  const data = schema.parse(JSON.parse(mock.text));
  return { data, meta: mock.meta, usedFallback: true, raw: mock.text };
}
