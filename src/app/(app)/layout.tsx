import { Sidebar } from "@/components/Sidebar";
import { usingRealAI } from "@/lib/ai/provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const aiLive = usingRealAI();
  return (
    <div className="min-h-screen">
      <Sidebar aiLive={aiLive} />
      <main className="pt-14 lg:pt-0 lg:pl-[248px]">
        <div className="mx-auto min-h-screen max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
