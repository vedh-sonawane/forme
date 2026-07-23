import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import { ok, fail, readJson, handler } from "@/lib/api";
import { toJSON } from "@/lib/utils";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const project = await db.project.findFirst({
    where: { id, userId },
    include: {
      references: { include: { reference: { include: { websiteAnalysis: true } } } },
      dnaProfiles: { orderBy: { createdAt: "desc" } },
      directions: { orderBy: { version: "desc" } },
      designSystems: { orderBy: { createdAt: "desc" } },
      generatedSites: {
        orderBy: { updatedAt: "desc" },
        include: { versions: { orderBy: { version: "desc" }, include: { critiques: { orderBy: { createdAt: "desc" } } } } },
      },
    },
  });
  if (!project) return fail("Project not found.", 404);
  return ok(project);
});

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const body = await readJson<{ name?: string; description?: string; requirements?: unknown; status?: string }>(req);
  const existing = await db.project.findFirst({ where: { id, userId } });
  if (!existing) return fail("Project not found.", 404);
  const project = await db.project.update({
    where: { id },
    data: {
      name: body?.name?.trim() || undefined,
      description: body?.description !== undefined ? body?.description?.trim() || null : undefined,
      requirements: body?.requirements !== undefined ? toJSON(body.requirements) : undefined,
      status: body?.status || undefined,
    },
  });
  return ok(project);
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  const existing = await db.project.findFirst({ where: { id, userId } });
  if (!existing) return fail("Project not found.", 404);
  await db.project.delete({ where: { id } });
  return ok({ deleted: true });
});
