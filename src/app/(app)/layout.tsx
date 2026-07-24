import { Sidebar } from "@/components/Sidebar";
import { usingRealAI } from "@/lib/ai/provider";
import { resolveProvider } from "@/lib/env";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const aiLive = usingRealAI();
  const provider = resolveProvider();
  const label = provider === "openrouter" ? "Laguna live" : provider === "gemini" ? "Gemini live" : "Dev fallback";
  const sub = provider === "openrouter" ? "OpenRouter · Poolside" : provider === "gemini" ? "Real AI analysis" : "No key — mock AI";
  return (
    <div className="min-h-screen">
      <Sidebar aiLive={aiLive} label={label} sub={sub} />
      <main className="pl-[248px]">
        <div className="mx-auto min-h-screen max-w-[1400px] px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
