import { Sidebar } from "@/components/Sidebar";
import { usingRealAI } from "@/lib/ai/provider";
import { hasOpenRouter, hasGroq, hasCerebras, hasGithubModels, hasGemini } from "@/lib/env";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const aiLive = usingRealAI();
  const names = [
    hasOpenRouter() && "OpenRouter",
    hasGroq() && "Groq",
    hasCerebras() && "Cerebras",
    hasGithubModels() && "GitHub",
    hasGemini() && "Gemini",
  ].filter(Boolean) as string[];
  const label = aiLive ? "AI pool live" : "Dev fallback";
  const sub = aiLive ? `${names.length} providers · rotating` : "No key — mock AI";
  return (
    <div className="min-h-screen">
      <Sidebar aiLive={aiLive} label={label} sub={sub} />
      <main className="pl-[248px]">
        <div className="mx-auto min-h-screen max-w-[1400px] px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
