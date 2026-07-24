import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { usingRealAI } from "@/lib/ai/provider";
import { resolveProvider } from "@/lib/env";
import { getCurrentUser } from "@/lib/user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Auth guard (kept from your build): unauthenticated → login.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const aiLive = usingRealAI();
  const provider = resolveProvider();
  const label = provider === "gemini" ? "Gemini live" : provider === "mistral" ? "Mistral live" : provider === "openrouter" ? "OpenRouter live" : "Dev fallback";
  const sub = provider === "gemini" ? "Real AI analysis" : provider === "mistral" ? "Mistral models" : provider === "openrouter" ? "OpenRouter free models" : "No key — mock AI";

  return (
    <div className="min-h-screen">
      <Sidebar aiLive={aiLive} label={label} sub={sub} user={{ name: user.name, email: user.email }} />
      <main className="pl-[248px]">
        <div className="mx-auto min-h-screen max-w-[1400px] px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
