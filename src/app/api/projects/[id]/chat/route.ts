import { currentUserId } from "@/lib/user";
import { db } from "@/lib/db";
import { ok, fail, readJson, handler } from "@/lib/api";
import { listChat, sendAssistantMessage, clearChat } from "@/lib/services/assistant";

export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

async function owned(id: string) {
  const userId = await currentUserId();
  return db.project.findFirst({ where: { id, userId } });
}

// GET → conversation history · POST → send a message · DELETE → clear the thread
export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!(await owned(id))) return fail("Project not found.", 404);
  return ok({ messages: await listChat(id) });
});

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!(await owned(id))) return fail("Project not found.", 404);
  const body = await readJson<{ message?: string }>(req);
  const message = body?.message?.trim();
  if (!message) return fail("Type a message first.");
  const reply = await sendAssistantMessage(id, message);
  return ok(reply, { status: 201 });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!(await owned(id))) return fail("Project not found.", 404);
  await clearChat(id);
  return ok({ cleared: true });
});
