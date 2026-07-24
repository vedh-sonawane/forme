import { parseJSON } from "@/lib/utils";
import { DesignDNASchema, DesignDirectionSchema, DesignSystemSchema, CritiqueSchema, type Requirements } from "@/lib/design/schema";

// Convert Prisma rows (Dates + JSON-as-TEXT) into plain, parsed objects safe to pass
// to client components. Keeps the client free of Prisma types and JSON parsing.

const fileUrl = (rel: string | null | undefined) => (rel ? `/api/files/${rel}` : null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeProject(p: any) {
  const requirements = parseJSON<Partial<Requirements> & { rawIdea?: string }>(p.requirements, {});

  const references = ((p.references ?? []) as any[]).map((pr: any) => {
    const r = pr.reference;
    const dnaRow = r.dnaProfiles?.[0];
    const dna = dnaRow ? DesignDNASchema.parse(parseJSON(dnaRow.profile, {})) : null;
    const thumb =
      r.kind === "screenshot"
        ? fileUrl(r.filePath)
        : fileUrl(r.websiteAnalysis?.fullScreenshot) ?? fileUrl(parseJSON<string[]>(r.websiteAnalysis?.viewportShots, [])[0]);
    return {
      id: r.id,
      role: pr.role,
      kind: r.kind,
      title: r.title,
      sourceUrl: r.sourceUrl,
      thumb,
      hasDna: !!dnaRow,
      dnaSummary: dnaRow?.summary ?? null,
      dnaWeaknesses: dna?.weaknesses ?? [],
      dnaStrengths: dna?.strengths ?? [],
      dnaStyle: dna?.style?.primary_style ?? null,
    };
  });

  const directions = ((p.directions ?? []) as any[]).map((d: any) => {
    const sys = d.designSystems?.[0];
    return {
      id: d.id,
      version: d.version,
      approved: d.approved,
      summary: d.summary,
      direction: DesignDirectionSchema.parse(parseJSON(d.direction, {})),
      systemId: sys?.id ?? null,
      system: sys ? DesignSystemSchema.parse(parseJSON(sys.tokens, {})) : null,
      model: d.modelMeta ? (parseJSON(d.modelMeta, null) as { provider: string; model: string } | null) : null,
    };
  });

  const sites = ((p.generatedSites ?? []) as any[]).map((s: any) => ({
    id: s.id,
    kind: s.kind,
    status: s.status,
    title: s.title,
    directionId: s.directionId ?? null,
    currentVersionId: s.currentVersionId,
    versions: ((s.versions ?? []) as any[]).map((v: any) => {
      const crit = v.critiques?.[0];
      return {
        id: v.id,
        version: v.version,
        label: v.label,
        score: v.overallScore,
        changeNote: v.changeNote,
        screenshotUrl: fileUrl(v.screenshot),
        mobileUrl: fileUrl(v.mobileShot),
        parentVersionId: v.parentVersionId,
        critique: crit ? CritiqueSchema.parse(parseJSON(crit.report, {})) : null,
        critiqueModel: crit?.modelMeta ? (parseJSON(crit.modelMeta, null) as { provider: string; model: string } | null) : null,
        model: v.modelMeta ? (parseJSON(v.modelMeta, null) as { provider: string; model: string; usedFallback: boolean; source: string } | null) : null,
        createdAt: v.createdAt?.toISOString?.() ?? String(v.createdAt),
      };
    }),
  }));

  const dnaProfiles = ((p.dnaProfiles ?? []) as any[]).map((d: any) => ({
    id: d.id,
    source: d.source,
    summary: d.summary,
    dna: DesignDNASchema.parse(parseJSON(d.profile, {})),
  }));

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    requirements,
    references,
    directions,
    sites,
    dnaProfiles,
  };
}

export type SerializedProject = ReturnType<typeof serializeProject>;
