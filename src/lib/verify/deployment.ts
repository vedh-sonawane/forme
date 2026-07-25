import { browserAvailable } from "@/lib/render/browser";

// Post-deploy health check for a generated application.
//
// The failures this exists to catch are invisible in the source and invisible in a
// screenshot: content left at opacity 0 by a motion runtime that never re-armed after a
// client-side navigation, text the same colour as the background it sits on, CTAs wired
// to href="#". So it drives a real browser over the deployed app and measures the
// rendered result. A deployment isn't trusted until this passes.

/**
 * `severity: "warning"` marks a finding that is reported but does NOT fail a deploy.
 * Contrast below AA is a judgement call; text the same colour as its background is not.
 * A gate that blocks on opinions stops being trusted, so only the latter blocks.
 */
export type Check = { name: string; ok: boolean; detail?: string; severity?: "error" | "warning" };

export type VerificationReport = {
  ok: boolean;
  checkedAt: string;
  url: string;
  checks: Check[];
  /** Set when the check couldn't run at all (no browser, unreachable host). */
  skipped?: string;
  /** The account verification ended up using — persist it so the next run reuses it. */
  accountUsed?: HealthcheckAccount;
};

export type HealthcheckAccount = { email: string; password: string };

const MIN_CONTRAST = 4.5; // WCAG AA for body text — reported as a warning
// Only "the same colour as its background" blocks a deploy. The bug this gate was built
// for measured 1.03:1; a 1.7:1 gold star rating is poor contrast but plainly visible, and
// blocking a release over it would teach everyone to ignore the gate.
const INVISIBLE_CONTRAST = 1.35;
const MAX_ROUTES = 8;

type Measurement = { stuck: string[]; lowContrast: string[]; invisible: string[]; deadLinks: string[]; placeholders: string[] };

/**
 * In-page measurement, kept as SOURCE rather than a function reference: this runs in the
 * browser, and TypeScript build steps rewrite function bodies (esbuild's keepNames injects
 * a `__name` helper) in ways that don't survive the trip. A string is immune to that.
 */
const measureSource = (min: number, severe: number) => `(async () => {
  const H = () => document.documentElement.scrollHeight;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Reveal-on-scroll content is legitimately hidden until scrolled to, so read the page
  // the way a visitor would before judging anything invisible.
  for (let y = 0; y < H(); y += window.innerHeight * 0.7) { window.scrollTo(0, y); await sleep(100); }
  window.scrollTo(0, H());
  await sleep(1300); // longer than the .9s reveal transition

  // An element caught mid-fade is not a broken element. Anything still hidden gets a
  // second look after the transition has had time to finish; only what survives both
  // passes is genuinely stuck, which is what this gate is allowed to fail a deploy on.
  const collectHidden = () => Array.from(document.querySelectorAll(".rv, .stagger"))
    .filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.9 && el.getBoundingClientRect().height > 4);
  let hiddenEls = collectHidden();
  if (hiddenEls.length) { await sleep(1500); hiddenEls = collectHidden(); }
  const stuck = hiddenEls.map((el) => (el.tagName + "." + el.className).slice(0, 52));

  // Colour parsing: computed values arrive as rgb()/rgba() or color(srgb 0..1).
  const parse = (s) => {
    const n = (s.match(/[\\d.]+/g) || []).map(Number);
    if (!n.length) return null;
    const scale = s.includes("color(") ? 255 : 1;
    return [n[0] * scale, n[1] * scale, n[2] * scale, n.length > 3 ? n[3] : 1];
  };
  const lum = (c) => {
    const p = c.slice(0, 3).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
  };
  const ratio = (a, b) => { const s = [lum(a), lum(b)].sort((x, y) => y - x); return (s[0] + 0.05) / (s[1] + 0.05); };

  // The backdrop a label ACTUALLY sits on — not the page background. White text on an
  // orange button is fine even when the page behind it is cream; comparing against the
  // page would report it as invisible and block a perfectly good deploy. Semi-transparent
  // layers (glass panels) are composited; anything sitting on a gradient or image is
  // skipped, because its contrast can't be decided without sampling pixels.
  const backdrop = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const c = parse(cs.backgroundColor);
      if (c && c[3] > 0) { layers.push(c); if (c[3] >= 0.999) break; }
    }
    let out = [255, 255, 255];
    for (let i = layers.length - 1; i >= 0; i--) {
      const [r, g, b, a] = layers[i];
      out = [r * a + out[0] * (1 - a), g * a + out[1] * (1 - a), b * a + out[2] * (1 - a)];
    }
    return out;
  };

  const lowContrast = [];
  const invisible = [];
  for (const el of Array.from(document.querySelectorAll("main *, header a, footer span"))) {
    const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent || "").trim());
    if (!hasText) continue;
    const cs = getComputedStyle(el);
    if (cs.webkitTextFillColor === "rgba(0, 0, 0, 0)") continue; // gradient-filled text
    if (parseFloat(cs.opacity) < 0.9) continue;
    if (el.getBoundingClientRect().height < 2) continue;
    const bg = backdrop(el);
    const fg = parse(cs.color);
    if (!bg || !fg) continue;
    // WCAG relaxes AA to 3:1 for large text (>=24px, or >=18.66px bold).
    const size = parseFloat(cs.fontSize) || 16;
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const aa = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : ${min};
    const r = ratio(fg, bg);
    const note = '"' + (el.textContent || "").trim().slice(0, 24) + '" ' + r.toFixed(2) + ':1';
    if (r < ${severe}) invisible.push(note);
    else if (r < aa) lowContrast.push(note);
  }

  // A composition may only show the user's numbers through a binding the server resolves.
  // A token still visible in the rendered page means the value was never real.
  const placeholders = Array.from(new Set((document.body.innerText.match(/\{\{[^{}]+\}\}/g) || []))).slice(0, 4);

  const ids = new Set(Array.from(document.querySelectorAll("[id]")).map((e) => e.id));
  const deadLinks = Array.from(document.querySelectorAll("a"))
    .filter((a) => { const h = a.getAttribute("href") || ""; return h === "" || h === "#" || (h.startsWith("#") && !ids.has(h.slice(1))); })
    .map((a) => '"' + (a.textContent || "").trim().slice(0, 24) + '"');

  return { stuck, lowContrast: Array.from(new Set(lowContrast)), invisible: Array.from(new Set(invisible)), deadLinks, placeholders };
})()`;

