import type { DesignSystem, DesignDirection, Requirements, WebsitePlan } from "@/lib/design/schema";
import { systemToCss, fontLinkTag, REVEAL_SCRIPT } from "./css";

// Deterministic, PREMIUM baseline website generator.
// Produces a complete, valid, responsive, expensively-designed HTML document from the
// design tokens, plan, and requirements. Used as (1) the reference given to the LLM
// code generator, and (2) a guaranteed-premium fallback when the LLM output is missing
// or malformed. Writes realistic copy derived from the requirements — never lorem ipsum.

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
  testimonial: { quote: string; who: string; role: string };
  tiers: { name: string; price: string; blurb: string; features: string[]; featured: boolean }[];
  ctaTitle: string;
  ctaSub: string;
};

function buildContent(req: Requirements, dir: DesignDirection): Content {
  const business = req.business?.trim() || "your product";
  const brand = (req.product?.trim() || business).split(/[\s—-]/).slice(0, 2).join(" ").slice(0, 22) || "Forme";
  const audience = req.target_audience || "modern teams";
  const goals = req.goals?.length ? req.goals : ["move faster", "look world-class", "convert more"];
  const nav = (req.pages?.length ? req.pages : ["Features", "Showcase", "Pricing"]).filter((p) => !/home/i.test(p)).slice(0, 4);

  const feats = (req.functionality?.length ? req.functionality : ["Fast by default", "Beautifully designed", "Built to scale", "Secure by design", "Insightful analytics", "Effortless setup"])
    .slice(0, 6)
    .map((f, i) => ({
      title: f.replace(/^\w/, (ch) => ch.toUpperCase()),
      body: [
        `Purpose-built for ${audience}, so you ${goals[0] ?? "move faster"} without the busywork.`,
        `Every detail is considered — spacing, type, and motion work together to feel intentional.`,
        `Grows with you from day one to serious scale, with no rewrites required.`,
      ][i % 3],
    }));
  while (feats.length < 4) feats.push({ title: "Thoughtful by design", body: "Considered details throughout, so it always feels premium." });

  return {
    brand,
    navItems: nav,
    heroEyebrow: (req.industry || dir.design_personality?.[0] || "Introducing").toString(),
    heroTitle: capitalizeSmart(business),
    heroSub: dir.visual_concept?.slice(0, 170) || `A ${dir.design_personality?.[0] ?? "modern"} experience built for ${audience}. Designed to ${goals[0] ?? "convert"}.`,
    primaryCta: req.functionality?.some((f) => /buy|shop|store/i.test(f)) ? "Shop now" : "Get started",
    secondaryCta: "See how it works",
    features: feats,
    metrics: [
      { num: "99.9%", label: "uptime, guaranteed" },
      { num: "3.2×", label: `faster for ${audience}` },
      { num: "12k+", label: "teams onboard" },
      { num: "4.9/5", label: "average rating" },
    ],
    testimonial: {
      quote: `Switching to ${brand} was the clearest design decision we made all year. It just feels considered — every screen looks like we hired a studio.`,
      who: "Alex Rivera",
      role: `Head of Product, a ${req.industry || "growing"} company`,
    },
    tiers: [
      { name: "Starter", price: "$0", blurb: "For getting off the ground.", features: ["Core features", "1 project", "Community support"], featured: false },
      { name: "Pro", price: "$29", blurb: `For ${audience} who mean it.`, features: ["Everything in Starter", "Unlimited projects", "Priority support", "Advanced analytics"], featured: true },
      { name: "Scale", price: "Custom", blurb: "For teams at scale.", features: ["SSO & roles", "99.9% SLA", "Dedicated partner"], featured: false },
    ],
    ctaTitle: `Ready to ${goals[0] ?? "get started"}?`,
    ctaSub: `Join the ${audience} already building with ${brand}.`,
  };
}

