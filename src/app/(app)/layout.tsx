import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { usingRealAI } from "@/lib/ai/provider";
import { getCurrentUser } from "@/lib/user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const aiLive = usingRealAI();
  return (
    <div className="min-h-screen">
      <Sidebar aiLive={aiLive} user={{ name: user.name, email: user.email }} />
      <main className="pt-14 lg:pt-0 lg:pl-[248px]">
        <div className="mx-auto min-h-screen max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
