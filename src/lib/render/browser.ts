import { env } from "@/lib/env";
import { guardUrl, isPrivateAddress } from "@/lib/security/url-guard";

// Isolated, sandboxed browser rendering via Playwright (Chromium).
// - Playwright is imported lazily so the app boots even if browsers aren't installed.
// - Downloads are blocked; navigation has strict timeouts.
// - Redirects are re-validated against the SSRF guard (no localhost/private hops).
// - Untrusted pages run in a throwaway context with JS from the page treated as data.

export type BrowserAvailability = { available: boolean; reason?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _chromium: any = null;

async function getChromium() {
  if (_chromium) return _chromium;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pw = await import("playwright");
  _chromium = pw.chromium;
  return _chromium;
}

export async function browserAvailable(): Promise<BrowserAvailability> {
  if (env.disablePlaywright) return { available: false, reason: "Playwright disabled via env." };
  try {
    const chromium = await getChromium();
    const path = chromium.executablePath();
    // executablePath throws if not installed in some versions; also check truthy
    if (!path) return { available: false, reason: "Chromium not installed. Run: npm run playwright:install" };
    return { available: true };
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : "Playwright unavailable" };
  }
}

async function launch() {
  const chromium = await getChromium();
  return chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-background-networking",
      "--no-first-run",
    ],
  });
}

export type UrlCapture = {
  finalUrl: string;
  title: string;
  fullPage: Buffer;
  viewport: Buffer;
  structure: PageStructure;
  htmlSignals: StyleSignals;
};

export type PageStructure = {
  title: string;
  description: string;
  headings: { level: number; text: string }[];
  navLinks: string[];
  sections: { tag: string; role: string; textPreview: string }[];
  ctas: string[];
  imageCount: number;
};

export type StyleSignals = {
  fonts: string[];
  colors: string[];
  backgrounds: string[];
  radii: string[];
  buttonCount: number;
};

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

