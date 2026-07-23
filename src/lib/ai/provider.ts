import { z } from "zod";
import { db } from "@/lib/db";
import { env, resolveProvider } from "@/lib/env";
import { GeminiProvider } from "./gemini";
import { MockProvider } from "./mock";
import type { AiProvider, GenerateOptions, GenerateResult, AiCallMeta } from "./types";

let _mock: MockProvider | null = null;
let _gemini: GeminiProvider | null = null;

function mockProvider(): MockProvider {
  if (!_mock) _mock = new MockProvider();
  return _mock;
}

/** The provider actually used, based on env + key availability. */
export function getProvider(): AiProvider {
  if (resolveProvider() === "gemini") {
    if (!_gemini) _gemini = new GeminiProvider(env.geminiApiKey);
    return _gemini;
  }
  return mockProvider();
}

export function usingRealAI(): boolean {
  return resolveProvider() === "gemini";
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

/** Raw text generation with logging + graceful fallback to mock on provider error. */
export async function generateRaw(opts: GenerateOptions): Promise<GenerateResult & { usedFallback: boolean }> {
  const provider = getProvider();
  let result = await provider.generate(opts);
  let usedFallback = false;

  if (!result.meta.ok && provider.name !== "mock") {
    // Real provider failed (bad key, rate limit, network). Fall back so the app works.
    const fb = await mockProvider().generate(opts);
    await logCall(result.meta); // record the failure too
    result = fb;
    usedFallback = true;
  }

  await logCall(result.meta);
  return { ...result, usedFallback };
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
 * - forces JSON mode
 * - parses + validates
 * - on validation failure with the real provider, retries once with a repair note
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

  // Repair attempt (only meaningful for the real provider).
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
