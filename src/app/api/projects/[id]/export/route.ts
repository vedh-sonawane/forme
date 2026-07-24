import { currentUserId } from "@/lib/user";
import { db } from "@/lib/db";
import { fail, handler } from "@/lib/api";
import { exportProject } from "@/lib/services/export";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// Download a project as a .zip (runnable index.html + Design DNA / system / versions).
export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const project = await db.project.findFirst({ where: { id, userId } });
  if (!project) return fail("Project not found.", 404);

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
