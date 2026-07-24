import { db } from "@/lib/db";
import { saveBuffer, saveText, readFileBase64 } from "@/lib/storage/local";
import { captureHtml, browserAvailable } from "@/lib/render/browser";
import {
  analyzeRequirements,
  generateDirection,
  generateDesignSystem,
  planWebsite,
  synthesizeDNA,
  critiqueWebsite,
} from "@/lib/agents";
import { generateWebsiteCode, improveWebsiteCode } from "@/lib/agents/code";
import { toJSON, parseJSON } from "@/lib/utils";
import {
  DesignDNASchema,
  DesignDirectionSchema,
  DesignSystemSchema,
  RequirementsSchema,
  WebsitePlanSchema,
  CritiqueSchema,
  type DesignDNA,
  type Requirements,
} from "@/lib/design/schema";
import type { ImageInput } from "@/lib/ai/types";

// ── Requirements: derive structured requirements from the project's raw idea ─────
export async function ensureRequirements(project: { id: string; name: string; description: string | null; requirements: string | null }): Promise<Requirements> {
  const parsed = parseJSON<Record<string, unknown>>(project.requirements, {});
  // If already structured (has business/goals), reuse it.
  if (parsed && typeof parsed.business === "string" && parsed.business) {
    return RequirementsSchema.parse(parsed);
  }
  const raw = (parsed.rawIdea as string) || project.description || project.name;
  const res = await analyzeRequirements(raw, project.description ?? undefined);
  await db.project.update({ where: { id: project.id }, data: { requirements: toJSON(res.data) } });
  return res.data;
}

// ── Aggregate the attached references' Design DNA into one direction input ────────
export async function aggregateProjectDNA(projectId: string, intent?: string): Promise<DesignDNA | null> {
  const links = await db.projectReference.findMany({
    where: { projectId },
    include: { reference: { include: { dnaProfiles: { orderBy: { createdAt: "desc" }, take: 1 } } } },
  });
  const dnas: DesignDNA[] = [];
  for (const l of links) {
    const row = l.reference.dnaProfiles[0];
    if (row) dnas.push(DesignDNASchema.parse(parseJSON(row.profile, {})));
  }
  if (dnas.length === 0) return null;
  if (dnas.length === 1) return dnas[0];
  // Multiple references → synthesize shared principles + distinctive traits.
  const synth = await synthesizeDNA(dnas, intent);
  // Persist the synthesized DNA on the project.
  await db.designDNAProfile.create({
    data: { projectId, source: "synthesized", profile: toJSON(synth.data), summary: synth.data.style?.visual_personality ?? null, modelMeta: toJSON(synth.meta) },
  });
  return synth.data;
}

// ── Direction + Design System ─────────────────────────────────────────────────────
export async function generateProjectDirection(projectId: string) {
  const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  await db.project.update({ where: { id: projectId }, data: { status: "researching" } });

  const requirements = await ensureRequirements(project);
  const dna = await aggregateProjectDNA(projectId, requirements.business);

  const dir = await generateDirection(requirements, dna);
  const sys = await generateDesignSystem(dir.data, requirements.brand_colors);

  const lastDir = await db.designDirection.findFirst({ where: { projectId }, orderBy: { version: "desc" } });
  const version = (lastDir?.version ?? 0) + 1;

  const direction = await db.designDirection.create({
    data: { projectId, version, direction: toJSON(dir.data), summary: dir.data.visual_concept, modelMeta: toJSON(dir.meta) },
  });
  await db.designSystem.create({
    data: { projectId, directionId: direction.id, tokens: toJSON(sys.data), modelMeta: toJSON(sys.meta) },
  });

  await db.project.update({ where: { id: projectId }, data: { status: "directed" } });
  return { directionId: direction.id, usedFallback: dir.usedFallback || sys.usedFallback };
}

// ── Render + critique a version (shared by generate + improve) ────────────────────
async function renderAndCritique(versionId: string, html: string, ctx: { requirements: string; directionJson: string }) {
  const browser = await browserAvailable();
  let screenshotRel: string | null = null;
  let mobileRel: string | null = null;
  const images: ImageInput[] = [];

  if (browser.available) {
    try {
      const cap = await captureHtml(html);
      screenshotRel = await saveBuffer(`sites/${versionId}`, cap.desktop, { mime: "image/png", name: "desktop" });
      mobileRel = await saveBuffer(`sites/${versionId}`, cap.mobile, { mime: "image/png", name: "mobile" });
      images.push({ mimeType: "image/png", dataBase64: await readFileBase64(screenshotRel) });
      images.push({ mimeType: "image/png", dataBase64: await readFileBase64(mobileRel) });
    } catch (e) {
      console.error("[render] capture failed", e);
    }
  }

  const critique = await critiqueWebsite(images, ctx);

  await db.critique.create({ data: { versionId, overallScore: critique.data.overall_score, report: toJSON(critique.data), modelMeta: toJSON(critique.meta) } });
  await db.websiteVersion.update({ where: { id: versionId }, data: { screenshot: screenshotRel, mobileShot: mobileRel, overallScore: critique.data.overall_score } });
  return { score: critique.data.overall_score, critique: critique.data, rendered: !!screenshotRel };
}

