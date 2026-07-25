import { browserAvailable } from "@/lib/render/browser";

// Post-deploy health check for a generated application.
//
// The failures this exists to catch are invisible in the source and invisible in a
// screenshot: content left at opacity 0 by a motion runtime that never re-armed after a
// client-side navigation, text the same colour as the background it sits on, CTAs wired
// to href="#". So it drives a real browser over the deployed app and measures the
// rendered result. A deployment isn't trusted until this passes.

export type Check = { name: string; ok: boolean; detail?: string };

export type VerificationReport = {
  ok: boolean;
  checkedAt: string;
  url: string;
  checks: Check[];
  /** Set when the check couldn't run at all (no browser, unreachable host). */
  skipped?: string;
};

export type HealthcheckAccount = { email: string; password: string };

const MIN_CONTRAST = 4.5; // WCAG AA for body text
const MAX_ROUTES = 8;

type Measurement = { stuck: string[]; lowContrast: string[]; deadLinks: string[] };

/**
 * In-page measurement, kept as SOURCE rather than a function reference: this runs in the
 * browser, and TypeScript build steps rewrite function bodies (esbuild's keepNames injects
 * a `__name` helper) in ways that don't survive the trip. A string is immune to that.
 */
const measureSource = (min: number) => `(async () => {
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

  const toRgb = (s) => {
    const n = (s.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
    return s.includes("color(") ? n.map((v) => v * 255) : n; // color(srgb 0..1)
  };
  const lum = (s) => {
    const p = toRgb(s).map((c) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
  };
  const ratio = (a, b) => { const s = [lum(a), lum(b)].sort((x, y) => y - x); return (s[0] + 0.05) / (s[1] + 0.05); };

  const pageBg = getComputedStyle(document.body).backgroundColor;
  const lowContrast = [];
  for (const el of Array.from(document.querySelectorAll("main *, header a, footer span"))) {
    const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent || "").trim());
    if (!hasText) continue;
    const cs = getComputedStyle(el);
    if (cs.webkitTextFillColor === "rgba(0, 0, 0, 0)") continue; // gradient-filled text
    if (parseFloat(cs.opacity) < 0.9) continue;
    const r = ratio(cs.color, pageBg);
    if (r < ${min}) lowContrast.push('"' + (el.textContent || "").trim().slice(0, 24) + '" ' + r.toFixed(2) + ':1');
  }

  const ids = new Set(Array.from(document.querySelectorAll("[id]")).map((e) => e.id));
  const deadLinks = Array.from(document.querySelectorAll("a"))
    .filter((a) => { const h = a.getAttribute("href") || ""; return h === "" || h === "#" || (h.startsWith("#") && !ids.has(h.slice(1))); })
    .map((a) => '"' + (a.textContent || "").trim().slice(0, 24) + '"');

  return { stuck, lowContrast: Array.from(new Set(lowContrast)), deadLinks };
})()`;

const MEASURE = measureSource(MIN_CONTRAST);

/**
 * Drive the deployed app and report what a visitor would actually see.
 * Never throws — a checker that crashes the deploy flow is worse than no checker.
 */
export async function verifyDeployedApp(baseUrl: string, account: HealthcheckAccount): Promise<VerificationReport> {
  const url = (baseUrl || "").replace(/\/$/, "");
  const base: Omit<VerificationReport, "ok" | "checks"> = { checkedAt: new Date().toISOString(), url };
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, detail?: string) => checks.push({ name, ok, ...(detail ? { detail } : {}) });

  // Deployments must be https; a local build under test is the one allowed exception.
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url + "/");
  if (!/^https:\/\//i.test(url) && !local) {
    return { ...base, ok: false, checks: [{ name: "deployment URL", ok: false, detail: `not an https URL: ${url || "(empty)"}` }] };
  }

  const avail = await browserAvailable();
  if (!avail.available) return { ...base, ok: true, checks: [], skipped: avail.reason ?? "browser unavailable" };

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

    const report = (label: string, m: { stuck: string[]; lowContrast: string[]; deadLinks: string[] }) => {
      add(`${label} — all content revealed`, m.stuck.length === 0, m.stuck.slice(0, 3).join(", "));
      add(`${label} — text is readable`, m.lowContrast.length === 0, m.lowContrast.slice(0, 3).join(", "));
      add(`${label} — no dead links`, m.deadLinks.length === 0, m.deadLinks.slice(0, 3).join(", "));
    };

    const landing = await page.goto(`${url}/`, { waitUntil: "networkidle" });
    add("landing page responds", (landing?.status() ?? 0) < 400, `HTTP ${landing?.status() ?? "?"}`);
    report("landing", (await page.evaluate(MEASURE)) as Measurement);

    // Sign in so the product pages — the ones the model composes — can be checked.
    // A stable account is reused across deploys rather than accumulating one per run.
    const reg = await page.goto(`${url}/register`, { waitUntil: "networkidle" }).catch(() => null);
    const hasAuth = (reg?.status() ?? 404) < 400 && (await page.$("#email")) !== null;

    if (hasAuth) {
      const signIn = async (mode: "login" | "register") => {
        await page.goto(`${url}/${mode}`, { waitUntil: "networkidle" });
        if (page.url().includes("/dashboard")) return true;
        await page.fill("#email", account.email);
        await page.fill("#password", account.password);
        await page.click('button[type="submit"]');
        return page
          .waitForURL("**/dashboard", { timeout: 30_000 })
          .then(() => true)
          .catch(() => false);
      };
      const signedIn = (await signIn("login")) || (await signIn("register"));
      add("sign-in works", signedIn, signedIn ? undefined : "could not reach the dashboard");
      if (!signedIn) return { ...base, ok: false, checks };
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

    return { ...base, ok: checks.every((c) => c.ok), checks };
  } catch (e) {
    return { ...base, ok: false, checks: [...checks, { name: "health check ran", ok: false, detail: e instanceof Error ? e.message : "unknown error" }] };
  } finally {
    await browser?.close().catch(() => {});
  }
}

/** One-line summary for logs and the deployment record. */
export function summarize(r: VerificationReport): string {
  if (r.skipped) return `skipped — ${r.skipped}`;
  const failed = r.checks.filter((c) => !c.ok);
  if (!failed.length) return `${r.checks.length} checks passed`;
  return `${failed.length}/${r.checks.length} checks failed: ${failed.map((f) => f.name + (f.detail ? ` (${f.detail})` : "")).join("; ")}`;
}
