import { env } from "@/lib/env";

// Real photography for generated sites. Unsplash is primary (better-curated, more
// editorial imagery); Pexels is the fallback (higher rate limit, no attribution
// requirement) and covers Unsplash returning nothing or being rate-limited.

export type Photo = {
  url: string; // full-size (already width-capped)
  thumb: string; // small preview
  alt: string;
  credit: string; // "Photo by X on Unsplash"
  creditUrl: string;
  color: string; // dominant colour → used as a placeholder background (no layout shift)
  source: "unsplash" | "pexels";
};

export type Orientation = "landscape" | "portrait" | "squarish";

const cache = new Map<string, Photo | null>();

async function unsplash(query: string, orientation: Orientation): Promise<Photo | null> {
  const key = env.unsplashAccessKey.trim();
  if (!key) return null;
  try {
    const o = orientation === "squarish" ? "squarish" : orientation;
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=${o}&content_filter=high`,
      { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" } }
    );
    if (!res.ok) return null;
    const j = (await res.json()) as {
      results?: Array<{
        urls?: { regular?: string; small?: string };
        alt_description?: string;
        description?: string;
        color?: string;
        links?: { html?: string };
        user?: { name?: string; links?: { html?: string } };
      }>;
    };
    const p = j.results?.[0];
    if (!p?.urls?.regular) return null;
    return {
      url: p.urls.regular,
      thumb: p.urls.small ?? p.urls.regular,
      alt: (p.alt_description || p.description || query).slice(0, 140),
      credit: `Photo by ${p.user?.name ?? "Unsplash"} on Unsplash`,
      creditUrl: p.user?.links?.html ?? p.links?.html ?? "https://unsplash.com",
      color: p.color || "#e5e5e5",
      source: "unsplash",
    };
  } catch {
    return null;
  }
}

async function pexels(query: string, orientation: Orientation): Promise<Photo | null> {
  const key = env.pexelsApiKey.trim();
  if (!key) return null;
  try {
    const o = orientation === "squarish" ? "square" : orientation;
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=${o}`,
      { headers: { Authorization: key } }
    );
    if (!res.ok) return null;
    const j = (await res.json()) as {
      photos?: Array<{ src?: { large?: string; medium?: string }; alt?: string; avg_color?: string; url?: string; photographer?: string; photographer_url?: string }>;
    };
    const p = j.photos?.[0];
    if (!p?.src?.large) return null;
    return {
      url: p.src.large,
      thumb: p.src.medium ?? p.src.large,
      alt: (p.alt || query).slice(0, 140),
      credit: `Photo by ${p.photographer ?? "Pexels"} on Pexels`,
      creditUrl: p.photographer_url ?? p.url ?? "https://pexels.com",
      color: p.avg_color || "#e5e5e5",
      source: "pexels",
    };
  } catch {
    return null;
  }
}

export function imagesConfigured(): boolean {
  return env.unsplashAccessKey.trim().length > 0 || env.pexelsApiKey.trim().length > 0;
}

/** Unsplash first, Pexels fallback. Cached per (query, orientation) within a run. */
export async function findPhoto(query: string, orientation: Orientation = "landscape"): Promise<Photo | null> {
  const q = (query || "").trim().slice(0, 90);
  if (!q) return null;
  const cacheKey = `${q}::${orientation}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;
  const photo = (await unsplash(q, orientation)) ?? (await pexels(q, orientation));
  cache.set(cacheKey, photo);
  return photo;
}

/**
 * Resolve <img data-image="query" data-orientation="landscape"> placeholders the AI
 * emits into real photography: lazy-loaded, dimension-hinted (no layout shift), with a
 * dominant-colour placeholder and photographer attribution.
 * Unresolvable placeholders are removed so a broken image never ships.
 */
export async function resolveImagePlaceholders(html: string): Promise<string> {
  if (!html || !imagesConfigured()) return html.replace(/<img[^>]*\sdata-image=[^>]*>/gi, "");

  const tags = Array.from(html.matchAll(/<img[^>]*\sdata-image=("([^"]*)"|'([^']*)')[^>]*>/gi));
  if (!tags.length) return html;

  let out = html;
  for (const m of tags.slice(0, 12)) {
    const tag = m[0];
    const query = (m[2] ?? m[3] ?? "").trim();
    const orient = (/data-orientation=("|')([a-z]+)\1/i.exec(tag)?.[2] ?? "landscape") as Orientation;
    const cls = /class=("|')([^"']*)\1/i.exec(tag)?.[2] ?? "";
    const styleMatch = /style=("|')([^"']*)\1/i.exec(tag)?.[2] ?? "";

    const photo = await findPhoto(query, orient);
    if (!photo) {
      out = out.replace(tag, "");
      continue;
    }
    const dims = orient === "portrait" ? 'width="800" height="1200"' : orient === "squarish" ? 'width="900" height="900"' : 'width="1200" height="800"';
    const replacement =
      `<img src="${photo.url}" alt="${photo.alt.replace(/"/g, "&quot;")}" ${dims} loading="lazy" decoding="async" ` +
      `class="${cls}" style="background:${photo.color};object-fit:cover;${styleMatch}" ` +
      `title="${photo.credit.replace(/"/g, "&quot;")}" data-credit="${photo.credit.replace(/"/g, "&quot;")}" data-credit-url="${photo.creditUrl}" />`;
    out = out.replace(tag, replacement);
  }
  return out;
}
