import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import { handler, fail } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// Serves a generated version's HTML for the sandboxed preview iframe.
// The generated document is untrusted-ish (LLM output) so it's rendered inside a
// sandboxed iframe on the client; here we set a restrictive CSP and disable framing
// from other origins.
export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const version = await db.websiteVersion.findFirst({ where: { id, website: { project: { userId } } } });
  if (!version) return fail("Version not found.", 404);
  return new Response(version.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'self' data: https: 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors 'self'",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
});
