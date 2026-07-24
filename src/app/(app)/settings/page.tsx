import { Card, Badge } from "@/components/ui";
import { usingRealAI } from "@/lib/ai/provider";
import { env, resolveProvider } from "@/lib/env";
import { browserAvailable } from "@/lib/render/browser";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const aiLive = usingRealAI();
  const provider = resolveProvider();
  const browser = await browserAvailable();
  const [aiCalls, projects, refs] = await Promise.all([
    db.aiCall.count(),
    db.project.count(),
    db.reference.count(),
  ]);

  const rows: { label: string; value: string; tone?: "ok" | "warn" | "default" | "accent" }[] = [
    { label: "Active provider (primary)", value: provider, tone: aiLive ? "ok" : "warn" },
    { label: "Provider chain", value: "Gemini → Mistral → OpenRouter → mock", tone: "default" },
    { label: "Gemini key", value: env.geminiApiKey ? "configured" : "missing", tone: env.geminiApiKey ? "ok" : "warn" },
    { label: "Gemini model", value: env.geminiModelPro, tone: "default" },
    { label: "Mistral key", value: env.mistralApiKey ? "configured" : "missing", tone: env.mistralApiKey ? "ok" : "warn" },
    { label: "Mistral model", value: env.mistralTextModels[0] ?? "—", tone: "default" },
    { label: "OpenRouter key", value: env.openrouterApiKey ? "configured" : "missing", tone: env.openrouterApiKey ? "ok" : "default" },
    { label: "Browser rendering (Playwright)", value: browser.available ? "available" : browser.reason ?? "unavailable", tone: browser.available ? "ok" : "warn" },
    { label: "Database", value: "SQLite (Prisma)", tone: "default" },
    { label: "Storage", value: env.storageDir, tone: "default" },
  ];

  return (
    <div className="animate-in max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-fg-dim">Environment, AI provider, and system status.</p>

      <Card className="mt-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-fg-dim">System status</h2>
        <div className="divide-y">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-3 text-sm">
              <span className="text-fg-dim">{r.label}</span>
              <Badge tone={r.tone ?? "default"}>{r.value}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <Card><div className="text-2xl font-bold">{projects}</div><div className="text-xs text-muted">projects</div></Card>
        <Card><div className="text-2xl font-bold">{refs}</div><div className="text-xs text-muted">references</div></Card>
        <Card><div className="text-2xl font-bold">{aiCalls}</div><div className="text-xs text-muted">AI calls logged</div></Card>
      </div>

      {!aiLive && (
        <Card className="mt-4 border-[color:var(--warn)]/30 bg-[color:var(--warn)]/5">
          <h3 className="text-sm font-semibold text-[color:var(--warn)]">Running on development fallback</h3>
          <p className="mt-1.5 text-sm text-fg-dim">
            No Gemini API key detected, so FORME is using the clearly-marked mock provider. All analysis and
            generation still work end-to-end, but outputs are deterministic stand-ins. To enable real AI, get a
            free key at <span className="font-mono text-fg">aistudio.google.com/apikey</span> and set{" "}
            <span className="font-mono text-fg">GEMINI_API_KEY</span> in <span className="font-mono text-fg">.env</span>, then restart.
          </p>
        </Card>
      )}

      <Card className="mt-4">
        <h3 className="text-sm font-semibold">Authentication</h3>
        <p className="mt-1.5 text-sm text-fg-dim">
          This MVP runs as a single local workspace user. The data model is fully multi-user, so OAuth/session
          auth is an <span className="text-fg">intentionally-deferred</span> future feature.
        </p>
      </Card>
    </div>
  );
}