/** Safely render a public URL and capture screenshots + structure. */
export async function captureUrl(rawUrl: string): Promise<UrlCapture> {
  const guard = await guardUrl(rawUrl);
  if (!guard.ok) throw new Error(`URL blocked: ${guard.reason}`);

  const browser = await launch();
  try {
    const context = await browser.newContext({
      viewport: DESKTOP,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FORME-DesignBot/1.0 (+design analysis)",
      acceptDownloads: false,
      javaScriptEnabled: true,
      bypassCSP: false,
    });
    context.setDefaultNavigationTimeout(25000);
    context.setDefaultTimeout(15000);

    const page = await context.newPage();

    // Block downloads and re-validate every navigation target against SSRF rules.
    page.on("download", (d: { cancel: () => void }) => d.cancel());
    await page.route("**/*", async (route: any) => {
      try {
        const reqUrl = new URL(route.request().url());
        const host = reqUrl.hostname;
        // Block obvious internal hops during subresource loading.
        if (host === "localhost" || host.endsWith(".internal")) return route.abort();
        if (/^\d+\.\d+\.\d+\.\d+$/.test(host) && isPrivateAddress(host)) return route.abort();
        return route.continue();
      } catch {
        return route.continue();
      }
    });

    const response = await page.goto(guard.url.toString(), { waitUntil: "domcontentloaded" });
    // Re-validate final URL after redirects.
    const finalUrl = page.url();
    const finalGuard = await guardUrl(finalUrl);
    if (!finalGuard.ok) throw new Error(`Redirect blocked: ${finalGuard.reason}`);

    // Give lazy content a moment, then settle.
    await page.waitForTimeout(1200);
    try {
      await page.waitForLoadState("networkidle", { timeout: 6000 });
    } catch {
      /* fine if it never idles */
    }

    const title = (await page.title().catch(() => "")) || finalGuard.url.hostname;

    const structure: PageStructure = await page.evaluate(() => {
      const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, 140);
      const headings = Array.from(document.querySelectorAll("h1,h2,h3"))
        .slice(0, 30)
        .map((h) => ({ level: Number(h.tagName[1]), text: clean(h.textContent) }))
        .filter((h) => h.text);
      const navLinks = Array.from(document.querySelectorAll("nav a, header a"))
        .slice(0, 25)
        .map((a) => clean(a.textContent))
        .filter(Boolean);
      const sections = Array.from(document.querySelectorAll("section, header, footer, main > div"))
        .slice(0, 25)
        .map((s) => ({
          tag: s.tagName.toLowerCase(),
          role: s.getAttribute("role") || s.getAttribute("aria-label") || "",
          textPreview: clean(s.textContent),
        }))
        .filter((s) => s.textPreview);
      const ctas = Array.from(document.querySelectorAll("a,button"))
        .map((el) => clean(el.textContent))
        .filter((t) => /get started|sign up|try|buy|start|demo|contact|subscribe|join|book/i.test(t))
        .slice(0, 12);
      const description = clean(
        (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content
      );
      return { title: document.title, description, headings, navLinks, sections, ctas, imageCount: document.images.length };
    });

    const htmlSignals: StyleSignals = await page.evaluate(() => {
      const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));
      const els = Array.from(document.querySelectorAll("body *")).slice(0, 400);
      const fonts: string[] = [];
      const colors: string[] = [];
      const backgrounds: string[] = [];
      const radii: string[] = [];
      let buttonCount = 0;
      for (const el of els) {
        const cs = getComputedStyle(el as Element);
        fonts.push(cs.fontFamily.split(",")[0].replace(/["']/g, "").trim());
        colors.push(cs.color);
        if (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)") backgrounds.push(cs.backgroundColor);
        if (cs.borderRadius && cs.borderRadius !== "0px") radii.push(cs.borderRadius);
        if ((el as HTMLElement).tagName === "BUTTON") buttonCount++;
      }
      return {
        fonts: uniq(fonts).slice(0, 8),
        colors: uniq(colors).slice(0, 10),
        backgrounds: uniq(backgrounds).slice(0, 10),
        radii: uniq(radii).slice(0, 6),
        buttonCount,
      };
    });

    const fullPage: Buffer = await page.screenshot({ fullPage: true, type: "png" });
    const viewport: Buffer = await page.screenshot({ fullPage: false, type: "png" });

    await context.close();
    void response;
    return { finalUrl, title, fullPage, viewport, structure, htmlSignals };
  } finally {
    await browser.close();
  }
}

// Force any scroll-reveal content to its visible state before screenshotting.
// Generated pages hide `.reveal` elements (opacity:0) and reveal them via an
// IntersectionObserver. If the LLM drops/breaks that script, content would stay
// invisible — blinding the critic. We defensively reveal everything and wait for
// fonts so the critique reflects the true page.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function forceReveal(page: any) {
  try {
    await page.evaluate(() => {
      document.querySelectorAll(".reveal").forEach((el) => (el as HTMLElement).classList.add("in"));
      // Also neutralize any lingering opacity:0 on common animation utility names.
      document.querySelectorAll<HTMLElement>('[class*="reveal"],[class*="fade"]').forEach((el) => {
        const cs = getComputedStyle(el);
        if (parseFloat(cs.opacity) < 0.05) {
          el.style.opacity = "1";
          el.style.transform = "none";
        }
      });
      return (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
    });
  } catch {
    /* non-fatal */
  }
}

export type UrlCode = { finalUrl: string; title: string; html: string; inlinedBytes: number };

/**
 * Safely capture a public URL's REAL code as a self-contained HTML document:
 * inlines accessible stylesheet rules, adds <base href> so remaining assets/links
 * resolve to the origin, and strips scripts (they won't run standalone + safety).
 * This is the true source we hand to the refiner and store as the "original".
 */
export async function captureUrlCode(rawUrl: string): Promise<UrlCode> {
  const guard = await guardUrl(rawUrl);
  if (!guard.ok) throw new Error(`URL blocked: ${guard.reason}`);

  const browser = await launch();
  try {
    const context = await browser.newContext({
      viewport: DESKTOP,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FORME-DesignBot/1.0 (+design refine)",
      acceptDownloads: false,
    });
    context.setDefaultNavigationTimeout(25000);
    const page = await context.newPage();
    page.on("download", (d: { cancel: () => void }) => d.cancel());

    await page.goto(guard.url.toString(), { waitUntil: "domcontentloaded" });
    const finalUrl = page.url();
    const finalGuard = await guardUrl(finalUrl);
    if (!finalGuard.ok) throw new Error(`Redirect blocked: ${finalGuard.reason}`);
    await page.waitForTimeout(1000);
    try { await page.waitForLoadState("networkidle", { timeout: 5000 }); } catch { /* fine */ }

    const title = (await page.title().catch(() => "")) || finalGuard.url.hostname;

    const { css, bodyHtml, headHtml, lang } = await page.evaluate(() => {
      // Collect accessible (same-origin) stylesheet rules.
      let css = "";
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) css += rule.cssText + "\n";
        } catch {
          /* cross-origin sheet — keep its <link> so it loads via <base href> */
        }
      }
      // Remove scripts, event handlers, and existing base tags from a clone.
      const doc = document.documentElement.cloneNode(true) as HTMLElement;
      doc.querySelectorAll("script,base,noscript").forEach((n) => n.remove());
      doc.querySelectorAll("*").forEach((el) => {
        for (const attr of Array.from(el.attributes)) {
          if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
        }
      });
      const head = doc.querySelector("head")?.innerHTML ?? "";
      const body = doc.querySelector("body")?.innerHTML ?? doc.innerHTML;
      return { css: css.slice(0, 300000), bodyHtml: body, headHtml: head, lang: document.documentElement.lang || "en" };
    });

    await context.close();

    const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="${finalUrl}">
${headHtml}
<style id="__forme_inlined">${css}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

    return { finalUrl, title, html, inlinedBytes: css.length };
  } finally {
    await browser.close();
  }
}

export type HtmlCapture = { desktop: Buffer; mobile: Buffer };

/** Render a self-contained HTML document and capture desktop + mobile screenshots. */
export async function captureHtml(html: string): Promise<HtmlCapture> {
  const browser = await launch();
  try {
    // Desktop
    const dctx = await browser.newContext({ viewport: DESKTOP });
    const dpage = await dctx.newPage();
    await dpage.setContent(html, { waitUntil: "networkidle", timeout: 15000 }).catch(async () => {
      await dpage.setContent(html, { waitUntil: "domcontentloaded" });
    });
    await forceReveal(dpage);
    await dpage.waitForTimeout(700);
    const desktop: Buffer = await dpage.screenshot({ fullPage: true, type: "png" });
    await dctx.close();

    // Mobile
    const mctx = await browser.newContext({ viewport: MOBILE, isMobile: true, deviceScaleFactor: 2 });
    const mpage = await mctx.newPage();
    await mpage.setContent(html, { waitUntil: "domcontentloaded" });
    await forceReveal(mpage);
    await mpage.waitForTimeout(600);
    const mobile: Buffer = await mpage.screenshot({ fullPage: true, type: "png" });
    await mctx.close();

    return { desktop, mobile };
  } finally {
    await browser.close();
  }
}
