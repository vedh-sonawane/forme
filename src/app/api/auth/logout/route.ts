import { ok, handler } from "@/lib/api";
import { deleteCurrentSession, clearSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export const POST = handler(async () => {
  await deleteCurrentSession();
  const res = ok({ signedOut: true });
  clearSessionCookie(res);
  return res;
});