// ── Generate a brand-new website (version 1) ──────────────────────────────────────
export async function generateProjectWebsite(projectId: string, directionId?: string) {
  const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  const requirements = await ensureRequirements(project);

  let dirRow = directionId
    ? await db.designDirection.findUnique({ where: { id: directionId }, include: { designSystems: { orderBy: { createdAt: "desc" }, take: 1 } } })
    : await db.designDirection.findFirst({ where: { projectId }, orderBy: { version: "desc" }, include: { designSystems: { orderBy: { createdAt: "desc" }, take: 1 } } });

  if (!dirRow) {
    await generateProjectDirection(projectId);
    dirRow = await db.designDirection.findFirst({ where: { projectId }, orderBy: { version: "desc" }, include: { designSystems: { orderBy: { createdAt: "desc" }, take: 1 } } });
  }
  if (!dirRow) throw new Error("Could not create a design direction.");

  const direction = DesignDirectionSchema.parse(parseJSON(dirRow.direction, {}));
  const sysRow = dirRow.designSystems[0];
  const system = sysRow ? DesignSystemSchema.parse(parseJSON(sysRow.tokens, {})) : DesignSystemSchema.parse({});

  await db.project.update({ where: { id: projectId }, data: { status: "generating" } });

  const plan = await planWebsite(requirements, direction);
  const code = await generateWebsiteCode({ requirements, direction, system, plan: WebsitePlanSchema.parse(plan.data) });

  const site = await db.generatedWebsite.create({
    data: { projectId, directionId: dirRow.id, kind: "new", title: `${project.name} — v1`, status: "rendered" },
  });
  const htmlPath = await saveText(`sites/html`, `${site.id}-v1.html`, code.html);
  const version = await db.websiteVersion.create({
    data: { websiteId: site.id, version: 1, label: "v1", html: code.html, changeNote: code.source === "llm" ? "Initial AI generation." : "Initial generation (baseline renderer)." },
  });
  void htmlPath;

  await db.project.update({ where: { id: projectId }, data: { status: "critiquing" } });
  const result = await renderAndCritique(version.id, code.html, { requirements: JSON.stringify(requirements), directionJson: JSON.stringify(direction) });

  await db.generatedWebsite.update({ where: { id: site.id }, data: { currentVersionId: version.id, status: "critiqued" } });
  await db.project.update({ where: { id: projectId }, data: { status: "ready" } });

  return { websiteId: site.id, versionId: version.id, score: result.score, usedFallback: code.usedFallback };
}

// ── Redesign: preserve brand/content/purpose, fix the original's weaknesses ────────
export async function redesignProjectWebsite(projectId: string) {
  const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });

  // Find the redesign target (the existing site the user wants improved).
  const targetLink = await db.projectReference.findFirst({
    where: { projectId, role: "redesign-target" },
    orderBy: { createdAt: "desc" },
    include: { reference: { include: { dnaProfiles: { orderBy: { createdAt: "desc" }, take: 1 }, websiteAnalysis: true } } },
  });
  if (!targetLink) throw new Error("Attach a redesign target first (a website URL or screenshot of the existing design).");

  const target = targetLink.reference;
  const dnaRow = target.dnaProfiles[0];
  if (!dnaRow) throw new Error("The redesign target hasn't finished analysis yet. Try again in a moment.");
  const targetDNA = DesignDNASchema.parse(parseJSON(dnaRow.profile, {}));

  await db.project.update({ where: { id: projectId }, data: { status: "researching" } });

  // Base requirements, then augment with redesign constraints derived from the original.
  const base = await ensureRequirements(project);
  const weaknesses = (targetDNA.weaknesses ?? []).slice(0, 8);
  const originalPalette = (targetDNA.color?.palette ?? []).map((c) => c.hex).filter(Boolean);
  const requirements: Requirements = {
    ...base,
    industry: base.industry || targetDNA.style?.industry || "",
    target_audience: base.target_audience || targetDNA.style?.target_audience || "",
    brand_colors: base.brand_colors.length ? base.brand_colors : originalPalette,
    must_include: Array.from(new Set([...base.must_include, "Preserve the original brand identity, core content, and business purpose"])),
    constraints: Array.from(new Set([
      ...base.constraints,
      "This is a REDESIGN: keep what works, do not invent a new brand",
      ...weaknesses.map((w) => `Fix weakness of the original: ${w}`),
    ])),
  };

  // Direction is built from the ORIGINAL's DNA so the redesign stays recognizably on-brand.
  const dir = await generateDirection(requirements, targetDNA);
  const sys = await generateDesignSystem(dir.data, requirements.brand_colors);

  const lastDir = await db.designDirection.findFirst({ where: { projectId }, orderBy: { version: "desc" } });
  const version = (lastDir?.version ?? 0) + 1;
  const direction = await db.designDirection.create({
    data: { projectId, version, direction: toJSON(dir.data), summary: dir.data.visual_concept, modelMeta: toJSON(dir.meta) },
  });
  await db.designSystem.create({ data: { projectId, directionId: direction.id, tokens: toJSON(sys.data), modelMeta: toJSON(sys.meta) } });

  await db.project.update({ where: { id: projectId }, data: { status: "generating" } });

  const plan = await planWebsite(requirements, dir.data);
  const code = await generateWebsiteCode({ requirements, direction: dir.data, system: sys.data, plan: WebsitePlanSchema.parse(plan.data) });

  const site = await db.generatedWebsite.create({
    data: { projectId, directionId: direction.id, kind: "redesign", title: `${target.title || project.name} — redesign`, status: "rendered" },
  });
  await saveText(`sites/html`, `${site.id}-v1.html`, code.html);
  const newVersion = await db.websiteVersion.create({
    data: { websiteId: site.id, version: 1, label: "redesign v1", html: code.html, changeNote: "Redesign preserving brand & content while fixing the original's weaknesses." },
  });

  await db.project.update({ where: { id: projectId }, data: { status: "critiquing" } });
  const result = await renderAndCritique(newVersion.id, code.html, { requirements: JSON.stringify(requirements), directionJson: JSON.stringify(dir.data) });

  await db.generatedWebsite.update({ where: { id: site.id }, data: { currentVersionId: newVersion.id, status: "critiqued" } });
  await db.project.update({ where: { id: projectId }, data: { status: "ready" } });

  return { websiteId: site.id, versionId: newVersion.id, directionId: direction.id, score: result.score, usedFallback: code.usedFallback || dir.usedFallback };
}

