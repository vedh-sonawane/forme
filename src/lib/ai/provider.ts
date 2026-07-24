import { z } from "zod";
import { db } from "@/lib/db";
import { env, hasOpenRouter, hasGroq, hasCerebras, hasGithubModels, hasGemini, isRealAI } from "@/lib/env";
import { makeOpenRouter, makeGroq, makeCerebras, makeGithubModels } from "./openai-compat";
import { GeminiProvider } from "./gemini";
import { MockProvider } from "./mock";
import type { AiProvider, GenerateOptions, GenerateResult, AiCallMeta } from "./types";

// ── Provider pool ──────────────────────────────────────────────────────────────
// Rotate across every configured FREE text provider so no single per-minute rate
// bucket gets hammered; fall through the rest on failure; Gemini handles vision +
// acts as a text fallback; Mock is the guaranteed last resort. A circuit breaker
// benches any provider that errors so broken/exhausted keys don't waste calls.

type Entry = { provider: AiProvider; text: boolean; vision: boolean };

let _pool: Entry[] | null = null;
let _mock: MockProvider | null = null;

function mockProvider(): MockProvider {
  if (!_mock) _mock = new MockProvider();
  return _mock;
}

function pool(): Entry[] {
  if (_pool) return _pool;
  const entries: Entry[] = [];
  if (env.aiProvider !== "mock") {
    if (hasOpenRouter()) for (const m of env.openRouterModels) entries.push({ provider: makeOpenRouter(m), text: true, vision: env.openRouterVision });
    if (hasGroq()) entries.push({ provider: makeGroq(), text: true, vision: false });
    if (hasCerebras()) entries.push({ provider: makeCerebras(), text: true, vision: false });
    if (hasGithubModels()) entries.push({ provider: makeGithubModels(), text: true, vision: true }); // gpt-4o-mini is multimodal
    if (hasGemini()) entries.push({ provider: new GeminiProvider(env.geminiApiKey), text: true, vision: true });
  }
  entries.push({ provider: mockProvider(), text: true, vision: true });
  _pool = entries;
  return entries;
}

// ── Circuit breaker ──────────────────────────────────────────────────────────────
const benchedUntil = new Map<string, number>();
function isHealthy(name: string): boolean {
  if (name === "mock") return true;
  const until = benchedUntil.get(name) ?? 0;
  return Date.now() >= until;
}
function bench(name: string, error?: string) {
  // Config/access errors (auth, payment, not-found) won't fix themselves soon →
  // long bench. Rate limits / transient errors → short bench.
  const status = Number((error ?? "").match(/\b(4\d\d|5\d\d)\b/)?.[1]);
  const longErr = status === 401 || status === 402 || status === 403 || status === 404;
  benchedUntil.set(name, Date.now() + (longErr ? 10 * 60_000 : 45_000));
}
function clearBench(name: string) {
  benchedUntil.delete(name);
}

// ── Global throttle (serialized gate with a minimum inter-call gap) ───────────────
let gate: Promise<void> = Promise.resolve();
let lastAt = 0;
function schedule<T>(fn: () => Promise<T>): Promise<T> {
  const run = gate.then(async () => {
    const wait = env.aiMinGapMs - (Date.now() - lastAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastAt = Date.now();
    return fn();
  });
  gate = run.then(() => {}, () => {});
  return run;
}

// ── Ordering: rotate healthy text providers; vision goes to a vision provider first ─
let rr = 0;
function orderFor(needsVision: boolean): AiProvider[] {
  const p = pool();
  const mock = p[p.length - 1].provider;
  if (needsVision) {
    const vision = p.filter((e) => e.vision && e.provider.name !== "mock" && isHealthy(e.provider.name)).map((e) => e.provider);
    return [...vision, mock];
  }
  const healthy = p.filter((e) => e.text && e.provider.name !== "mock" && isHealthy(e.provider.name)).map((e) => e.provider);
  const benched = p.filter((e) => e.text && e.provider.name !== "mock" && !isHealthy(e.provider.name)).map((e) => e.provider);
  const rotated = healthy.length ? healthy.map((_, i) => healthy[(i + rr) % healthy.length]) : [];
  rr = (rr + 1) % Math.max(1, healthy.length);
  // Healthy (rotated) first, then benched as a desperate try, then mock.
  return [...rotated, ...benched, mock];
}

/** The provider used first for a plain text request (display/diagnostic use). */
export function getProvider(): AiProvider {
  return orderFor(false)[0];
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
 * Raw text generation. Walks the rotated provider chain (throttled), benching any
 * provider that fails, until one returns a usable response. Mock is always last, so
 * this never throws.
 */
export async function generateRaw(opts: GenerateOptions): Promise<GenerateResult & { usedFallback: boolean }> {
  const providers = orderFor(!!opts.images?.length);

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const result = await schedule(() => provider.generate(opts));
    await logCall(result.meta);
    if (result.meta.ok && result.text.trim()) {
      clearBench(provider.name);
      const usedFallback = i > 0 || provider.name === "mock";
      return { ...result, usedFallback };
    }
    bench(provider.name, result.meta.error);
  }
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
 * - on validation failure, retries once with a repair note
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

  const mock = await mockProvider().generate({ ...opts, json: true });
  await logCall(mock.meta);
  const data = schema.parse(JSON.parse(mock.text));
  return { data, meta: mock.meta, usedFallback: true, raw: mock.text };
}
