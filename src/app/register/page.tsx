import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/projects");
  return <AuthForm mode="register" />;
}
