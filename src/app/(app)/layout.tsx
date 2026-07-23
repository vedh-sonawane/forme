import { Sidebar } from "@/components/Sidebar";
import { usingRealAI } from "@/lib/ai/provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const aiLive = usingRealAI();
  return (
    <div className="min-h-screen">
      <Sidebar aiLive={aiLive} />
      <main className="pl-[248px]">
        <div className="mx-auto min-h-screen max-w-[1400px] px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