// ── Improve: one critique-driven iteration with regression detection ──────────────
export async function improveWebsite(websiteId: string) {
  const site = await db.generatedWebsite.findUniqueOrThrow({
    where: { id: websiteId },
    include: { project: true, versions: { orderBy: { version: "desc" }, take: 1, include: { critiques: { orderBy: { createdAt: "desc" }, take: 1 } } }, direction: { include: { designSystems: { orderBy: { createdAt: "desc" }, take: 1 } } } },
  });
  const current = site.versions[0];
  if (!current) throw new Error("No version to improve.");
  const critRow = current.critiques[0];
  if (!critRow) throw new Error("Current version has no critique to improve from.");

  const project = site.project;
  const requirements = await ensureRequirements(project);
  const direction = site.direction ? DesignDirectionSchema.parse(parseJSON(site.direction.direction, {})) : DesignDirectionSchema.parse({});
  const sysRow = site.direction?.designSystems?.[0];
  const system = sysRow ? DesignSystemSchema.parse(parseJSON(sysRow.tokens, {})) : DesignSystemSchema.parse({});
  const plan = WebsitePlanSchema.parse((await planWebsite(requirements, direction)).data);
  const critique = CritiqueSchema.parse(parseJSON(critRow.report, {}));

  const scoreBefore = current.overallScore ?? critique.overall_score;

  const improved = await improveWebsiteCode({ html: current.html, system, direction, requirements, plan, critique });

  const nextVersionNum = current.version + 1;
  const newVersion = await db.websiteVersion.create({
    data: {
      websiteId: site.id,
      version: nextVersionNum,
      label: `v${nextVersionNum}`,
      html: improved.html,
      parentVersionId: current.id,
      changeNote: improved.changeNote,
    },
  });
  await saveText(`sites/html`, `${site.id}-v${nextVersionNum}.html`, improved.html);

  const result = await renderAndCritique(newVersion.id, improved.html, { requirements: JSON.stringify(requirements), directionJson: JSON.stringify(direction) });
  const scoreAfter = result.score;

  // Regression detection: keep the improvement only if it didn't reduce quality.
  const regression = scoreAfter < scoreBefore - 1.5;
  const accepted = !regression;

  await db.improvementIteration.create({
    data: {
      fromVersionId: current.id,
      toVersionId: newVersion.id,
      iteration: nextVersionNum - 1,
      targetedIssues: toJSON(critique.issues.slice(0, 6).map((i) => i.category)),
      scoreBefore,
      scoreAfter,
      accepted,
      regression,
      note: improved.changeNote,
      modelMeta: toJSON(improved.meta),
    },
  });

  if (accepted) {
    await db.generatedWebsite.update({ where: { id: site.id }, data: { currentVersionId: newVersion.id } });
  }

  return { versionId: newVersion.id, scoreBefore, scoreAfter, accepted, regression, changeNote: improved.changeNote };
}
