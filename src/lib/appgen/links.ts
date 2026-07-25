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
function bestRoute(text: string, routes: AppRoute[]): string | null {
  const w = words(text);
  if (!w.length) return null;
  let best: string | null = null;
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
  return best;
}

/**
 * Labels that promise entry to the product. These have to leave the marketing page.
 *
 * A landing page authored in isolation has nowhere to send them, so the model wires them
 * to whatever section looks closest — and the result is a funnel that loops: "Start
 * Learning Free" scrolls to a call-to-action block whose buttons scroll back to the hero.
 * Every click does something, nothing reaches the app.
 *
 * Deliberately narrow: it matches conversion verbs, not navigation. "How It Works",
 * "Subjects" and "Pricing" stay as in-page anchors, which is what they should be.
 */
const PRODUCT_INTENT =
  /\b(get\s?started|start(?:\s+(?:learning|now|free|here|building|your))?|sign\s?up|signup|sign\s?in|log\s?in|login|register|create\s+(?:\w+\s+){0,3}?(?:account|profile)|join(?:\s+free|\s+now)?|enroll|try\s+(?:it\s+)?(?:free|now)|free\s+trial|launch|open\s+(?:the\s+)?app|go\s+to\s+(?:the\s+)?(?:app|dashboard)|dashboard|(?:book|request)\s+a\s+demo|take\s+(?:a|the)\s+tour|\btour\b)\b/i;

/** Of those, the ones that mean "I don't have an account yet". */
const SIGNUP_INTENT =
  /\b(sign\s?up|signup|register|create\s+(?:\w+\s+){0,3}?(?:account|profile)|get\s?started|start\s+(?:learning\s+)?free|join|enroll|try\s+(?:it\s+)?free|free\s+trial)\b/i;

/**
 * Point marketing links at the real application.
 *
 * Two cases are rewritten: anchors that go nowhere (`#`, empty, or `#section` with no
 * such section), and anchors whose label promises the product but which only scroll to
 * another part of the page. Ordinary in-page navigation is left alone.
 */
export function retargetMarketingLinks(
  html: string,
  routes: AppRoute[],
  fallback: string,
  /** Where "create an account" should land, when the app has a sign-up page. */
  signupHref?: string
): string {
  if (!html) return html;
  const targets = anchorTargets(html);

  return html.replace(
    /<a\b([^>]*?)href\s*=\s*["']([^"']*)["']([^>]*)>([\s\S]*?)<\/a>/gi,
    (full, pre: string, href: string, post: string, inner: string) => {
      const h = href.trim();
      const label = inner.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      const dead = h === "" || h === "#" || (h.startsWith("#") && !targets.has(h.slice(1)));
      const loops = h.startsWith("#") && PRODUCT_INTENT.test(label);
      if (!dead && !loops) return full;

      // "Create Free Student Account" names a route word ("student") but isn't a request
      // to open that page — it's a request to join. Sign-up intent therefore outranks
      // route matching; every other CTA falls through to the closest named route.
      const target =
        signupHref && SIGNUP_INTENT.test(label) ? signupHref : bestRoute(label, routes) ?? fallback;
      return `<a${pre}href="${target}"${post}>${inner}</a>`;
    }
  );
}
