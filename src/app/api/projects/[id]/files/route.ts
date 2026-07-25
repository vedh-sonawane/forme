import { currentUserId } from "@/lib/user";
import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { buildProjectApp } from "@/lib/services/export";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// Project file explorer.
//   GET                → the generated application's file tree (path + size)
//   GET ?path=<file>   → that file's contents
export const GET = handler(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const project = await db.project.findFirst({ where: { id, userId } });
  if (!project) return fail("Project not found.", 404);

  const built = await buildProjectApp(id);
  if ("error" in built) return fail(built.error, 400);

  const wanted = new URL(req.url).searchParams.get("path");
  if (wanted) {
    const file = built.files.find((f) => f.path === wanted);
    if (!file) return fail("File not found.", 404);
    return ok({ path: file.path, content: file.content, size: file.content.length });
  }

  return ok({
    appName: built.appName,
    slug: built.slug,
    files: built.files
      .map((f) => ({ path: f.path, size: f.content.length }))
      .sort((a, b) => a.path.localeCompare(b.path)),
  });
});
