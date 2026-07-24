import JSZip from "jszip";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import { handler, fail } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// Download a version's code as a ZIP (index.html + a short README).
export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const version = await db.websiteVersion.findFirst({
    where: { id, website: { project: { userId } } },
    include: { website: { include: { project: true } } },
  });
  if (!version) return fail("Version not found.", 404);

  const name = (version.website.project.name || "site").replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").toLowerCase() || "site";
  const zip = new JSZip();
  zip.file("index.html", version.html);
  zip.file(
    "README.txt",
    `${version.website.project.name} — exported from FORME\nVersion: ${version.label || "v" + version.version}\n\nOpen index.html in any browser. This is a self-contained page.\n`
  );
  const buf = await zip.generateAsync({ type: "nodebuffer" });

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${name}-${version.label || "v" + version.version}.zip"`,
      "Cache-Control": "no-store",
    },
  });
});
