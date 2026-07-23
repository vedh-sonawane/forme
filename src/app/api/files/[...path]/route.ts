import { readFile, mimeFromExt } from "@/lib/storage/local";
import { handler, fail } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ path: string[] }> };

// Serve stored artifacts (screenshots, captures) from local storage. Path traversal
// is blocked inside storage/local.ts safeJoin().
export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const { path } = await ctx.params;
  const rel = path.join("/");
  if (rel.includes("..")) return fail("Invalid path", 400);
  try {
    const buf = await readFile(rel);
    const mime = mimeFromExt(rel);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        // Stored artifacts may include captured (untrusted) site imagery; never allow
        // them to be interpreted as active content in our origin.
        "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return fail("File not found", 404);
  }
});