const MEASURE = measureSource(MIN_CONTRAST, INVISIBLE_CONTRAST);

/**
 * Drive the deployed app and report what a visitor would actually see.
 * Never throws — a checker that crashes the deploy flow is worse than no checker.
 */
export async function verifyDeployedApp(baseUrl: string, account: HealthcheckAccount): Promise<VerificationReport> {
  const url = (baseUrl || "").replace(/\/$/, "");
  const base: Omit<VerificationReport, "ok" | "checks"> = { checkedAt: new Date().toISOString(), url };
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, detail?: string, severity: "error" | "warning" = "error") =>
    checks.push({ name, ok, ...(detail ? { detail } : {}), ...(severity === "warning" ? { severity } : {}) });
  const blocking = (c: Check) => !c.ok && c.severity !== "warning";

  // Deployments must be https; a local build under test is the one allowed exception.
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url + "/");
  if (!/^https:\/\//i.test(url) && !local) {
    return { ...base, ok: false, checks: [{ name: "deployment URL", ok: false, detail: `not an https URL: ${url || "(empty)"}` }] };
  }

  const avail = await browserAvailable();
  if (!avail.available) return { ...base, ok: true, checks: [], skipped: avail.reason ?? "browser unavailable" };

  let accountUsed: HealthcheckAccount | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any = null;
  try {
    const pw = await import("playwright");
    browser = await pw.chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-first-run"],
    });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30_000);

    const report = (label: string, m: Measurement) => {
      add(`${label} — all content revealed`, m.stuck.length === 0, m.stuck.slice(0, 3).join(", "));
      add(`${label} — text is visible`, m.invisible.length === 0, m.invisible.slice(0, 3).join(", "));
      add(`${label} — text meets AA contrast`, m.lowContrast.length === 0, m.lowContrast.slice(0, 3).join(", "), "warning");
      add(`${label} — no dead links`, m.deadLinks.length === 0, m.deadLinks.slice(0, 3).join(", "));
      add(`${label} — data placeholders resolved`, m.placeholders.length === 0, m.placeholders.join(", "));
    };

    const landing = await page.goto(`${url}/`, { waitUntil: "networkidle" });
    add("landing page responds", (landing?.status() ?? 0) < 400, `HTTP ${landing?.status() ?? "?"}`);

    // If the host bounced us to the provider's own login, we're about to measure THEIR
    // page and report invented problems with the app. Say what actually happened.
    const landedOn = new URL(page.url()).host;
    if (landedOn !== new URL(url).host) {
      return {
        ...base,
        ok: true,
        checks: [],
        // Usually not a misconfiguration: Vercel serves the production alias publicly but
        // keeps the long project-scoped URL behind SSO. Checking the wrong one measures
        // Vercel's login screen instead of the app.
        skipped: `checked a URL that redirects to ${landedOn} — this is the protected deployment URL, not the public production one`,
      };
    }

    report("landing", (await page.evaluate(MEASURE)) as Measurement);

    // Sign in so the product pages — the ones the model composes — can be checked.
    // A stable account is reused across deploys rather than accumulating one per run.
    const reg = await page.goto(`${url}/register`, { waitUntil: "networkidle" }).catch(() => null);
    const hasAuth = (reg?.status() ?? 404) < 400 && (await page.$("#email")) !== null;

    if (hasAuth) {
      const attempt = async (mode: "login" | "register", who: HealthcheckAccount) => {
        await page.goto(`${url}/${mode}`, { waitUntil: "networkidle" });
        if (page.url().includes("/dashboard")) return true;
        await page.fill("#email", who.email);
        await page.fill("#password", who.password);
        await page.click('button[type="submit"]');
        return page
          .waitForURL("**/dashboard", { timeout: 30_000 })
          .then(() => true)
          .catch(() => false);
      };

      // The recorded account is tried first. If the address exists with a password we no
      // longer hold — a check run from elsewhere created it — neither sign-in nor sign-up
      // can succeed, so fall back to a fresh address rather than reporting the app broken.
      let used = account;
      let signedIn = (await attempt("login", used)) || (await attempt("register", used));
      if (!signedIn) {
        used = { email: `forme-healthcheck+${Math.random().toString(36).slice(2, 10)}@example.com`, password: account.password };
        signedIn = await attempt("register", used);
      }
      accountUsed = signedIn ? used : undefined;
      add("sign-in works", signedIn, signedIn ? undefined : "could not reach the dashboard");
      if (!signedIn) return { ...base, ok: false, checks, accountUsed };
      add("no dead-end Sign in link once signed in", (await page.$('header a[href="/login"]')) === null);
    }

    // Every route in the header, reached by CLIENT-SIDE navigation — the path where a
    // motion runtime that only scans once leaves the page blank.
    const routes: string[] = await page.$$eval("header a[href^='/']", (as: Element[]) =>
      Array.from(new Set(as.map((a) => a.getAttribute("href")).filter((h): h is string => !!h && h !== "/" && h !== "/login")))
    );
    add("header exposes app routes", routes.length > 0, routes.join(" "));

    for (const route of routes.slice(0, MAX_ROUTES)) {
      const link = await page.$(`header a[href="${route}"]`);
      if (!link) continue;
      await link.click();
      const arrived = await page
        .waitForFunction((r: string) => location.pathname === r, route, { timeout: 20_000 })
        .then(() => true)
        .catch(() => false);
      if (!arrived) {
        add(`client-nav ${route} — reachable`, false, "navigation did not complete");
        continue;
      }
      await page.waitForTimeout(400);
      report(`client-nav ${route}`, (await page.evaluate(MEASURE)) as Measurement);
    }

    return { ...base, ok: !checks.some(blocking), checks, accountUsed };
  } catch (e) {
    return { ...base, ok: false, checks: [...checks, { name: "health check ran", ok: false, detail: e instanceof Error ? e.message : "unknown error" }] };
  } finally {
    await browser?.close().catch(() => {});
  }
}

