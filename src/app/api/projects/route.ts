import { db } from "@/lib/db";
import { currentUserId } from "@/lib/user";
import { ok, fail, readJson, handler } from "@/lib/api";
import { toJSON } from "@/lib/utils";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const userId = await currentUserId();
  const projects = await db.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { references: true, dnaProfiles: true, generatedSites: true, directions: true } },
    },
  });
  return ok(projects);
});

export const POST = handler(async (req: Request) => {
  const userId = await currentUserId();
  const body = await readJson<{ name?: string; description?: string; requirements?: unknown }>(req);
  const name = body?.name?.trim();
  if (!name) return fail("Project name is required.");
  const project = await db.project.create({
    data: {
      userId,
      name,
      description: body?.description?.trim() || null,
      requirements: body?.requirements ? toJSON(body.requirements) : null,
    },
  });
  return ok(project, { status: 201 });
});
