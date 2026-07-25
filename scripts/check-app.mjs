/**
 * Health check for a generated FORME application — run against a local build or a live
 * deployment. It measures the RENDERED page, because the bugs this catches are invisible
 * in the source: content stuck at opacity 0, text the same colour as its background,
 * CTAs that go nowhere.
 *
 *   node scripts/check-app.mjs http://localhost:3000
 *   node scripts/check-app.mjs https://your-app.vercel.app
 *
 * Exits non-zero if any check fails.
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const EMAIL = `forme-check-${Date.now()}@example.com`;
const PASSWORD = "forme-check-pw-1";
const MIN_CONTRAST = 4.5; // WCAG AA for body text

let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${detail ? `  — ${detail}` : ""}`);
};

/** Scroll the page like a reader, wait out the reveal transition, then measure. */
async function measure(page) {
  return page.evaluate(async (MIN) => {
    const H = () => document.documentElement.scrollHeight;
    for (let y = 0; y < H(); y += window.innerHeight * 0.7) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 110));
    }
    window.scrollTo(0, H());
    await new Promise((r) => setTimeout(r, 1500)); // longer than the .9s reveal

    // 1. Anything that animates in must have finished animating in.
    const stuck = [...document.querySelectorAll(".rv, .stagger")]
      .filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.9 && el.getBoundingClientRect().height > 4)
      .map((el) => `${el.tagName}.${el.className}`.slice(0, 50));

    // 2. Text must be readable against the page background.
    const toRgb = (s) => {
      const n = (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      return s.includes("color(") ? n.map((v) => v * 255) : n;
    };
    const lum = (s) => {
      const [r, g, b] = toRgb(s).map((c) => {
        const x = c / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const pageBg = getComputedStyle(document.body).backgroundColor;
    const lowContrast = [];
    for (const el of document.querySelectorAll("main *, header a, footer span")) {
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
      const cs = getComputedStyle(el);
      if (cs.webkitTextFillColor === "rgba(0, 0, 0, 0)") continue; // gradient-filled text
      if (parseFloat(cs.opacity) < 0.9) continue;
      const r = ratio(cs.color, pageBg);
      if (r < MIN) lowContrast.push(`"${el.textContent.trim().slice(0, 24)}" ${r.toFixed(2)}:1`);
    }

    // 3. No link may be a dead end.
    const ids = new Set([...document.querySelectorAll("[id]")].map((e) => e.id));
    const deadLinks = [...document.querySelectorAll("a")]
      .filter((a) => {
        const h = a.getAttribute("href") || "";
        return h === "" || h === "#" || (h.startsWith("#") && !ids.has(h.slice(1)));
      })
      .map((a) => `"${(a.textContent || "").trim().slice(0, 24)}"`);

    return { path: location.pathname, stuck, lowContrast: [...new Set(lowContrast)], deadLinks };
  }, MIN_CONTRAST);
}

const report = (label, m) => {
  check(`${label} — all content revealed`, m.stuck.length === 0, m.stuck.slice(0, 3).join(", "));
  check(`${label} — text is readable`, m.lowContrast.length === 0, m.lowContrast.slice(0, 3).join(", "));
  check(`${label} — no dead links`, m.deadLinks.length === 0, m.deadLinks.slice(0, 3).join(", "));
};

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  console.log(`\nChecking ${BASE}\n`);

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  report("landing", await measure(page));

  // Sign up if the app has auth, so the real product pages can be checked.
  const hasAuth = await page.goto(`${BASE}/register`, { waitUntil: "networkidle" }).then(
    (r) => r?.ok() ?? false,
    () => false
  );
  if (hasAuth) {
    await page.fill("#email", EMAIL);
    await page.fill("#password", PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
    check("sign-up works", true);
    check("signed-in: no dead-end Sign in link", !(await page.$('header a[href="/login"]')));
  }

  // Every route in the header, reached by CLIENT-SIDE navigation — the path where a
  // one-shot motion runtime silently leaves the page blank.
  const routes = await page.$$eval("header a[href^='/']", (as) =>
    [...new Set(as.map((a) => a.getAttribute("href")).filter((h) => h && h !== "/" && h !== "/login"))]
  );
  check("header exposes app routes", routes.length > 0, routes.join(" "));

  for (const route of routes) {
    await page.click(`header a[href="${route}"]`);
    await page.waitForFunction((r) => location.pathname === r, route, { timeout: 15_000 });
    await page.waitForTimeout(400);
    report(`client-nav ${route}`, await measure(page));
  }
} finally {
  await browser.close();
}

console.log(failed === 0 ? "\nAll checks passed.\n" : `\n${failed} check(s) failed.\n`);
process.exit(failed === 0 ? 0 : 1);
