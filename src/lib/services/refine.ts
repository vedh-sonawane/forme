import { db } from "@/lib/db";
import { guardUrl } from "@/lib/security/url-guard";
import { captureUrlCode, browserAvailable } from "@/lib/render/browser";
import { refineWebsiteCode, chatEditWebsite } from "@/lib/agents/code";

// ── Import a real site's code and refine it ────────────────────────────────────────
// Captures the ACTUAL HTML of a URL, stores it as the "original" version, then runs
// one AI refinement pass that keeps all content/links but elevates the design. Fast:
// no full pipeline, no critique — just capture + one refine call.
export async function importAndRefine(url: string, userId: string) {
  const guard = await guardUrl(url);
  if (!guard.ok) throw new Error(guard.reason);
  const browser = await browserAvailable();
  if (!browser.available) throw new Error(`Browser rendering unavailable: ${browser.reason}. Run: npm run playwright:install`);

  const cap = await captureUrlCode(guard.url.toString());
  const name = (cap.title || guard.url.hostname).slice(0, 80);

  const project = await db.project.create({
    data: { userId, name, description: `Refined from ${cap.finalUrl}`, status: "ready" },
  });
  const site = await db.generatedWebsite.create({
    data: { projectId: project.id, kind: "refined", title: name, status: "rendered" },
  });
  const original = await db.websiteVersion.create({
    data: { websiteId: site.id, version: 1, label: "Original (imported)", html: cap.html, changeNote: `Imported real code from ${cap.finalUrl}` },
  });

  const refined = await refineWebsiteCode({ url: cap.finalUrl, html: cap.html });
  const refinedVersion = await db.websiteVersion.create({
    data: {
      websiteId: site.id,
      version: 2,
      label: "Refined",
      html: refined.html,
      parentVersionId: original.id,
      changeNote: refined.usedFallback ? "Refinement unavailable (kept original)." : "AI refinement: elevated design, fixed generic sections, added subtle motion.",
    },
  });
  await db.generatedWebsite.update({ where: { id: site.id }, data: { currentVersionId: refinedVersion.id } });

  return {
    projectId: project.id,
    siteId: site.id,
    originalVersionId: original.id,
    refinedVersionId: refinedVersion.id,
    refinedFallback: refined.usedFallback,
  };
}

// ── Chat copilot: apply a natural-language edit (new version) or answer ─────────────
export async function chatEditVersion(versionId: string, message: string, userId: string) {
  const version = await db.websiteVersion.findFirst({
    where: { id: versionId, website: { project: { userId } } },
    include: { website: true },
  });
  if (!version) throw new Error("Version not found.");

  const result = await chatEditWebsite({ html: version.html, message });
  if (result.action !== "edit" || !result.html) {
    return { action: "answer" as const, reply: result.reply };
  }

  const last = await db.websiteVersion.findFirst({ where: { websiteId: version.websiteId }, orderBy: { version: "desc" } });
  const nextNum = (last?.version ?? version.version) + 1;
  const created = await db.websiteVersion.create({
    data: {
      websiteId: version.websiteId,
      version: nextNum,
      label: "Edit",
      html: result.html,
      parentVersionId: version.id,
      changeNote: result.reply.slice(0, 200),
    },
  });
  await db.generatedWebsite.update({ where: { id: version.websiteId }, data: { currentVersionId: created.id } });

  return { action: "edit" as const, reply: result.reply, versionId: created.id };
}
