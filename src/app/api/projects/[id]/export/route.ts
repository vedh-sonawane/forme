import { currentUserId } from "@/lib/user";
import { db } from "@/lib/db";
import { fail, handler } from "@/lib/api";
import { exportProject, exportApplication } from "@/lib/services/export";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// Download a project as a .zip.
//   ?mode=site (default) → the generated website + Design DNA / system / versions
//   ?mode=app            → a complete runnable Next.js app built from the Blueprint
export const GET = handler(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const project = await db.project.findFirst({ where: { id, userId } });
  if (!project) return fail("Project not found.", 404);

  const mode = new URL(req.url).searchParams.get("mode") === "app" ? "app" : "site";

  if (mode === "app") {
    const app = await exportApplication(id);
    if ("error" in app) return fail(app.error, 400);
    return new Response(new Uint8Array(app.zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${app.filename}"`,
        "Content-Length": String(app.zip.length),
        "Cache-Control": "no-store",
      },
    });
  }

  const result = await exportProject(id);
  if (!result) return fail("Nothing to export yet — generate a website first.", 400);

  return new Response(new Uint8Array(result.zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Content-Length": String(result.zip.length),
      "Cache-Control": "no-store",
    },
  });
});
