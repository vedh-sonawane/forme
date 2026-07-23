import { db } from "@/lib/db";
import { saveBuffer, readFileBase64, mimeFromExt } from "@/lib/storage/local";
import { captureUrl, browserAvailable } from "@/lib/render/browser";
import { analyzeReference, analyzeScreenshots } from "@/lib/agents";
import { guardUrl } from "@/lib/security/url-guard";
import { toJSON } from "@/lib/utils";
import type { ImageInput } from "@/lib/ai/types";

// Orchestrates reference analysis: safe capture/storage → vision DNA extraction →
// persistence. Used by the analyze API routes for both URLs and screenshots.

export type AnalysisResult = { referenceId: string; dnaId: string; usedFallback: boolean };

export async function runUrlAnalysis(input: { url: string; userId: string; projectId?: string; redesign?: boolean }): Promise<AnalysisResult> {
  const guard = await guardUrl(input.url);
  if (!guard.ok) throw new Error(guard.reason);

  const browser = await browserAvailable();

  // Create the reference + analysis row up front so state is trackable.
  const reference = await db.reference.create({
    data: { userId: input.userId, kind: "url", title: guard.url.hostname, sourceUrl: guard.url.toString() },
  });
  const analysis = await db.websiteAnalysis.create({
    data: { referenceId: reference.id, url: guard.url.toString(), status: "rendering" },
  });

  if (input.projectId) {
    await db.projectReference.create({ data: { projectId: input.projectId, referenceId: reference.id, role: input.redesign ? "redesign-target" : "inspiration" } }).catch(() => {});
  }

  const images: ImageInput[] = [];
  let structure: string | undefined;
  let htmlSignals: string | undefined;
  let title = guard.url.hostname;

  if (browser.available) {
    try {
      const cap = await captureUrl(guard.url.toString());
      title = cap.title || title;
      const full = await saveBuffer(`refs/${reference.id}`, cap.fullPage, { mime: "image/png", name: "full" });
      const vp = await saveBuffer(`refs/${reference.id}`, cap.viewport, { mime: "image/png", name: "viewport" });
      structure = toJSON(cap.structure);
      htmlSignals = toJSON(cap.htmlSignals);
      await db.websiteAnalysis.update({
        where: { id: analysis.id },
        data: { status: "analyzing", finalUrl: cap.finalUrl, title, fullScreenshot: full, viewportShots: toJSON([vp]), structure, htmlSignals },
      });
      await db.reference.update({ where: { id: reference.id }, data: { title } });
      // Feed the viewport screenshot (smaller) to vision for cost + reliability.
      images.push({ mimeType: "image/png", dataBase64: (await readFileBase64(vp)) });
    } catch (e) {
      await db.websiteAnalysis.update({ where: { id: analysis.id }, data: { status: "error", error: e instanceof Error ? e.message : "capture failed" } });
      // Continue: we can still attempt a text-only analysis from structure (none here) — but better to surface.
      throw new Error(`Rendering failed: ${e instanceof Error ? e.message : "unknown"}`);
    }
  } else {
    await db.websiteAnalysis.update({ where: { id: analysis.id }, data: { status: "analyzing", error: `No browser: ${browser.reason}` } });
  }

  const dna = await analyzeReference({ url: guard.url.toString(), structure, htmlSignals }, images);

  const profile = await db.designDNAProfile.create({
    data: {
      referenceId: reference.id,
      websiteAnalysisId: analysis.id,
      projectId: input.projectId ?? null,
      source: "url",
      profile: toJSON(dna.data),
      summary: dna.data.style?.visual_personality ?? null,
      modelMeta: toJSON(dna.meta),
    },
  });

  await db.websiteAnalysis.update({ where: { id: analysis.id }, data: { status: "done" } });

  return { referenceId: reference.id, dnaId: profile.id, usedFallback: dna.usedFallback };
}

export async function runScreenshotAnalysis(input: {
  files: { buffer: Buffer; mime: string; name: string }[];
  device?: string;
  note?: string;
  title?: string;
  userId: string;
  projectId?: string;
}): Promise<AnalysisResult> {
  if (input.files.length === 0) throw new Error("No files provided.");

  const reference = await db.reference.create({
    data: { userId: input.userId, kind: "screenshot", title: input.title || input.files[0].name || "Screenshot set", notes: input.note },
  });

  const savedPaths: string[] = [];
  const images: ImageInput[] = [];
  for (const f of input.files.slice(0, 6)) {
    const rel = await saveBuffer(`refs/${reference.id}`, f.buffer, { mime: f.mime, name: "shot" });
    savedPaths.push(rel);
    images.push({ mimeType: mimeFromExt(rel), dataBase64: f.buffer.toString("base64") });
  }
  // Store the first shot as the reference's filePath thumbnail.
  await db.reference.update({ where: { id: reference.id }, data: { filePath: savedPaths[0], fileMime: input.files[0].mime } });

  // Track each screenshot as a ScreenshotAnalysis row.
  const first = await db.screenshotAnalysis.create({
    data: { referenceId: reference.id, filePath: savedPaths[0], device: input.device, status: "analyzing" },
  });
  for (const p of savedPaths.slice(1)) {
    await db.screenshotAnalysis.create({ data: { referenceId: reference.id, filePath: p, device: input.device, status: "analyzing" } });
  }

  if (input.projectId) {
    await db.projectReference.create({ data: { projectId: input.projectId, referenceId: reference.id, role: "inspiration" } }).catch(() => {});
  }

  const dna = await analyzeScreenshots({ device: input.device, note: input.note, count: images.length }, images);

  const profile = await db.designDNAProfile.create({
    data: {
      referenceId: reference.id,
      screenshotAnalysisId: first.id,
      projectId: input.projectId ?? null,
      source: "screenshot",
      profile: toJSON(dna.data),
      summary: dna.data.style?.visual_personality ?? null,
      modelMeta: toJSON(dna.meta),
    },
  });

  await db.screenshotAnalysis.updateMany({ where: { referenceId: reference.id }, data: { status: "done" } });

  return { referenceId: reference.id, dnaId: profile.id, usedFallback: dna.usedFallback };
}
