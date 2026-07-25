import { db } from "@/lib/db";
import { askDesignAssistant } from "@/lib/agents";
import { toJSON, parseJSON } from "@/lib/utils";
import { DesignDirectionSchema, CritiqueSchema, ApplicationBlueprintSchema } from "@/lib/design/schema";

// The conversational design assistant. Project context is assembled fresh on every
// message from the live database state, so the assistant always knows the current
// direction, blueprint, version and critique without the user re-explaining anything.

const MAX_HISTORY = 12;

/** A compact, factual snapshot of the project for the model. */
export async function buildProjectContext(projectId: string): Promise<string> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      directions: { orderBy: { version: "desc" }, take: 1 },
      references: { include: { reference: true } },
      generatedSites: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: { versions: { orderBy: { version: "desc" }, take: 5, include: { critiques: { orderBy: { createdAt: "desc" }, take: 1 } } } },
      },
    },
  });
  if (!project) return "Project not found.";

  const lines: string[] = [];
  lines.push(`Project: ${project.name}`);
  if (project.description) lines.push(`Brief: ${project.description}`);

  const req = parseJSON<Record<string, unknown>>(project.requirements, {});
  if (req?.business) lines.push(`Business: ${String(req.business).slice(0, 400)}`);
  if (Array.isArray(req?.target_audience) === false && req?.target_audience) lines.push(`Audience: ${String(req.target_audience)}`);
  if (Array.isArray(req?.goals) && req.goals.length) lines.push(`Goals: ${(req.goals as string[]).join("; ")}`);

  const dirRow = project.directions[0];
  if (dirRow) {
    const d = DesignDirectionSchema.parse(parseJSON(dirRow.direction, {}));
    lines.push(`Art direction: ${d.art_direction || "(unset)"} · atmosphere: ${d.atmosphere || "(unset)"}`);
    if (d.visual_concept) lines.push(`Visual concept: ${d.visual_concept}`);
    if (d.emotional_arc?.length) lines.push(`Emotional arc: ${d.emotional_arc.join(" → ")}`);
    if (d.signature_moment?.description) lines.push(`Signature moment: ${d.signature_moment.description}`);
    if (d.avoid?.length) lines.push(`Avoid: ${d.avoid.join("; ")}`);
  } else {
    lines.push("Art direction: not generated yet.");
  }

  if (project.blueprint) {
    const bp = ApplicationBlueprintSchema.parse(parseJSON(project.blueprint, {}));
    lines.push(`App blueprint: ${bp.app_type || "app"} — entities: ${(bp.entities ?? []).map((e) => e.name).join(", ") || "none"}; auth required: ${bp.auth?.required ? "yes" : "no"}`);
  }

  const site = project.generatedSites[0];
  const current = site?.versions.find((v) => v.id === site.currentVersionId) ?? site?.versions[0];
  if (current) {
    lines.push(`Current version: ${current.label || "v" + current.version} · score: ${current.overallScore ?? "n/a"}`);
    if (site && site.versions.length > 1) {
      lines.push(`Version history: ${site.versions.map((v) => `${v.label || "v" + v.version}(${v.overallScore ?? "-"})`).join(", ")}`);
    }
    const critRow = current.critiques[0];
    if (critRow) {
      const c = CritiqueSchema.parse(parseJSON(critRow.report, {}));
      const issues = c.issues.slice(0, 5).map((i) => `- ${i.category}: ${i.severity} — ${i.description}`);
      if (issues.length) lines.push(`Open critique issues:\n${issues.join("\n")}`);
      if (c.strengths?.length) lines.push(`Strengths: ${c.strengths.slice(0, 3).join("; ")}`);
    }
  } else {
    lines.push("No website generated yet.");
  }

  const refs = project.references.map((r) => r.reference.title || r.reference.sourceUrl).filter(Boolean);
  if (refs.length) lines.push(`References attached: ${refs.slice(0, 5).join(", ")}`);

  return lines.join("\n");
}

export async function listChat(projectId: string) {
  const rows = await db.chatMessage.findMany({ where: { projectId }, orderBy: { createdAt: "asc" }, take: 100 });
  return rows.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    model: m.modelMeta ? (parseJSON(m.modelMeta, null) as { provider: string; model: string } | null) : null,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function sendAssistantMessage(projectId: string, message: string) {
  const text = message.trim();
  if (!text) throw new Error("Type a message first.");

  await db.chatMessage.create({ data: { projectId, role: "user", content: text } });

  const [context, prior] = await Promise.all([
    buildProjectContext(projectId),
    db.chatMessage.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: MAX_HISTORY }),
  ]);

  // Oldest-first, excluding the message we just stored (it's sent separately).
  const history = prior
    .reverse()
    .slice(0, -1)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n")
    .slice(-6000);

  const res = await askDesignAssistant({ context, history, message: text });
  const reply = (res.text || "").trim() || "I couldn't produce a reply just now — try again.";

  const saved = await db.chatMessage.create({
    data: { projectId, role: "assistant", content: reply, modelMeta: toJSON({ provider: res.meta.provider, model: res.meta.model }) },
  });

  return {
    id: saved.id,
    content: reply,
    model: { provider: res.meta.provider, model: res.meta.model },
    usedFallback: res.usedFallback,
  };
}

export async function clearChat(projectId: string) {
  await db.chatMessage.deleteMany({ where: { projectId } });
}
