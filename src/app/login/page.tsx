import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/projects");
  return <AuthForm mode="login" />;
}