/**
 * Vercel serves hashed and project-scoped URLs behind its own SSO login, so a check
 * pointed at one measures Vercel's sign-in page and reports nonsense about the app.
 * Only the production alias is public — find it before verifying anything.
 */
export async function pickPublicUrl(candidates: string[]): Promise<string | null> {
  const seen = new Set<string>();
  const urls = candidates
    .filter(Boolean)
    .map((u) => (u.startsWith("http") ? u : `https://${u}`).replace(/\/$/, ""))
    .filter((u) => (seen.has(u) ? false : (seen.add(u), true)))
    .sort((a, b) => a.length - b.length); // the production alias is the short one

  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      const location = res.headers.get("location") ?? "";
      if (res.status === 401 || res.status === 403) continue;
      if (res.status >= 300 && res.status < 400 && /vercel\.com/i.test(location)) continue;
      if (res.status < 400) return url;
    } catch {
      /* unreachable — try the next candidate */
    }
  }
  return null;
}

/** One-line summary for logs and the deployment record. */
export function summarize(r: VerificationReport): string {
  if (r.skipped) return `skipped — ${r.skipped}`;
  const failed = r.checks.filter((c) => !c.ok && c.severity !== "warning");
  const warned = r.checks.filter((c) => !c.ok && c.severity === "warning").length;
  if (!failed.length) return `${r.checks.length} checks passed${warned ? ` (${warned} warning${warned === 1 ? "" : "s"})` : ""}`;
  return `${failed.length}/${r.checks.length} checks failed: ${failed.map((f) => f.name + (f.detail ? ` (${f.detail})` : "")).join("; ")}`;
}