function capitalizeSmart(s: string) {
  const t = s.trim().replace(/\.$/, "");
  return t.length > 76 ? t.slice(0, 76) + "…" : t.charAt(0).toUpperCase() + t.slice(1);
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function navSection(c: Content) {
  return `<header class="nav"><div class="container nav-inner">
  <a class="brand" href="#top"><span class="brand-mark"></span>${esc(c.brand)}</a>
  <nav class="nav-links main" aria-label="Primary">${c.navItems.map((n) => `<a href="#${slug(n)}">${esc(n)}</a>`).join("")}</nav>
  <a class="btn btn-primary" href="#cta">${esc(c.primaryCta)}</a>
</div></header>`;
}

function heroSection(c: Content) {
  return `<section class="hero section grain" id="top">
  <div class="mesh"></div>
  <span class="orb" style="width:340px;height:340px;background:var(--primary);top:-80px;left:-60px"></span>
  <span class="orb" style="width:300px;height:300px;background:var(--accent);top:40px;right:-70px;opacity:.4"></span>
  <div class="container hero-inner center" style="max-width:1000px">
    <span class="eyebrow reveal">${esc(c.heroEyebrow)}</span>
    <h1 class="display grad reveal" style="margin:1.3rem auto .95rem;max-width:16ch">${esc(c.heroTitle)}</h1>
    <p class="lead reveal" style="margin:0 auto 2.2rem;text-align:center">${esc(c.heroSub)}</p>
    <div class="reveal" style="display:flex;gap:.9rem;justify-content:center;flex-wrap:wrap">
      <a class="btn btn-primary btn-lg" href="#cta">${esc(c.primaryCta)}</a>
      <a class="btn btn-ghost btn-lg" href="#features">${esc(c.secondaryCta)}</a>
    </div>
    <p class="small muted reveal" style="margin-top:1.1rem">No credit card required · Cancel anytime</p>
    <div class="mock reveal" style="margin-top:3.6rem;text-align:left">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span style="margin-left:.6rem;height:20px;flex:1;max-width:280px;background:var(--bg);border-radius:6px;border:1px solid var(--border)"></span></div>
      <div style="padding:clamp(1.4rem,4vw,2.4rem);display:grid;gap:1.1rem;background:var(--bg);position:relative">
        <div style="height:150px;border-radius:var(--r-md);background:radial-gradient(60% 90% at 20% 10%,color-mix(in srgb,var(--primary) 34%,var(--surface)),transparent 70%),radial-gradient(50% 80% at 90% 20%,color-mix(in srgb,var(--accent) 30%,var(--surface)),transparent 70%),var(--surface)"></div>
        <div class="grid grid-3">
          ${[0, 1, 2].map((i) => `<div class="card" style="box-shadow:none;padding:1.2rem"><div class="icon-tile" style="width:36px;height:36px;border-radius:10px">${icon(ICONS[i])}</div><div style="height:9px;width:64%;background:var(--border);border-radius:6px;margin-top:1rem"></div><div style="height:7px;width:92%;background:var(--surface-alt);border-radius:6px;margin-top:.55rem"></div></div>`).join("")}
        </div>
        <div class="float-card hide-sm" style="top:1.4rem;right:1.4rem"><div class="metric-num" style="font-size:1.5rem">+38%</div><div class="small muted">conversion</div></div>
        <div class="float-card hide-sm" style="bottom:1.4rem;left:1.4rem"><div style="display:flex;align-items:center;gap:.5rem"><span class="dot" style="background:var(--accent)"></span><span class="small" style="font-weight:600">Live · 2,481 online</span></div></div>
      </div>
    </div>
  </div>
</section>`;
}

function logosSection(c: Content) {
  const names = ["Northwind", "Lumen", "Vertex", "Cadence", "Halcyon", "Monolith", "Aperture", "Kinetic"];
  const row = names.map((n) => `<span class="logo-item">${n}</span>`).join("");
  return `<section class="section-sm"><div class="container reveal center">
    <p class="small muted" style="letter-spacing:.16em;text-transform:uppercase;margin-bottom:1.8rem">Trusted by teams building ${esc(c.heroEyebrow.toLowerCase())}</p>
    <div class="logos-wrap"><div class="logos">${row}${row}</div></div>
  </div></section>`;
}

function featuresSection(c: Content) {
  const f = c.features;
  const cell = (feat: { title: string; body: string }, i: number, cls = "") =>
    `<article class="card reveal ${cls}" style="transition-delay:${i * 60}ms">
      <div class="icon-tile">${icon(ICONS[i % ICONS.length])}</div>
      <h3 class="h3" style="margin:1.1rem 0 .5rem">${esc(feat.title)}</h3>
      <p>${esc(feat.body)}</p>
    </article>`;
  return `<section class="section" id="features"><div class="container">
    <div class="reveal" style="max-width:60ch;margin-bottom:3.2rem">
      <span class="eyebrow plain">Why ${esc(c.brand)}</span>
      <h2 class="h1" style="margin-top:1rem">Everything you need,<br><span class="grad">nothing you don't.</span></h2>
    </div>
    <div class="bento">
      ${cell(f[0], 0, "wide tall")}
      ${f.slice(1, 5).map((x, i) => cell(x, i + 1)).join("")}
    </div>
  </div></section>`;
}

function showcaseSection(c: Content) {
  return `<section class="section" id="showcase" style="background:var(--surface)"><div class="container grid grid-2" style="align-items:center;gap:clamp(2rem,5vw,4.5rem)">
    <div class="reveal">
      <span class="eyebrow plain">Showcase</span>
      <h2 class="h1" style="margin:1rem 0 1.1rem">Designed to be seen.</h2>
      <p class="lead">Every screen is composed with intention — clear hierarchy, honest spacing, and typography that carries the brand. This is what ${esc(c.brand)} ships by default.</p>
      <ul style="margin-top:1.8rem;display:grid;gap:.9rem">
        ${["Consistent spacing rhythm", "Accessible color contrast", "Responsive from 320px up", "Considered micro-interactions"].map((t) => `<li style="display:flex;gap:.65rem;align-items:center">${check}<span>${t}</span></li>`).join("")}
      </ul>
    </div>
    <div class="mock reveal">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span></div>
      <div style="padding:1.7rem;display:grid;gap:1.1rem;background:var(--bg)">
        <div style="height:130px;border-radius:var(--r-md);background:radial-gradient(70% 90% at 25% 15%,color-mix(in srgb,var(--primary) 40%,var(--surface)),transparent 72%),radial-gradient(60% 80% at 90% 30%,color-mix(in srgb,var(--accent) 34%,var(--surface)),transparent 72%),var(--surface)"></div>
        <div class="grid grid-2">
          <div class="card" style="box-shadow:none"><div class="metric-num" style="font-size:2rem">4.9</div><p class="small">avg. rating</p></div>
          <div class="card" style="box-shadow:none"><div class="metric-num" style="font-size:2rem">+38%</div><p class="small">conversion lift</p></div>
        </div>
      </div>
    </div>
  </div></section>`;
}

function metricsSection(c: Content) {
  return `<section class="section-sm"><div class="container">
    <div class="glass" style="padding:clamp(2rem,5vw,3.2rem)"><div class="grid grid-4 center">
    ${c.metrics.map((m, i) => `<div class="reveal" style="transition-delay:${i * 70}ms"><div class="metric-num">${esc(m.num)}</div><p class="small" style="margin-top:.5rem">${esc(m.label)}</p></div>`).join("")}
    </div></div>
  </div></section>`;
}

function testimonialSection(c: Content) {
  return `<section class="section"><div class="container reveal" style="max-width:900px;text-align:center">
    <div class="eyebrow plain">Loved by users</div>
    <blockquote class="h2" style="font-weight:600;margin:1.4rem 0 1.8rem;line-height:1.28">“${esc(c.testimonial.quote)}”</blockquote>
    <div style="display:flex;gap:.8rem;align-items:center;justify-content:center">
      <span style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent))"></span>
      <div style="text-align:left"><div style="font-weight:700">${esc(c.testimonial.who)}</div><div class="small muted">${esc(c.testimonial.role)}</div></div>
    </div>
  </div></section>`;
}

function pricingSection(c: Content) {
  return `<section class="section" id="pricing" style="background:var(--surface)"><div class="container">
    <div class="reveal center" style="max-width:56ch;margin:0 auto 3.4rem">
      <span class="eyebrow plain">Pricing</span>
      <h2 class="h1" style="margin-top:1rem">Simple, honest pricing.</h2>
      <p class="lead" style="margin:1rem auto 0">Start free. Upgrade when it pays for itself.</p>
    </div>
    <div class="grid grid-3" style="align-items:start">
      ${c.tiers.map((t, i) => `<article class="card reveal ${t.featured ? "tier-feat" : ""}" style="transition-delay:${i * 60}ms;${t.featured ? "position:relative" : ""}">
        ${t.featured ? `<span class="badge" style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--primary);color:var(--primary-text);border-color:var(--primary)">Most popular</span>` : ""}
        <h3 class="h3">${esc(t.name)}</h3>
        <p style="margin:.4rem 0 1.2rem">${esc(t.blurb)}</p>
        <div class="price">${esc(t.price)}${t.price.startsWith("$") && t.price !== "$0" ? `<span class="small muted" style="font-weight:500">/mo</span>` : ""}</div>
        <a class="btn ${t.featured ? "btn-primary" : "btn-ghost"}" href="#cta" style="width:100%;justify-content:center;margin:1.4rem 0">${t.featured ? c.primaryCta : "Choose " + t.name}</a>
        <ul style="display:grid;gap:.75rem">${t.features.map((f) => `<li style="display:flex;gap:.6rem;align-items:center" class="small">${check}<span>${esc(f)}</span></li>`).join("")}</ul>
      </article>`).join("")}
    </div>
  </div></section>`;
}

function ctaSection(c: Content) {
  return `<section class="section" id="cta"><div class="container"><div class="cta-band grain reveal" style="text-align:center;padding:clamp(3rem,7vw,5.5rem)">
    <div class="mesh"></div>
    <div style="position:relative;z-index:2">
      <h2 class="h1 grad" style="max-width:18ch;margin:0 auto 1.1rem">${esc(c.ctaTitle)}</h2>
      <p class="lead" style="margin:0 auto 2.2rem;text-align:center">${esc(c.ctaSub)}</p>
      <div style="display:flex;gap:.9rem;justify-content:center;flex-wrap:wrap">
        <a class="btn btn-primary btn-lg" href="#top">${esc(c.primaryCta)}</a>
        <a class="btn btn-ghost btn-lg" href="#features">Talk to us</a>
      </div>
    </div>
  </div></div></section>`;
}

function footerSection(c: Content) {
  const col = (title: string, items: string[]) => `<div><div class="small" style="font-weight:700;margin-bottom:.9rem">${title}</div><ul style="display:grid;gap:.6rem">${items.map((i) => `<li><a href="#${slug(i)}" class="small">${esc(i)}</a></li>`).join("")}</ul></div>`;
  return `<footer class="footer section-sm"><div class="container">
    <div class="grid" style="grid-template-columns:1.6fr 1fr 1fr 1fr;gap:2.5rem;align-items:start">
      <div>
        <a class="brand" href="#top"><span class="brand-mark"></span>${esc(c.brand)}</a>
        <p class="small" style="margin-top:1rem;max-width:34ch">${esc(c.heroSub.slice(0, 90))}</p>
      </div>
      ${col("Product", c.navItems.length ? c.navItems : ["Features", "Pricing"])}
      ${col("Company", ["About", "Careers", "Contact"])}
      ${col("Legal", ["Privacy", "Terms", "Security"])}
    </div>
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-top:2.5rem;padding-top:1.6rem;border-top:1px solid var(--border)">
      <p class="small">© ${new Date().getFullYear()} ${esc(c.brand)}. All rights reserved.</p>
      <p class="small">Crafted with FORME</p>
    </div>
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
