import { z } from "zod";
import { db } from "@/lib/db";
import { env, resolveProvider } from "@/lib/env";
import { GeminiProvider } from "./gemini";
import { OpenRouterProvider } from "./openrouter";
import { MistralProvider } from "./mistral";
import { MockProvider } from "./mock";
import type { AiProvider, GenerateOptions, GenerateResult, AiCallMeta } from "./types";

let _mock: MockProvider | null = null;
let _gemini: GeminiProvider | null = null;
let _openrouter: OpenRouterProvider | null = null;
let _mistral: MistralProvider | null = null;

function mockProvider(): MockProvider {
  if (!_mock) _mock = new MockProvider();
  return _mock;
}
function geminiProvider(): GeminiProvider {
  if (!_gemini) _gemini = new GeminiProvider(env.geminiApiKey);
  return _gemini;
}
function openrouterProvider(): OpenRouterProvider {
  if (!_openrouter) _openrouter = new OpenRouterProvider(env.openrouterApiKey);
  return _openrouter;
}
function mistralProvider(): MistralProvider {
  if (!_mistral) _mistral = new MistralProvider(env.mistralApiKey);
  return _mistral;
}

/** The single preferred provider (kept for callers that just want "the" provider). */
export function getProvider(): AiProvider {
  const which = resolveProvider();
  if (which === "mistral") return mistralProvider();
  if (which === "openrouter") return openrouterProvider();
  if (which === "gemini") return geminiProvider();
  return mockProvider();
}

export function usingRealAI(): boolean {
  return resolveProvider() !== "mock";
}

/**
 * Ordered provider chain: preferred real provider first, then the OTHER real provider
 * (so when the preferred one exhausts its daily quota we keep using real AI instead of
 * dropping to the generic mock), then mock as the guaranteed last resort.
 */
function providerChain(): AiProvider[] {
  const chain: AiProvider[] = [];
  const has: Record<string, boolean> = {
    gemini: env.geminiApiKey.trim().length > 0,
    mistral: env.mistralApiKey.trim().length > 0,
    openrouter: env.openrouterApiKey.trim().length > 0,
  };
  const preferred = resolveProvider();
  // Preferred provider first, then the rest by design-quality order, then mock.
  const quality = ["gemini", "mistral", "openrouter"];
  const order = [preferred, ...quality.filter((p) => p !== preferred)];
  for (const name of order) {
    if (!has[name]) continue;
    if (name === "gemini") chain.push(geminiProvider());
    else if (name === "mistral") chain.push(mistralProvider());
    else if (name === "openrouter") chain.push(openrouterProvider());
  }
  chain.push(mockProvider());
  return chain;
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

/** Raw text generation: walk the provider chain until one succeeds; log every attempt. */
export async function generateRaw(opts: GenerateOptions): Promise<GenerateResult & { usedFallback: boolean }> {
  const chain = providerChain();
  let last: GenerateResult | null = null;
  for (const provider of chain) {
    const result = await provider.generate(opts);
    await logCall(result.meta);
    if (result.meta.ok) {
      return { ...result, usedFallback: provider.name === "mock" };
    }
    last = result;
  }
  // Should be unreachable (mock always succeeds), but stay safe.
  return { ...(last as GenerateResult), usedFallback: true };
}

function extractJSON(text: string): string {
  const t = text.trim();
  // strip ```json fences if present
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  // else find the outermost { } or [ ]
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

  // Repair attempt.
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
