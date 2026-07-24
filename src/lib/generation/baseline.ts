import type { DesignSystem, DesignDirection, Requirements, WebsitePlan, ScenePlan, Scene } from "@/lib/design/schema";
import { systemToCss, fontLinkTag, MOTION_SCRIPT } from "./css";

// Deterministic, high-quality CINEMATIC renderer. Instead of one fixed section stack,
// it renders a SCENE PLAN — a sequence of distinct scenes, each with its own layout,
// background, spacing pace and motion — so the result feels like a directed scrolling
// experience and no two scenes look alike. Used as (1) the guaranteed-valid fallback
// when the LLM output is missing/malformed, and (2) proof the pipeline is scene-driven.

const esc = (s: string) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (s: string) => (s || "s").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "s";

const check = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
const arrow = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

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

function capital(s: string) {
  const t = (s || "").trim().replace(/\.$/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

type Ctx = {
  brand: string;
  navItems: { label: string; href: string }[];
  primaryCta: string;
  secondaryCta: string;
  industry: string;
  audience: string;
  atmosphere: string;
};

function buildCtx(req: Requirements, dir: DesignDirection): Ctx {
  const business = req.business?.trim() || "your product";
  const brand = deriveBrand(req.product ?? "", business);
  const shop = req.functionality?.some((f) => /buy|shop|store|commerce/i.test(f));
  return {
    brand,
    navItems: [
      { label: "Experience", href: "#scene-1" },
      { label: "Details", href: "#scene-3" },
      { label: "Story", href: "#scene-5" },
    ],
    primaryCta: shop ? "Shop now" : "Get started",
    secondaryCta: "Learn more",
    industry: req.industry || "",
    audience: req.target_audience || "modern teams",
    atmosphere: (dir.atmosphere || "restrained").toLowerCase(),
  };
}

// Motion class for a scene's reveal treatment.
function rv(scene: Scene): string {
  switch ((scene.motion || "").toLowerCase()) {
    case "mask": return "reveal rv-mask";
    case "zoom": return "reveal rv-scale";
    case "blur": return "reveal rv-blur";
    case "parallax": return "reveal";
    default:
      if ((scene.motion || "").includes("left")) return "reveal rv-left";
      return "reveal";
  }
}

const bgClass = (scene: Scene) => {
  const b = (scene.background || "base").toLowerCase();
  const ok = ["base", "surface", "tint", "gradient", "glow", "contrast"].includes(b) ? b : "base";
  return `scene--${ok}`;
};
const paceClass = (scene: Scene) => {
  const p = (scene.spacing || "normal").toLowerCase();
  const ok = ["tight", "normal", "airy", "huge"].includes(p) ? p : "normal";
  return `pace--${ok}`;
};

// Atmosphere level for the current render (from the art direction). Gates how much
// decorative depth is used — clean/editorial/swiss brands get NONE (no orb/grain/mesh).
let _atmo = "restrained";

// Background-specific atmosphere decor (sits behind content at z-index:0).
// Proportional to the brand's atmosphere so we never spam the same effect everywhere.
function decor(scene: Scene): string {
  if (_atmo === "none") return ""; // clean brands: no atmospheric effects at all
  const b = (scene.background || "base").toLowerCase();
  const rich = _atmo === "rich";
  if (b === "glow") {
    return rich
      ? `<div class="orb orb--primary" style="width:min(46vw,560px);height:min(46vw,560px);top:-14%;left:-8%" data-parallax="0.35"></div><div class="orb orb--accent" style="width:min(38vw,440px);height:min(38vw,440px);bottom:-18%;right:-6%" data-parallax="0.22"></div>`
      : `<div class="orb orb--primary" style="width:min(40vw,460px);height:min(40vw,460px);top:-16%;left:-10%;opacity:.32" data-parallax="0.3"></div>`;
  }
  if (b === "gradient") {
    return rich ? `<div class="mesh" data-parallax="0.18"></div><div class="grain"></div>` : `<div class="mesh" style="opacity:.5"></div>`;
  }
  // plain scenes (base/surface/tint/contrast): only faint grain for rich brands, else nothing
  return rich ? `<div class="grain" style="opacity:.05"></div>` : "";
}

// A CSS-drawn focal visual (no external images).
function visual(kind: "app" | "chart" | "field" | "orb"): string {
  if (kind === "field") {
    return `<div class="gradient-field" data-tilt style="aspect-ratio:4/3;box-shadow:var(--sh-lg)"></div>`;
  }
  if (kind === "chart") {
    const bars = [42, 68, 55, 88, 74, 96].map((h, i) => `<span style="flex:1;height:${h}%;border-radius:6px 6px 0 0;background:linear-gradient(180deg,var(--primary),color-mix(in srgb,var(--accent) 60%,var(--primary)));transition-delay:${i * 60}ms" class="reveal rv-scale"></span>`).join("");
    return `<div class="panel"><div class="panel-bar"><span class="panel-dot"></span><span class="panel-dot"></span><span class="panel-dot"></span></div><div style="display:flex;align-items:flex-end;gap:.6rem;height:220px;padding:1.4rem;background:var(--bg)">${bars}</div></div>`;
  }
  // app mock
  return `<div class="panel" data-tilt><div class="panel-bar"><span class="panel-dot"></span><span class="panel-dot"></span><span class="panel-dot"></span></div>
    <div style="padding:clamp(1.2rem,3vw,2rem);display:grid;gap:1rem;background:var(--bg)">
      <div class="gradient-field" style="height:120px"></div>
      <div class="grid grid-2"><div class="card" style="padding:1.1rem"><div class="stat-huge" style="font-size:2rem">4.9</div><p style="font-size:var(--fs-small)">rating</p></div><div class="card" style="padding:1.1rem"><div class="stat-huge" style="font-size:2rem">+38%</div><p style="font-size:var(--fs-small)">lift</p></div></div>
    </div></div>`;
}

// ── Scene renderers (each visually distinct) ────────────────────────────────────
type Renderer = (s: Scene, i: number, ctx: Ctx) => string;

const heroCentered: Renderer = (s, _i, ctx) => `
  ${decor(s)}
  <div class="container-narrow scene-inner" style="text-align:center;padding-top:3rem">
    ${s.eyebrow ? `<span class="kicker ${rv(s)}">${esc(s.eyebrow)}</span>` : ""}
    <h1 class="type-mega balance ${rv(s)}" style="margin:1.4rem auto .9rem">${esc(s.headline || ctx.brand)}</h1>
    <p class="lead balance ${rv(s)}" style="margin:0 auto 2.2rem;text-align:center">${esc(s.subcopy)}</p>
    <div class="${rv(s)}" style="display:flex;gap:.9rem;justify-content:center;flex-wrap:wrap">
      <a class="btn btn-primary" href="#cta">${esc(ctx.primaryCta)} ${arrow}</a>
      <a class="btn btn-ghost" href="#scene-2">${esc(ctx.secondaryCta)}</a>
    </div>
    <div class="reveal rv-scale" style="margin-top:3.4rem" data-parallax="0.12">${visual("app")}</div>
  </div>`;

const heroSplit: Renderer = (s, _i, ctx) => `
  ${decor(s)}
  <div class="container scene-inner" style="display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(2rem,5vw,4.5rem);align-items:center" >
    <div>
      ${s.eyebrow ? `<span class="kicker ${rv(s)}">${esc(s.eyebrow)}</span>` : ""}
      <h1 class="type-display balance ${rv(s)}" style="margin:1.2rem 0 1.1rem">${esc(s.headline || ctx.brand)}</h1>
      <p class="lead ${rv(s)}">${esc(s.subcopy)}</p>
      <div class="${rv(s)}" style="margin-top:2rem;display:flex;gap:.8rem;flex-wrap:wrap"><a class="btn btn-primary" href="#cta">${esc(ctx.primaryCta)} ${arrow}</a><a class="btn btn-ghost" href="#scene-2">${esc(ctx.secondaryCta)}</a></div>
    </div>
    <div class="reveal rv-right" data-mouse-parallax="16">${visual("field")}</div>
  </div>`;

const statement: Renderer = (s, _i, _ctx) => `
  ${decor(s)}
  <div class="container-narrow scene-inner" style="text-align:center">
    ${s.eyebrow ? `<span class="kicker ${rv(s)}" style="justify-content:center">${esc(s.eyebrow)}</span>` : ""}
    <p class="type-display balance ${rv(s)}" style="margin-top:1.4rem;font-weight:var(--w-head)">${esc(s.headline)}</p>
    ${s.subcopy ? `<p class="lead balance ${rv(s)}" style="margin:1.6rem auto 0;text-align:center">${esc(s.subcopy)}</p>` : ""}
  </div>`;

const splitImage: Renderer = (s, i, _ctx) => {
  const flip = i % 2 === 0;
  const text = `<div>
      ${s.eyebrow ? `<span class="kicker ${rv(s)}">${esc(s.eyebrow)}</span>` : ""}
      <h2 class="type-display balance ${rv(s)}" style="margin:1rem 0 1rem">${esc(s.headline)}</h2>
      <p class="lead ${rv(s)}">${esc(s.subcopy)}</p>
      ${(s.items || []).length ? `<ul class="stagger ${""}" style="list-style:none;margin-top:1.8rem;display:grid;gap:1rem">${s.items.slice(0, 4).map((it) => `<li class="reveal rv-left" style="display:flex;gap:.7rem;align-items:flex-start"><span style="color:var(--accent);margin-top:.15rem">${check}</span><span><strong>${esc(it.title)}</strong>${it.body ? ` — <span class="muted">${esc(it.body)}</span>` : ""}</span></li>`).join("")}</ul>` : ""}
    </div>`;
  const vis = `<div class="reveal ${flip ? "rv-right" : "rv-left"}" data-mouse-parallax="14">${visual("field")}</div>`;
  return `${decor(s)}<div class="container scene-inner" style="display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,5vw,4.5rem);align-items:center">${flip ? text + vis : vis + text}</div>`;
};

const featureSpotlight: Renderer = (s, _i, _ctx) => `
  ${decor(s)}
  <div class="container scene-inner">
    <div class="container-narrow" style="margin-inline:0;text-align:center;margin-bottom:clamp(2.5rem,5vw,4rem)">
      ${s.eyebrow ? `<span class="kicker ${rv(s)}" style="justify-content:center">${esc(s.eyebrow)}</span>` : ""}
      <h2 class="type-display balance ${rv(s)}" style="margin:1rem auto 0">${esc(s.headline)}</h2>
      ${s.subcopy ? `<p class="lead balance ${rv(s)}" style="margin:1.1rem auto 0;text-align:center">${esc(s.subcopy)}</p>` : ""}
    </div>
    <div class="grid grid-3 stagger">${(s.items?.length ? s.items : defaultItems(3)).slice(0, 6).map((it, k) => `<article class="card reveal rv-scale"><div style="width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:color-mix(in srgb,var(--primary) 16%,transparent);color:var(--primary);margin-bottom:1.1rem;font-weight:800">${k + 1}</div><h3 class="h3" style="margin-bottom:.5rem">${esc(it.title)}</h3><p>${esc(it.body)}</p></article>`).join("")}</div>
  </div>`;

const cards = featureSpotlight;

const showcase: Renderer = (s, _i, _ctx) => `
  ${decor(s)}
  <div class="container scene-inner" style="display:grid;grid-template-columns:.9fr 1.1fr;gap:clamp(2rem,5vw,4rem);align-items:center">
    <div>
      ${s.eyebrow ? `<span class="kicker ${rv(s)}">${esc(s.eyebrow)}</span>` : ""}
      <h2 class="type-display balance ${rv(s)}" style="margin:1rem 0 1rem">${esc(s.headline)}</h2>
      <p class="lead ${rv(s)}">${esc(s.subcopy)}</p>
      <ul class="stagger" style="list-style:none;margin-top:1.6rem;display:grid;gap:.9rem">${(s.items?.length ? s.items : defaultItems(3)).slice(0, 4).map((it) => `<li class="reveal rv-left" style="display:flex;gap:.6rem;align-items:center"><span style="color:var(--accent)">${check}</span><span>${esc(it.title)}</span></li>`).join("")}</ul>
    </div>
    <div class="reveal rv-right" data-parallax="0.16">${visual("app")}</div>
  </div>`;

const metrics: Renderer = (s, _i, _ctx) => {
  const items = s.items?.length ? s.items : [{ title: "99.9%", body: "uptime", meta: "" }, { title: "3.2x", body: "faster", meta: "" }, { title: "12k+", body: "teams", meta: "" }];
  return `${decor(s)}<div class="container scene-inner">
    ${s.headline ? `<h2 class="type-display balance ${rv(s)}" style="max-width:20ch;margin-bottom:clamp(2rem,4vw,3rem)">${esc(s.headline)}</h2>` : ""}
    <div class="grid grid-3 stagger" style="text-align:left">${items.slice(0, 4).map((it) => { const num = parseFloat((it.title || "").replace(/[^0-9.]/g, "")); const suffix = (it.title || "").replace(/[0-9.\s]/g, ""); const numeric = !Number.isNaN(num) && (it.title || "").length < 8; return `<div class="reveal rv-scale"><div class="stat-huge">${numeric ? `<span data-countup="${num}" data-suffix="${esc(suffix)}">${esc(it.title)}</span>` : esc(it.title)}</div><p style="margin-top:.4rem;font-size:1.05rem">${esc(it.body)}</p></div>`; }).join("")}</div>
  </div>`;
};

const quote: Renderer = (s, _i, _ctx) => `
  ${decor(s)}
  <div class="container-narrow scene-inner" style="text-align:center">
    <div class="${rv(s)}" style="font-family:var(--font-heading);font-size:clamp(2rem,4.5vw,3.6rem);line-height:1.15;font-weight:var(--w-head);letter-spacing:-.02em">“${esc(s.headline)}”</div>
    ${s.subcopy ? `<p class="muted ${rv(s)}" style="margin-top:1.8rem;font-size:1.05rem">— ${esc(s.subcopy)}</p>` : ""}
  </div>`;

const timeline: Renderer = (s, _i, _ctx) => {
  const items = s.items?.length ? s.items : defaultItems(4);
  return `${decor(s)}<div class="container scene-inner" style="display:grid;grid-template-columns:.8fr 1.2fr;gap:clamp(2rem,5vw,4rem)">
    <div><span class="kicker ${rv(s)}">${esc(s.eyebrow || "The journey")}</span><h2 class="type-display balance ${rv(s)}" style="margin-top:1rem">${esc(s.headline)}</h2></div>
    <ol class="stagger" style="list-style:none;display:grid;gap:0">${items.slice(0, 6).map((it, k) => `<li class="reveal rv-left" style="display:grid;grid-template-columns:auto 1fr;gap:1.2rem;padding:1.3rem 0;border-top:1px solid color-mix(in srgb,var(--text) 12%,transparent)"><span class="muted" style="font-family:var(--font-mono,monospace);font-size:.8rem;padding-top:.2rem">${esc(it.meta || String(k + 1).padStart(2, "0"))}</span><div><h3 class="h3" style="margin-bottom:.35rem">${esc(it.title)}</h3><p>${esc(it.body)}</p></div></li>`).join("")}</ol>
  </div>`;
};

const steps = timeline;

const gallery: Renderer = (s, _i, _ctx) => {
  const items = s.items?.length ? s.items : defaultItems(6);
  return `${decor(s)}<div class="container-wide scene-inner">
    <div style="max-width:60ch;margin-bottom:clamp(2rem,4vw,3rem)">${s.eyebrow ? `<span class="kicker ${rv(s)}">${esc(s.eyebrow)}</span>` : ""}<h2 class="type-display balance ${rv(s)}" style="margin-top:1rem">${esc(s.headline)}</h2></div>
    <div class="grid stagger" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">${items.slice(0, 6).map((it, k) => `<figure class="reveal rv-scale" style="margin:0;grid-row:span ${k % 3 === 0 ? 2 : 1}"><div class="gradient-field" style="height:100%;min-height:${k % 3 === 0 ? 340 : 190}px;display:flex;align-items:flex-end;padding:1.1rem"><figcaption style="color:#fff;font-weight:600;text-shadow:0 2px 12px rgba(0,0,0,.4)">${esc(it.title)}</figcaption></div></figure>`).join("")}</div>
  </div>`;
};

const marquee: Renderer = (s, _i, _ctx) => {
  const words = (s.items?.length ? s.items.map((i) => i.title) : ["Considered", "Intentional", "Crafted", "Precise", "Alive", "Memorable"]);
  const track = words.concat(words).map((w) => `<span class="marquee__item">${esc(w)}</span><span class="marquee__item" style="color:var(--accent);opacity:.5">✦</span>`).join("");
  return `${decor(s)}<div class="scene-inner">${s.headline ? `<div class="container" style="text-align:center;margin-bottom:2.2rem"><h2 class="type-display balance ${rv(s)}">${esc(s.headline)}</h2></div>` : ""}<div class="marquee"><div class="marquee__track">${track}</div></div></div>`;
};

const comparison: Renderer = (s, _i, _ctx) => {
  const items = s.items?.length ? s.items : defaultItems(2);
  return `${decor(s)}<div class="container scene-inner">
    <div style="text-align:center;max-width:56ch;margin:0 auto clamp(2rem,4vw,3rem)">${s.eyebrow ? `<span class="kicker ${rv(s)}" style="justify-content:center">${esc(s.eyebrow)}</span>` : ""}<h2 class="type-display balance ${rv(s)}" style="margin-top:1rem">${esc(s.headline)}</h2></div>
    <div class="grid grid-2 stagger">${items.slice(0, 2).map((it, k) => `<div class="card reveal ${k ? "rv-right" : "rv-left"}" style="${k ? "border-color:color-mix(in srgb,var(--primary) 50%,var(--border))" : ""}"><span class="tag" style="margin-bottom:1rem">${k ? "With " + esc(it.meta || "us") : esc(it.meta || "Before")}</span><h3 class="h3" style="margin-bottom:.6rem">${esc(it.title)}</h3><p>${esc(it.body)}</p></div>`).join("")}</div>
  </div>`;
};

const faq: Renderer = (s, _i, _ctx) => {
  const items = s.items?.length ? s.items : defaultItems(4);
  return `${decor(s)}<div class="container scene-inner" style="display:grid;grid-template-columns:.7fr 1.3fr;gap:clamp(2rem,5vw,4rem)">
    <div><span class="kicker ${rv(s)}">${esc(s.eyebrow || "Questions")}</span><h2 class="type-display balance ${rv(s)}" style="margin-top:1rem">${esc(s.headline || "Answers")}</h2></div>
    <div class="stagger" style="display:grid;gap:0">${items.slice(0, 6).map((it) => `<details class="reveal" style="border-top:1px solid color-mix(in srgb,var(--text) 12%,transparent);padding:1.2rem 0" open><summary style="cursor:pointer;font-family:var(--font-heading);font-weight:600;font-size:1.15rem;list-style:none">${esc(it.title)}</summary><p style="margin-top:.7rem">${esc(it.body)}</p></details>`).join("")}</div>
  </div>`;
};

const cta: Renderer = (s, _i, ctx) => `
  ${decor(s)}
  <div class="container-narrow scene-inner" style="text-align:center">
    ${s.eyebrow ? `<span class="kicker ${rv(s)}" style="justify-content:center">${esc(s.eyebrow)}</span>` : ""}
    <h2 class="type-mega balance ${rv(s)}" style="margin:1.2rem auto .9rem">${esc(s.headline || "Ready when you are.")}</h2>
    ${s.subcopy ? `<p class="lead balance ${rv(s)}" style="margin:0 auto 2.2rem;text-align:center">${esc(s.subcopy)}</p>` : ""}
    <div class="${rv(s)}" style="display:flex;gap:.9rem;justify-content:center;flex-wrap:wrap"><a class="btn btn-primary" href="#top">${esc(ctx.primaryCta)} ${arrow}</a><a class="btn btn-ghost" href="#top">Talk to us</a></div>
  </div>`;

const RENDERERS: Record<string, Renderer> = {
  "hero-centered": heroCentered, "hero-split": heroSplit, statement, "split-image": splitImage,
  "feature-spotlight": featureSpotlight, cards, showcase, metrics, quote, timeline, steps,
  gallery, marquee, comparison, faq, cta,
};

function defaultItems(n: number) {
  const base = [
    { title: "Considered by default", body: "Every detail — type, spacing, motion — works together to feel intentional.", meta: "01" },
    { title: "Built to scale", body: "From day one to serious scale, with no rewrites required.", meta: "02" },
    { title: "Fast and reliable", body: "Performance and stability are features, not afterthoughts.", meta: "03" },
    { title: "Designed for people", body: "Accessible, responsive, and a genuine pleasure to use.", meta: "04" },
    { title: "Secure and private", body: "Your data is protected with sensible defaults throughout.", meta: "05" },
    { title: "Always improving", body: "Thoughtful iteration keeps the experience sharp over time.", meta: "06" },
  ];
  return base.slice(0, n);
}

function navBar(ctx: Ctx): string {
  return `<div class="scroll-progress"></div>
  <header id="top" style="position:sticky;top:0;z-index:50" class="glass">
    <div class="container" style="display:flex;align-items:center;justify-content:space-between;height:66px">
      <a href="#top" style="display:flex;align-items:center;gap:.6rem;font-family:var(--font-heading);font-weight:800;font-size:1.2rem;letter-spacing:-.02em"><span style="width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,var(--primary),var(--accent))"></span>${esc(ctx.brand)}</a>
      <nav style="display:flex;gap:1.6rem;align-items:center" aria-label="Primary">${ctx.navItems.map((n) => `<a href="${n.href}" style="color:var(--text-muted);font-size:var(--fs-small);font-weight:500">${esc(n.label)}</a>`).join("")}<a class="btn btn-primary" href="#cta" style="padding:.6rem 1.1rem">${esc(ctx.primaryCta)}</a></nav>
    </div>
  </header>`;
}

function footer(ctx: Ctx): string {
  return `<footer class="scene scene--surface pace--tight" style="border-top:1px solid var(--border)"><div class="container" style="display:flex;justify-content:space-between;gap:2rem;flex-wrap:wrap;align-items:center">
    <a href="#top" style="display:flex;align-items:center;gap:.6rem;font-family:var(--font-heading);font-weight:800"><span style="width:24px;height:24px;border-radius:7px;background:linear-gradient(135deg,var(--primary),var(--accent))"></span>${esc(ctx.brand)}</a>
    <p style="font-size:var(--fs-small)" class="muted">© ${esc(ctx.brand)}. Built with FORME.</p>
  </div></footer>`;
}

// Fill a Scene with sensible defaults so partial literals type-check.
function mkScene(o: Partial<Scene>): Scene {
  return {
    id: "", title: "", role: "", question: "", layout: "cards", composition: "centered", visual_style: "none",
    density: "medium", emotion: "confidence", background: "base", spacing: "airy", emphasis: "minimal",
    motion: "fade-up", interaction: "", visual_idea: "", signature: false, eyebrow: "", headline: "",
    subcopy: "", visual: "", items: [], ...o,
  };
}

// Deterministic default scene plan when none is supplied (safety net).
// Atmosphere-aware: clean brands stay on plain backgrounds.
function defaultScenePlan(ctx: Ctx, req: Requirements, dir: DesignDirection): ScenePlan {
  const biz = capital(req.business || ctx.brand);
  const concept = dir.visual_concept || "A considered, brand-specific scroll.";
  const clean = ctx.atmosphere === "none";
  const rich = ctx.atmosphere === "rich";
  const heroBg = rich ? "glow" : clean ? "base" : "surface";
  const quoteBg = clean ? "contrast" : "gradient";
  return {
    concept,
    narrative: "Welcome → why it exists → the experience → proof → voices → questions → call to action.",
    scenes: [
      mkScene({ id: "1", title: "Opening", role: "opening", question: "What is this?", layout: "hero-centered", composition: "centered", visual_style: rich ? "gradient-mesh" : "editorial-type", density: "rich", emotion: "wonder", background: heroBg, spacing: "airy", emphasis: "oversized", motion: rich ? "mask" : "fade-up", eyebrow: ctx.industry || "Introducing", headline: biz, subcopy: concept }),
      mkScene({ id: "2", title: "Why", role: "context", question: "Why does it exist?", layout: "statement", composition: "editorial", density: "minimal", emotion: "curiosity", background: "contrast", spacing: "huge", emphasis: "editorial", headline: `Built for ${ctx.audience} who expect more.` }),
      mkScene({ id: "3", title: "The experience", role: "experience", question: "How does it work?", layout: "split-image", composition: "split", visual_style: "product-mockup", density: "rich", emotion: "delight", signature: true, background: "base", spacing: "airy", emphasis: "image", motion: rich ? "parallax" : "fade-up", eyebrow: "The experience", headline: "Designed to be felt, not just used.", subcopy: "Every screen is composed with intention — clear hierarchy, honest spacing, and motion that guides.", visual: "product mockup", items: defaultItems(3) }),
      mkScene({ id: "4", title: "Proof", role: "proof", question: "Does it deliver?", layout: "metrics", composition: "asymmetric", visual_style: "data-viz", density: "medium", emotion: "confidence", background: "tint", spacing: "airy", emphasis: "number", motion: "countup", headline: "Numbers that speak for themselves.", items: [{ title: "99.9%", body: "uptime, guaranteed", meta: "" }, { title: "3.2x", body: `faster for ${ctx.audience}`, meta: "" }, { title: "12k+", body: "teams onboard", meta: "" }] }),
      mkScene({ id: "5", title: "Voices", role: "emotional", question: "Who loves it?", layout: "quote", composition: "centered", density: "minimal", emotion: "trust", background: quoteBg, spacing: "huge", emphasis: "editorial", headline: `Switching to ${ctx.brand} was the clearest decision we made all year.`, subcopy: `Head of Product, a ${ctx.industry || "growing"} company` }),
      mkScene({ id: "6", title: "Closer look", role: "calm", question: "What does it feel like?", layout: clean ? "comparison" : "gallery", composition: "magazine", visual_style: rich ? "svg-landscape" : "css-illustration", density: "rich", emotion: "calm", background: "base", spacing: "airy", emphasis: "image", motion: "stagger", eyebrow: "Closer look", headline: "Composed with intention.", items: defaultItems(6) }),
      mkScene({ id: "7", title: "Questions", role: "faq", question: "What should I know?", layout: "faq", composition: "offset", density: "minimal", emotion: "clarity", background: "surface", spacing: "airy", emphasis: "minimal", eyebrow: "Questions", headline: "Good to know.", items: defaultItems(4) }),
      mkScene({ id: "8", title: "Close", role: "climax", question: "What now?", layout: "cta", composition: "centered", density: "medium", emotion: "urgency", background: quoteBg, spacing: "huge", emphasis: "oversized", motion: rich ? "mask" : "fade-up", headline: `Ready to begin with ${ctx.brand}?`, subcopy: `Join the ${ctx.audience} already building with ${ctx.brand}.` }),
    ],
  };
}

export function renderBaseline(input: {
  system: DesignSystem;
  direction: DesignDirection;
  requirements: Requirements;
  plan: WebsitePlan;
  scenes?: ScenePlan | null;
}): string {
  // Atmosphere gates decorative depth so clean brands never get orb/grain/mesh spam.
  _atmo = (input.direction.atmosphere || "restrained").toLowerCase();
  const ctx = buildCtx(input.requirements, input.direction);
  const plan = input.scenes && input.scenes.scenes.length >= 3 ? input.scenes : defaultScenePlan(ctx, input.requirements, input.direction);

  const body = plan.scenes
    .map((scene, i) => {
      const key = (scene.layout || "").toLowerCase();
      const render = RENDERERS[key] || (key.includes("hero") ? heroCentered : key.includes("quote") ? quote : key.includes("metric") ? metrics : key.includes("cta") ? cta : featureSpotlight);
      const isCta = key === "cta" || i === plan.scenes.length - 1;
      return `<section id="${isCta ? "cta" : `scene-${i + 1}`}" class="scene ${bgClass(scene)} ${paceClass(scene)}" data-scene="${esc(slug(scene.title || key))}">${render(scene, i, ctx)}</section>`;
    })
    .join("\n");

  const css = systemToCss(input.system);
  const brandTitle = `${ctx.brand}${ctx.industry ? ` — ${capital(ctx.industry)}` : ""}`;
  const desc = plan.scenes[0]?.subcopy || plan.concept;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(brandTitle)}</title>
<meta name="description" content="${esc(desc)}">
${fontLinkTag(input.system)}
<style>${css}</style>
</head>
<body>
${navBar(ctx)}
${body}
${footer(ctx)}
${MOTION_SCRIPT}
</body>
</html>`;
}
