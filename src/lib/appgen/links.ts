// The generated marketing site is authored as a standalone page, so its calls-to-action
// point at in-page anchors — and the ones that describe a product action ("Adopt a
// recording →") have no section to jump to, so they resolve to href="#" and bounce the
// visitor back to the top of the page. Once that site is mounted in front of a real
// application we know the routes those CTAs *meant*, so we re-target them.

export type AppRoute = { href: string; label: string };

const STOP = new Set(["the", "and", "for", "our", "your", "you", "get", "now", "all", "with", "from", "into", "out", "let", "its", "more", "see", "here", "this", "that", "start", "learn"]);

const words = (s: string): string[] =>
  (s.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length > 2 && !STOP.has(w));

/** Collect every anchor target the document actually defines. */
function anchorTargets(html: string): Set<string> {
  const ids = new Set<string>();
  for (const m of html.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)) ids.add(m[1]);
  for (const m of html.matchAll(/<a\b[^>]*\sname\s*=\s*["']([^"']+)["']/gi)) ids.add(m[1]);
  return ids;
}

/**
 * Best route for a CTA's label. Words earlier in the label weigh more, so
 * "Adopt a recording" resolves to /adoptions rather than /recordings — the verb is
 * what the visitor is being invited to do.
 */
function bestRoute(text: string, routes: AppRoute[], fallback: string): string {
  const w = words(text);
  if (!w.length) return fallback;
  let best = fallback;
  let bestScore = 0;
  for (const r of routes) {
    const keys = new Set([...words(r.label), ...words(r.href)]);
    let score = 0;
    w.forEach((t, i) => {
      for (const k of keys) {
        if (k === t || k.startsWith(t) || t.startsWith(k)) { score += w.length - i; break; }
      }
    });
    if (score > bestScore) { bestScore = score; best = r.href; }
  }
  return bestScore > 0 ? best : fallback;
}

/**
 * Point dead anchors (`#`, empty, or `#section` with no such section) at the real
 * application route their label describes. Working in-page anchors are left alone.
 */
export function retargetMarketingLinks(html: string, routes: AppRoute[], fallback: string): string {
  if (!html) return html;
  const targets = anchorTargets(html);

  return html.replace(
    /<a\b([^>]*?)href\s*=\s*["']([^"']*)["']([^>]*)>([\s\S]*?)<\/a>/gi,
    (full, pre: string, href: string, post: string, inner: string) => {
      const h = href.trim();
      const dead = h === "" || h === "#" || (h.startsWith("#") && !targets.has(h.slice(1)));
      if (!dead) return full;
      const label = inner.replace(/<[^>]*>/g, " ");
      return `<a${pre}href="${bestRoute(label, routes, fallback)}"${post}>${inner}</a>`;
    }
  );
}
