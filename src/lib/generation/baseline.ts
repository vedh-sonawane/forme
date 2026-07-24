import type { DesignSystem, DesignDirection, Requirements, WebsitePlan } from "@/lib/design/schema";
import { systemToCss, fontLinkTag, REVEAL_SCRIPT } from "./css";

// Deterministic, high-quality baseline website generator.
// Produces a complete, valid, responsive HTML document from the design tokens, plan,
// and requirements. Used as (1) the reference given to the LLM code generator, and
// (2) a guaranteed-valid fallback when the LLM output is missing or malformed.
// It writes realistic copy derived from the requirements — never lorem ipsum.

const esc = (s: string) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function icon(path: string) {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
const ICONS = [
  `<path d="M13 2 3 14h7l-1 8 10-12h-7z"/>`,
  `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
  `<path d="M4 7h16M4 12h16M4 17h10"/>`,
  `<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/>`,
  `<path d="M3 12h4l3 8 4-16 3 8h4"/>`,
  `<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 20h8"/>`,
];
const check = `<svg class="check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

type Content = {
  brand: string;
  navItems: string[];
  heroEyebrow: string;
  heroTitle: string;
  heroSub: string;
  primaryCta: string;
  secondaryCta: string;
  features: { title: string; body: string }[];
  metrics: { num: string; label: string }[];
  testimonial: { quote: string; who: string };
  tiers: { name: string; price: string; blurb: string; features: string[]; featured: boolean }[];
  ctaTitle: string;
  ctaSub: string;
};

const BRAND_STOP = new Set([
  "a", "an", "the", "for", "of", "to", "and", "or", "with", "your", "our", "that", "this",
  "site", "website", "landing", "page", "web", "app", "application", "platform", "startup",
  "company", "business", "brand", "builds", "building", "make", "create", "new",
]);

function deriveBrand(product: string, business: string): string {
  const fromProduct = product.trim();
  if (fromProduct && !BRAND_STOP.has(fromProduct.toLowerCase())) {
    return fromProduct.split(/[\s—-]/).filter(Boolean).slice(0, 2).join(" ").slice(0, 24);
  }
  const words = business.replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const significant = words.filter((w) => !BRAND_STOP.has(w.toLowerCase()));
  const chosen = (significant.length ? significant : words).slice(0, 2).map((w) => w[0].toUpperCase() + w.slice(1));
  return (chosen.join(" ") || "Forme").slice(0, 24);
}

function buildContent(req: Requirements, dir: DesignDirection): Content {
  const business = req.business?.trim() || "your product";
  const brand = deriveBrand(req.product ?? "", business);
  const audience = req.target_audience || "modern teams";
  const goals = req.goals?.length ? req.goals : ["move faster", "look world-class", "convert more"];
  const nav = (req.pages?.length ? req.pages : ["Features", "Showcase", "Pricing"]).filter((p) => !/home/i.test(p)).slice(0, 4);

  const feats = (req.functionality?.length ? req.functionality : ["Fast by default", "Beautifully designed", "Built to scale", "Secure", "Insightful analytics", "Effortless setup"])
    .slice(0, 6)
    .map((f, i) => ({
      title: f.replace(/^\w/, (c) => c.toUpperCase()),
      body:
        [
          `Purpose-built for ${audience}, so ${goals[0] ?? "you move faster"} without the busywork.`,
          `Every detail is considered — spacing, type, and motion work together to feel intentional.`,
          `Grows with you from day one to serious scale, with no rewrites required.`,
        ][i % 3],
    }));

  while (feats.length < 3) feats.push({ title: "Thoughtful by design", body: "Considered details throughout." });

  return {
    brand,
    navItems: nav,
    heroEyebrow: (req.industry || dir.design_personality?.[0] || "Introducing").toString(),
    heroTitle: headline(business),
    heroSub:
      dir.visual_concept?.slice(0, 160) ||
      `A ${dir.design_personality?.[0] ?? "modern"} experience built for ${audience}. Designed to ${goals[0] ?? "convert"}.`,
    primaryCta: req.functionality?.some((f) => /buy|shop|store/i.test(f)) ? "Shop now" : "Get started",
    secondaryCta: "See how it works",
    features: feats,
    metrics: [
      { num: "99.9%", label: "uptime, guaranteed" },
      { num: "3.2×", label: `faster for ${audience}` },
      { num: "12k+", label: "teams onboard" },
    ],
    testimonial: {
      quote: `“Switching to ${brand} was the clearest design decision we made all year. It just feels considered.”`,
      who: `— Head of Product, a ${req.industry || "growing"} company`,
    },
    tiers: [
      { name: "Starter", price: "$0", blurb: "For getting off the ground.", features: ["Core features", "1 project", "Community support"], featured: false },
      { name: "Pro", price: "$29", blurb: `For ${audience} who mean it.`, features: ["Everything in Starter", "Unlimited projects", "Priority support", "Advanced analytics"], featured: true },
      { name: "Scale", price: "Custom", blurb: "For teams at scale.", features: ["SSO & roles", "SLA", "Dedicated partner"], featured: false },
    ],
    ctaTitle: `Ready to ${goals[0] ?? "get started"}?`,
    ctaSub: `Join the ${audience} already building with ${brand}.`,
  };
}

function capitalizeSmart(s: string) {
  const t = s.trim().replace(/\.$/, "");
  return t.length > 78 ? t.slice(0, 78) + "…" : t.charAt(0).toUpperCase() + t.slice(1);
}

// Turn a business description into a hero-worthy headline: keep the first sentence,
// drop a leading "A/An … site/page/app for" preamble, and capitalize.
function headline(business: string) {
  let t = business.trim().split(/(?<=[.!?])\s+/)[0] || business.trim();
  t = t.replace(/^(?:an?|the)\s+[\w-]*\s*(?:site|website|web ?site|page|app|application|platform)\s+(?:for|to|that)\s+/i, "");
  t = t.replace(/^(?:an?|the)\s+/i, "");
  return capitalizeSmart(t);
}

function navSection(c: Content) {
  return `<header class="nav"><div class="container nav-inner">
  <a class="brand" href="#top"><span class="brand-mark"></span>${esc(c.brand)}</a>
  <nav class="nav-links" aria-label="Primary">${c.navItems.map((n) => `<a href="#${slug(n)}">${esc(n)}</a>`).join("")}</nav>
  <div class="nav-links cta-only"><a class="btn btn-primary" href="#cta">${esc(c.primaryCta)}</a></div>
</div></header>`;
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function heroSection(c: Content) {
  return `<section class="hero section" id="top"><div class="hero-glow"></div>
  <div class="container hero-inner" style="text-align:center;max-width:960px">
    <span class="eyebrow reveal">${esc(c.heroEyebrow)}</span>
    <h1 class="display reveal" style="margin:1rem auto .9rem;max-width:16ch">${esc(c.heroTitle)}</h1>
    <p class="lead reveal" style="margin:0 auto 2rem;text-align:center">${esc(c.heroSub)}</p>
    <div class="reveal" style="display:flex;gap:.9rem;justify-content:center;flex-wrap:wrap">
      <a class="btn btn-primary" href="#cta">${esc(c.primaryCta)}</a>
      <a class="btn btn-ghost" href="#features">${esc(c.secondaryCta)}</a>
    </div>
    <div class="mock reveal" style="margin-top:3.4rem;text-align:left">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span></div>
      <div style="padding:clamp(1.4rem,4vw,2.6rem);display:grid;gap:1rem">
        <div style="height:14px;width:38%;background:var(--border);border-radius:6px"></div>
        <div style="height:10px;width:70%;background:var(--surface);border:1px solid var(--border);border-radius:6px"></div>
        <div class="grid grid-3" style="margin-top:.6rem">
          ${[0, 1, 2].map(() => `<div class="card" style="box-shadow:none"><div style="height:34px;width:34px;border-radius:10px;background:linear-gradient(135deg,var(--primary),var(--accent))"></div><div style="height:10px;width:60%;background:var(--border);border-radius:6px;margin-top:1rem"></div><div style="height:8px;width:90%;background:var(--surface-alt);border-radius:6px;margin-top:.6rem"></div></div>`).join("")}
        </div>
      </div>
    </div>
  </div></section>`;
}

function logosSection(c: Content) {
  const names = ["Northwind", "Lumen", "Vertex", "Cadence", "Halcyon", "Monolith"];
  return `<section class="section" style="padding-block:clamp(2rem,4vw,3rem)"><div class="container reveal" style="text-align:center">
    <p class="muted" style="font-size:var(--fs-small);letter-spacing:.1em;text-transform:uppercase;margin-bottom:1.6rem">Trusted by teams building ${esc(c.heroEyebrow.toLowerCase())}</p>
    <div class="logos" style="justify-content:center">${names.map((n) => `<span class="logo-item">${n}</span>`).join("")}</div>
  </div></section>`;
}

function featuresSection(c: Content) {
  return `<section class="section" id="features"><div class="container">
    <div class="reveal" style="max-width:60ch;margin-bottom:3rem">
      <span class="eyebrow">Why ${esc(c.brand)}</span>
      <h2 class="h1" style="margin-top:.8rem">Everything you need, nothing you don't.</h2>
    </div>
    <div class="grid grid-3">
      ${c.features.map((f, i) => `<article class="card reveal" style="transition-delay:${i * 60}ms">
        <div style="width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:color-mix(in srgb,var(--primary) 12%,var(--surface));color:var(--primary);margin-bottom:1.1rem">${icon(ICONS[i % ICONS.length])}</div>
        <h3 class="h3" style="margin-bottom:.5rem">${esc(f.title)}</h3>
        <p>${esc(f.body)}</p>
      </article>`).join("")}
    </div>
  </div></section>`;
}

function showcaseSection(c: Content) {
  return `<section class="section" id="showcase" style="background:var(--surface)"><div class="container grid grid-2" style="align-items:center;gap:clamp(2rem,5vw,4rem)">
    <div class="reveal">
      <span class="eyebrow">Showcase</span>
      <h2 class="h1" style="margin:.8rem 0 1rem">Designed to be seen.</h2>
      <p class="lead">Every screen is composed with intention — clear hierarchy, honest spacing, and typography that carries the brand. This is what ${esc(c.brand)} ships by default.</p>
      <ul style="list-style:none;margin-top:1.6rem;display:grid;gap:.8rem">
        ${["Consistent spacing rhythm", "Accessible color contrast", "Responsive from 320px up"].map((t) => `<li style="display:flex;gap:.6rem;align-items:center">${check}<span>${t}</span></li>`).join("")}
      </ul>
    </div>
    <div class="mock reveal">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span></div>
      <div style="padding:1.6rem;display:grid;gap:1rem;background:var(--bg)">
        <div style="height:120px;border-radius:var(--r-md);background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 26%,var(--surface)),color-mix(in srgb,var(--accent) 22%,var(--surface)))"></div>
        <div class="grid grid-2">
          <div class="card" style="box-shadow:none"><div class="metric-num">4.9</div><p style="font-size:var(--fs-small)">avg. rating</p></div>
          <div class="card" style="box-shadow:none"><div class="metric-num">+38%</div><p style="font-size:var(--fs-small)">conversion lift</p></div>
        </div>
      </div>
    </div>
  </div></section>`;
}

function metricsSection(c: Content) {
  return `<section class="section"><div class="container grid grid-3" style="text-align:center">
    ${c.metrics.map((m, i) => `<div class="reveal" style="transition-delay:${i * 70}ms"><div class="metric-num">${esc(m.num)}</div><p style="margin-top:.4rem">${esc(m.label)}</p></div>`).join("")}
  </div></section>`;
}

function testimonialSection(c: Content) {
  return `<section class="section" style="background:var(--surface)"><div class="container reveal" style="max-width:820px;text-align:center">
    <div class="eyebrow">Loved by users</div>
    <blockquote class="h2" style="font-family:var(--font-heading);font-weight:600;margin:1.2rem 0 1.4rem;line-height:1.25">${esc(c.testimonial.quote)}</blockquote>
    <p class="muted">${esc(c.testimonial.who)}</p>
  </div></section>`;
}

function pricingSection(c: Content) {
  return `<section class="section" id="pricing"><div class="container">
    <div class="reveal" style="text-align:center;max-width:56ch;margin:0 auto 3rem">
      <span class="eyebrow">Pricing</span>
      <h2 class="h1" style="margin-top:.8rem">Simple, honest pricing.</h2>
    </div>
    <div class="grid grid-3" style="align-items:start">
      ${c.tiers.map((t, i) => `<article class="card reveal" style="transition-delay:${i * 60}ms;${t.featured ? "border-color:var(--primary);box-shadow:var(--sh-md);position:relative" : ""}">
        ${t.featured ? `<span class="badge" style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--primary);color:var(--primary-text);border-color:var(--primary)">Most popular</span>` : ""}
        <h3 class="h3">${esc(t.name)}</h3>
        <p style="margin:.3rem 0 1rem">${esc(t.blurb)}</p>
        <div class="price">${esc(t.price)}${t.price.startsWith("$") && t.price !== "$0" ? `<span style="font-size:var(--fs-small);color:var(--text-muted);font-weight:500">/mo</span>` : ""}</div>
        <a class="btn ${t.featured ? "btn-primary" : "btn-ghost"}" href="#cta" style="width:100%;justify-content:center;margin:1.3rem 0">${t.featured ? c.primaryCta : "Choose " + t.name}</a>
        <ul style="list-style:none;display:grid;gap:.7rem">${t.features.map((f) => `<li style="display:flex;gap:.6rem;align-items:center;font-size:var(--fs-small)">${check}<span>${esc(f)}</span></li>`).join("")}</ul>
      </article>`).join("")}
    </div>
  </div></section>`;
}

function ctaSection(c: Content) {
  return `<section class="section" id="cta"><div class="container"><div class="cta-band reveal" style="text-align:center;padding:clamp(2.6rem,6vw,4.5rem)">
    <h2 class="h1" style="max-width:18ch;margin:0 auto 1rem">${esc(c.ctaTitle)}</h2>
    <p class="lead" style="margin:0 auto 2rem;text-align:center">${esc(c.ctaSub)}</p>
    <div style="display:flex;gap:.9rem;justify-content:center;flex-wrap:wrap">
      <a class="btn btn-primary" href="#top">${esc(c.primaryCta)}</a>
      <a class="btn btn-ghost" href="#features">Talk to us</a>
    </div>
  </div></div></section>`;
}

function footerSection(c: Content) {
  return `<footer class="footer section" style="padding-block:3rem"><div class="container" style="display:flex;justify-content:space-between;gap:2rem;flex-wrap:wrap;align-items:center">
    <a class="brand" href="#top"><span class="brand-mark"></span>${esc(c.brand)}</a>
    <nav class="nav-links" style="display:flex" aria-label="Footer">${c.navItems.map((n) => `<a href="#${slug(n)}">${esc(n)}</a>`).join("")}<a href="#pricing">Pricing</a></nav>
    <p style="font-size:var(--fs-small)">© ${esc(c.brand)}. Built with FORME.</p>
  </div></footer>`;
}

const SECTION_RENDERERS: Record<string, (c: Content) => string> = {
  nav: navSection,
  hero: heroSection,
  logos: logosSection,
  features: featuresSection,
  showcase: showcaseSection,
  metrics: metricsSection,
  testimonial: testimonialSection,
  pricing: pricingSection,
  cta: ctaSection,
  footer: footerSection,
};

export function renderBaseline(input: {
  system: DesignSystem;
  direction: DesignDirection;
  requirements: Requirements;
  plan: WebsitePlan;
}): string {
  const c = buildContent(input.requirements, input.direction);
  const page = input.plan.pages[0];
  const order = page?.sections?.map((s) => s.type) ?? [];
  const types = order.length ? order : ["nav", "hero", "logos", "features", "showcase", "metrics", "testimonial", "pricing", "cta", "footer"];

  const seen = new Set<string>();
  const bodyParts: string[] = [];
  // Always ensure nav first + footer last.
  if (!types.includes("nav")) bodyParts.push(navSection(c));
  for (const t of types) {
    const r = SECTION_RENDERERS[t] || SECTION_RENDERERS[Object.keys(SECTION_RENDERERS).find((k) => t.includes(k)) ?? ""];
    if (r && !seen.has(t)) {
      bodyParts.push(r(c));
      seen.add(t);
    }
  }
  if (!seen.has("footer")) bodyParts.push(footerSection(c));

  const css = systemToCss(input.system);
  const title = `${c.brand} — ${c.heroEyebrow}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(c.heroSub)}">
${fontLinkTag(input.system)}
<style>${css}</style>
</head>
<body>
${bodyParts.join("\n")}
${REVEAL_SCRIPT}
</body>
</html>`;
}
