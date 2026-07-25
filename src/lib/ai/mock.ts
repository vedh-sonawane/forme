import type { AiProvider, GenerateOptions, GenerateResult } from "./types";

// Clearly-marked development fallback provider.
// Produces DETERMINISTIC, schema-valid JSON for every structured operation so the
// full FORME pipeline runs end-to-end with no API key. It is seeded by a hash of the
// input, so different inputs yield different-but-stable outputs. This is NOT a
// simulation of the real model's quality — it is a functional stand-in, and every
// output it produces is surfaced in the UI as "development fallback".

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

const pick = <T,>(arr: T[], r: number) => arr[Math.floor(r * arr.length) % arr.length];

const PALETTES = [
  { bg: "#0a0b0f", surface: "#12141c", surfaceAlt: "#1a1d29", text: "#f4f6fb", textMuted: "#9aa3b2", border: "#242838", primary: "#6366f1", primaryText: "#ffffff", accent: "#22d3ee" },
  { bg: "#ffffff", surface: "#f7f8fa", surfaceAlt: "#eef1f6", text: "#0b0d12", textMuted: "#5b616e", border: "#e4e8ef", primary: "#111827", primaryText: "#ffffff", accent: "#f97316" },
  { bg: "#fbfaf7", surface: "#f3f0e9", surfaceAlt: "#e9e4d8", text: "#1c1a17", textMuted: "#6b6459", border: "#ded7c7", primary: "#8b5cf6", primaryText: "#ffffff", accent: "#059669" },
  { bg: "#05070d", surface: "#0d1117", surfaceAlt: "#161b22", text: "#e6edf3", textMuted: "#8b949e", border: "#21262d", primary: "#2dd4bf", primaryText: "#04110f", accent: "#f472b6" },
];

const STYLES = ["modern minimal", "editorial", "bold brutalist", "refined luxury", "playful", "futuristic tech", "clean corporate"];
const MOODS = ["confident", "calm", "energetic", "premium", "trustworthy", "innovative", "approachable"];
const FONTS = [
  { h: "'Space Grotesk', system-ui, sans-serif", b: "'Inter', system-ui, sans-serif" },
  { h: "'Fraunces', Georgia, serif", b: "'Inter', system-ui, sans-serif" },
  { h: "'Sora', system-ui, sans-serif", b: "'Sora', system-ui, sans-serif" },
  { h: "'Clash Display', system-ui, sans-serif", b: "'General Sans', system-ui, sans-serif" },
];

function designDNA(seed: number) {
  const r = rng(seed);
  const pal = pick(PALETTES, r());
  const dark = pal.bg.startsWith("#0") || pal.bg.startsWith("#05");
  return {
    style: {
      primary_style: pick(STYLES, r()),
      secondary_styles: [pick(STYLES, r()), pick(STYLES, r())],
      mood: [pick(MOODS, r()), pick(MOODS, r())],
      visual_personality: "Deliberate, high-contrast composition with generous negative space and a clear focal path.",
      design_category: pick(["SaaS landing", "product marketing", "portfolio", "editorial", "e-commerce"], r()),
      industry: pick(["technology", "AI", "finance", "creative", "healthcare"], r()),
      target_audience: "Design-literate professionals evaluating a premium product.",
      perceived_quality: 68 + Math.floor(r() * 22),
    },
    typography: {
      heading_style: "Large, tightly-tracked display headings with strong weight contrast.",
      body_style: "Comfortable 16–18px body with 1.6 line-height for readability.",
      hierarchy: "3–4 distinct levels; dramatic jump from display to body.",
      scale: "Roughly 1.25–1.333 modular scale.",
      font_characteristics: "Geometric sans for headings, humanist sans for body.",
      sizes_note: "Display ~64px desktop, H2 ~34px, body ~17px.",
    },
    layout: {
      structure: "Single-column narrative with full-bleed hero and centered content max-width ~1200px.",
      grid: "12-column responsive grid, generous gutters.",
      spacing: "Consistent 8px spacing system; large section padding.",
      density: pick(["airy", "balanced", "compact"], r()),
      composition: "Z-pattern hero, alternating feature rows.",
      balance: "Asymmetric hero balanced by symmetric feature grid.",
      symmetry: pick(["asymmetric", "symmetric"], r()),
    },
    color: {
      palette: [
        { name: "background", hex: pal.bg, role: "background" },
        { name: "text", hex: pal.text, role: "text" },
        { name: "primary", hex: pal.primary, role: "primary" },
        { name: "accent", hex: pal.accent, role: "accent" },
        { name: "muted", hex: pal.textMuted, role: "muted" },
      ],
      contrast: dark ? "High contrast on dark canvas." : "Crisp high contrast on light canvas.",
      accent_usage: "Accent reserved for primary CTAs and key highlights only.",
    },
    components: {
      navigation: "Slim sticky top nav, logo left, links center/right, single primary CTA.",
      hero: "Oversized headline, one-line subhead, dual CTA, supporting visual.",
      cta: "High-contrast pill buttons with clear primary/secondary distinction.",
      cards: "Soft-radius cards with subtle border and low shadow.",
      buttons: "Pill radius, medium weight label, hover lift.",
      border_radius: pick(["small (8px)", "medium (14px)", "large (22px)"], r()),
      shadows: "Low, diffuse shadows for depth without heaviness.",
    },
    imagery: {
      style: "Abstract 3D/gradient hero visuals, product UI mockups.",
      illustration: "Minimal line + gradient accents.",
      iconography: "Consistent 1.5px stroke line icons.",
    },
    motion: { characteristics: "Subtle fade-and-rise on scroll, hover micro-interactions.", intensity: pick(["subtle", "moderate"], r()) },
    visual_hierarchy: {
      description: "Eye lands on headline → CTA → supporting proof.",
      focal_points: ["hero headline", "primary CTA", "social proof row"],
    },
    responsive: { behavior: "Fluid type via clamp(); nav collapses to menu; grids reflow to single column on mobile." },
    information_density: pick(["low", "medium"], r()),
    design_principles: [
      "Establish one clear focal path per screen.",
      "Reserve accent color for a single primary action.",
      "Use a consistent 8px spacing rhythm.",
      "Let negative space carry the premium feel.",
    ],
    strengths: ["Clear hierarchy", "Restrained, confident color use", "Consistent spacing rhythm"],
    weaknesses: ["Hero could show more product proof", "Secondary CTA competes with primary", "Mobile density slightly high"],
  };
}

// Brand-appropriate art direction chosen from the brief's language — the mock must NOT
// default everything to "cinematic". Atmosphere gates how much depth/effect is used.
type Art = { dir: string; atmo: "none" | "restrained" | "rich"; motion: string; arc: string[] };
const ART_MAP: { kw: RegExp; a: Art }[] = [
  { kw: /lux|premium|elegan|couture|fashion|jewel|boutique|bespoke|heritage/i, a: { dir: "luxury", atmo: "restrained", motion: "slow, elegant fades", arc: ["allure", "desire", "trust", "aspiration"] } },
  { kw: /brutal|\bbold\b|raw|edgy|street|under\s?ground|punk|zine/i, a: { dir: "brutalist", atmo: "none", motion: "snappy, mechanical cuts", arc: ["impact", "tension", "conviction", "urgency"] } },
  { kw: /nature|organic|eco|forest|garden|wellness|medit|sleep|calm|retreat|plant|ocean|mountain|botanic/i, a: { dir: "nature / organic", atmo: "rich", motion: "gentle parallax + layered reveals", arc: ["wonder", "calm", "curiosity", "belonging", "commitment"] } },
  { kw: /minimal|clean|simple|fintech|bank|invoice|account|ledger|payroll|dashboard/i, a: { dir: "swiss minimal", atmo: "none", motion: "restrained fades", arc: ["clarity", "confidence", "trust", "action"] } },
  { kw: /space|cosmos|star|galaxy|immersi|cinema|film|orbit|aerospace|vr|metaverse/i, a: { dir: "cinematic", atmo: "rich", motion: "layered parallax + reveals", arc: ["wonder", "awe", "curiosity", "desire", "commitment"] } },
  { kw: /\bai\b|robot|api|dev|data|cloud|cyber|tech|engine|infra|platform|sdk|devops/i, a: { dir: "technical", atmo: "restrained", motion: "precise, structured reveals", arc: ["curiosity", "confidence", "trust", "momentum"] } },
  { kw: /kid|\bplay|fun|game|toy|creative|comic|party|mascot/i, a: { dir: "playful", atmo: "restrained", motion: "bouncy micro-interactions", arc: ["delight", "playfulness", "joy", "action"] } },
  { kw: /editor|magazine|news|journal|story|blog|publish|essay|documentary/i, a: { dir: "editorial", atmo: "none", motion: "restrained fades", arc: ["intrigue", "immersion", "insight", "resonance"] } },
];
function pickArt(text: string): Art {
  for (const m of ART_MAP) if (m.kw.test(text)) return m.a;
  return { dir: "modern minimal", atmo: "restrained", motion: "quiet fades", arc: ["clarity", "interest", "trust", "action"] };
}

// Only the BRIEF text (business + industry + tone) drives art selection — never the
// prompt boilerplate (e.g. the field name "signature_moment" contains "nature").
function briefText(promptUser: string): string {
  const b = promptUser.match(/"business"\s*:\s*"([^"]*)"/)?.[1] || "";
  const p = promptUser.match(/"product"\s*:\s*"([^"]*)"/)?.[1] || "";
  const ind = promptUser.match(/"industry"\s*:\s*"([^"]*)"/)?.[1] || "";
  const tone = promptUser.match(/"tone"\s*:\s*\[([^\]]*)\]/)?.[1] || "";
  return [b, p, ind, tone].filter(Boolean).join(" ");
}

function designDirection(seed: number, promptUser: string) {
  const r = rng(seed);
  const art = pickArt(briefText(promptUser));
  const clean = art.atmo === "none";
  return {
    art_direction: art.dir,
    atmosphere: art.atmo,
    motion_language: art.motion,
    emotional_arc: art.arc,
    signature_moment: {
      description: clean ? "One oversized, perfectly-set typographic statement that anchors the whole page." : "A single focal reveal — the brand's promise crystallized in one memorable moment.",
      placement: "middle of the scroll",
      brand_fit: `Fits a ${art.dir} brand: it lifts perceived quality without fighting the content.`,
    },
    visual_concept: `A ${art.dir} experience — ${clean ? "clean, confident, and restrained" : "deliberate and atmospheric"}, tailored to the brand rather than a template.`,
    design_personality: art.arc.slice(0, 2).concat(art.dir),
    typography_direction: clean ? "Strong type hierarchy carries the page; large restrained headlines, generous whitespace, no decoration." : "Expressive display headlines against calm body; dramatic scale jumps for emphasis.",
    color_direction: "A disciplined palette — one canvas, one primary, one accent used sparingly.",
    layout_direction: "Scene-based composition: alternating structure and rhythm, never a repeated block.",
    component_direction: clean ? "Crisp rules and hairlines, square-ish cards, minimal shadow." : "Soft-radius panels, tasteful depth, considered shadows.",
    imagery_direction: clean ? "Editorial type and clean diagrams over decorative graphics." : "CSS/SVG-drawn visuals — illustration, mockups, or layered gradient scenes as the art direction fits.",
    motion_direction: art.motion,
    avoid: ["generic stock imagery", "competing CTAs", "cramped spacing", clean ? "glow/grain/orb atmosphere" : "the same effect on every scene", "defaulting to a cinematic template"],
    rationale: `${art.dir} chosen for this brand; atmosphere kept "${art.atmo}" so effects stay proportional and on-brand.`,
  };
}

function designSystem(seed: number) {
  const r = rng(seed);
  const pal = pick(PALETTES, r());
  const font = pick(FONTS, r());
  return {
    colors: pal,
    typography: {
      fontHeading: font.h,
      fontBody: font.b,
      weightHeading: pick([600, 700, 800], r()),
      weightBody: 400,
      scale: {
        display: "clamp(2.8rem, 6vw, 4.6rem)",
        h1: "clamp(2.1rem, 4vw, 3.1rem)",
        h2: "clamp(1.6rem, 2.6vw, 2.2rem)",
        h3: "1.35rem",
        body: "1.06rem",
        small: "0.875rem",
      },
      tracking: "-0.02em",
      lineHeight: "1.6",
    },
    spacing: { unit: 8, section: "clamp(4.5rem, 10vw, 9rem)", container: "1180px" },
    radius: { sm: "8px", md: "14px", lg: "22px", pill: "999px" },
    shadow: {
      sm: "0 1px 2px rgba(0,0,0,0.06)",
      md: "0 10px 34px rgba(0,0,0,0.12)",
      lg: "0 30px 70px rgba(0,0,0,0.20)",
    },
    motion: { easing: "cubic-bezier(0.16, 1, 0.3, 1)", durationMs: 520 },
  };
}

// The requirement-analysis prompt wraps the real idea as: User request:\n"""<idea>"""
// The mock only receives that built prompt string, so recover the clean idea from it
// instead of echoing the scaffolding ("User request:", triple quotes) into the brand.
function extractIdea(promptUser: string): string {
  const fenced = promptUser.match(/"""([\s\S]*?)"""/);
  let idea = (fenced ? fenced[1] : promptUser).trim();
  idea = idea.replace(/^\s*User request:\s*/i, "").replace(/^["'“”]+|["'“”]+$/g, "").trim();
  return idea;
}

const BRAND_STOP = new Set([
  "a", "an", "the", "for", "of", "to", "and", "or", "with", "your", "our", "that", "this",
  "site", "website", "landing", "page", "web", "app", "application", "platform", "startup",
  "company", "business", "brand", "builds", "building", "make", "create", "new",
]);

function deriveBrand(idea: string): string {
  const words = idea.replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const significant = words.filter((w) => !BRAND_STOP.has(w.toLowerCase()));
  const chosen = (significant.length ? significant : words).slice(0, 2).map((w) => w[0].toUpperCase() + w.slice(1));
  return (chosen.join(" ") || "Forme").slice(0, 24);
}

function requirements(promptUser: string) {
  const idea = extractIdea(promptUser);
  return {
    business: idea.slice(0, 200),
    product: deriveBrand(idea),
    industry: "technology",
    target_audience: "early adopters and decision-makers",
    goals: ["communicate value clearly", "drive sign-ups", "establish credibility"],
    tone: ["confident", "clear", "modern"],
    pages: ["Home"],
    functionality: ["Fast by default", "Enterprise-grade security", "Real-time analytics", "Seamless integrations", "Effortless setup", "Scales with you"],
    brand_colors: [],
    must_include: [],
    constraints: [],
  };
}

// A varied, cinematic scene plan — different briefs (and seeds) yield different
// layouts / backgrounds / rhythm, so even the fallback path is scene-driven, not a
// single repeated template.
function scenePlan(promptUser: string, seed: number) {
  const r = rng(seed);
  // The scene-plan prompt embeds the requirements as JSON; read business/product from
  // it (fall back to idea extraction) so the mock never leaks prompt scaffolding.
  const bMatch = promptUser.match(/"business"\s*:\s*"([^"]*)"/);
  const pMatch = promptUser.match(/"product"\s*:\s*"([^"]*)"/);
  const business = (bMatch ? bMatch[1] : extractIdea(promptUser)) || "your product";
  const product = pMatch ? pMatch[1] : "";
  // product is the project name (the brand) — use it verbatim when present.
  const brand = product && product.trim() ? product.trim().split(/\s+/).slice(0, 4).join(" ").slice(0, 34) : deriveBrand(business);
  const short = business.split(/(?<=[.!?])\s+/)[0].replace(/^(?:an?|the)\s+/i, "");

  // Honor the art direction's atmosphere (parsed from the direction JSON in the prompt):
  // clean brands get NO glow/gradient/grain; rich brands get the full atmospheric set.
  const atmosphere = (promptUser.match(/"atmosphere"\s*:\s*"([^"]*)"/)?.[1] || "restrained").toLowerCase();
  const art = promptUser.match(/"art_direction"\s*:\s*"([^"]*)"/)?.[1] || "modern minimal";
  const rich = atmosphere === "rich";
  const clean = atmosphere === "none";

  const experienceLayouts = ["split-image", "showcase", "feature-spotlight"];
  const storyLayouts = clean ? ["comparison", "steps", "timeline"] : ["gallery", "timeline", "comparison", "steps"];
  const heroLayout = pick(["hero-centered", "hero-split"], r());
  const experience = pick(experienceLayouts, r());
  const story = pick(storyLayouts, r());

  // Background palettes gated by atmosphere (no gradient/glow when clean).
  const cleanBgs = ["base", "surface", "contrast", "tint", "base", "surface", "tint", "contrast"];
  const richBgs = pick([["glow", "surface", "gradient", "base", "contrast", "glow", "surface", "gradient"], ["gradient", "base", "glow", "surface", "contrast", "tint", "base", "gradient"]], r());
  const restrainedBgs = pick([["base", "surface", "tint", "contrast", "base", "gradient", "surface", "contrast"], ["surface", "base", "contrast", "tint", "base", "surface", "tint", "contrast"]], r());
  const bgCycle = clean ? cleanBgs : rich ? richBgs : restrainedBgs;

  const spaceCycle = pick([["airy", "huge", "airy", "airy", "huge", "airy", "normal", "huge"], ["airy", "tight", "airy", "huge", "airy", "airy", "normal", "huge"]], r());
  const cleanMotions = ["fade-up", "fade-up", "stagger", "fade-up", "none", "stagger", "fade-up", "fade-up"];
  const richMotions = ["mask", "fade-up", "parallax", "countup", "blur", "stagger", "fade-up", "mask"];
  const motions = clean ? cleanMotions : rich ? richMotions : ["fade-up", "fade-up", "parallax", "countup", "fade-up", "stagger", "fade-up", "fade-up"];
  const compositions = pick([["centered", "editorial", "split", "offset", "asymmetric", "magazine", "split", "centered"], ["centered", "split", "offset", "editorial", "immersive", "asymmetric", "magazine", "centered"]], r());
  const cleanStyles = ["editorial-type", "none", "product-mockup", "data-viz", "none", "minimal-diagram", "none", "editorial-type"];
  const richStyles = ["gradient-mesh", "svg-landscape", "product-mockup", "data-viz", "3d-object", "abstract-shapes", "none", "gradient-mesh"];
  const styles = clean ? cleanStyles : rich ? richStyles : ["product-mockup", "none", "css-illustration", "data-viz", "none", "isometric", "none", "editorial-type"];
  const densities = ["rich", "minimal", "rich", "medium", "minimal", "rich", "minimal", "medium"];
  const emotions = ["wonder", "curiosity", "delight", "confidence", "trust", "calm", "clarity", "urgency"];
  const SIGNATURE = 2; // the experience scene is the mid-scroll signature moment

  // Build honest content from the REAL extracted requirements (functionality, goals,
  // audience) that arrive in the requirements JSON — NO fake metrics or testimonials.
  const parseArr = (key: string) => {
    const m = promptUser.match(new RegExp('"' + key + '"\\s*:\\s*\\[([^\\]]*)\\]'));
    return m ? m[1].split(/"\s*,\s*"/).map((s) => s.replace(/^\s*"|"\s*$/g, "").replace(/\\"/g, '"').trim()).filter(Boolean) : [];
  };
  const functionality = parseArr("functionality");
  const goals = parseArr("goals");
  const audience = (promptUser.match(/"target_audience"\s*:\s*"([^"]*)"/)?.[1] || "").trim();
  const rest = business.split(/(?<=[.!?])\s+/).slice(1).join(" ").trim();
  const featTitle = (f: string) => f.split(/[:—-]/)[0].trim().split(/\s+/).slice(0, 7).join(" ");
  const featBody = (f: string) => { const parts = f.split(/[:—]/); return (parts.length > 1 ? parts.slice(1).join(":") : f).trim(); };
  const capabilities = (functionality.length ? functionality : [business]).map((f, i) => ({ title: capitalize(featTitle(f)), body: featBody(f), meta: String(i + 1).padStart(2, "0") }));
  const feats = capabilities.slice(0, 3);
  const goalItems = goals.map((g, i) => ({ title: capitalize(featTitle(g)), body: g, meta: String(i + 1).padStart(2, "0") }));
  const mission = goals[0] || `Everything ${brand} exists to do — done with care.`;
  const emotionalLine = goals[goals.length - 1] || mission;
  const faqItems = [
    { title: `What is ${brand}?`, body: business, meta: "" },
    { title: "What can I do here?", body: capabilities.slice(0, 4).map((c) => c.title).join(" · ") || business, meta: "" },
    { title: "Who is it for?", body: audience ? capitalize(audience) + "." : "Anyone who cares about this.", meta: "" },
    { title: "How do I begin?", body: "Start exploring right away — everything is one click from here.", meta: "" },
  ];

  const scene = (i: number, o: Partial<Record<string, unknown>>) => ({
    id: String(i + 1),
    title: "",
    role: "",
    question: "",
    layout: "cards",
    composition: compositions[i] || "centered",
    visual_style: styles[i] || "none",
    density: densities[i] || "medium",
    emotion: emotions[i] || "confidence",
    background: bgCycle[i] || "base",
    spacing: spaceCycle[i] || "airy",
    emphasis: "minimal",
    motion: motions[i] || "fade-up",
    interaction: "",
    visual_idea: "",
    signature: i === SIGNATURE,
    eyebrow: "",
    headline: "",
    subcopy: "",
    visual: "",
    items: [] as { title: string; body: string; meta: string }[],
    ...o,
  });

  return {
    concept: `A ${art} experience for ${brand} — built around what it actually does for ${audience || "the people it serves"}.`,
    narrative: "Open with what it is, say why it matters, show what you can actually do, reinforce the purpose, land an emotional beat, answer real questions, then invite people in.",
    scenes: [
      scene(0, { title: "The opening", role: "opening", question: "What is this?", layout: heroLayout, emphasis: "oversized", visual_idea: clean ? "One oversized typographic statement, generous whitespace" : "A single focal form over a quiet field", eyebrow: capitalize(audience) || "Welcome", headline: capitalize(short), subcopy: rest || mission }),
      scene(1, { title: "Why it exists", role: "context", question: "Why does this exist?", layout: "statement", emphasis: "editorial", visual_idea: "A calm full-bleed statement of purpose", headline: capitalize(mission) }),
      scene(2, { title: "What you can do", role: "experience", question: "What can I actually do here?", layout: experience, emphasis: "image", interaction: clean ? "subtle hover reveal" : "pointer-based depth", visual_idea: "The core experience shown at its best — the signature beat", eyebrow: "What you can do", headline: `Inside ${brand}.`, subcopy: rest || "", items: feats }),
      scene(3, { title: "The purpose", role: "proof", question: "Why does it matter?", layout: goalItems.length ? "feature-spotlight" : experience, emphasis: "editorial", visual_idea: "The mission, made concrete", eyebrow: "Built with purpose", headline: "What we're here to do.", items: (goalItems.length ? goalItems : capabilities.slice(3)).slice(0, 3) }),
      scene(4, { title: "The feeling", role: "emotional", question: "Why should I care?", layout: "quote", emphasis: "editorial", visual_idea: "A single large statement, set beautifully", headline: capitalize(emotionalLine) }),
      scene(5, { title: "A closer look", role: "calm", question: "What does it feel like?", layout: story, emphasis: "image", visual_idea: "A calm, closer look at the details", eyebrow: "Explore", headline: "Everything, in one place.", items: capabilities.slice(0, 6) }),
      scene(6, { title: "Questions", role: "faq", question: "What should I know?", layout: "faq", emphasis: "minimal", visual_idea: "Quiet, scannable answers", eyebrow: "Questions", headline: "Good to know.", items: faqItems }),
      scene(7, { title: "The close", role: "climax", question: "What now?", layout: "cta", emphasis: "oversized", visual_idea: "A confident closing line and a single clear action", headline: `Begin with ${brand}.`, subcopy: mission }),
    ],
  };
}

function capitalize(s: string) {
  const t = (s || "").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Deterministic Application Blueprint derived from the requirements JSON in the prompt.
function applicationBlueprint(promptUser: string) {
  const business = promptUser.match(/"business"\s*:\s*"([^"]*)"/)?.[1] || "your product";
  const product = promptUser.match(/"product"\s*:\s*"([^"]*)"/)?.[1] || "";
  const brand = product && product.trim() ? product.trim() : deriveBrand(business);
  const goalsM = promptUser.match(/"goals"\s*:\s*\[([^\]]*)\]/);
  const goals = goalsM ? goalsM[1].split(/"\s*,\s*"/).map((s) => s.replace(/^\s*"|"\s*$/g, "").trim()).filter(Boolean) : [];
  const funcsM = promptUser.match(/"functionality"\s*:\s*\[([^\]]*)\]/);
  const funcs = funcsM ? funcsM[1].split(/"\s*,\s*"/).map((s) => s.replace(/^\s*"|"\s*$/g, "").trim()).filter(Boolean) : [];
  const entityName = brand.split(/\s+/)[0].replace(/[^A-Za-z]/g, "") || "Item";

  return {
    summary: `A production web application for ${business.slice(0, 160)}`,
    app_type: "saas",
    business_goals: goals.length ? goals : ["deliver core value", "acquire users", "retain and grow"],
    architecture: "Next.js (App Router) + Prisma + a relational database. Server components for reads, route handlers/server actions for writes, session-based auth.",
    entities: [
      { name: "User", description: "An account holder.", fields: [{ name: "id", type: "uuid", note: "pk" }, { name: "email", type: "string", note: "unique" }, { name: "name", type: "string", note: "" }, { name: "role", type: "enum(user,admin)", note: "" }, { name: "createdAt", type: "datetime", note: "" }] },
      { name: entityName, description: `Core record for ${brand}.`, fields: [{ name: "id", type: "uuid", note: "pk" }, { name: "title", type: "string", note: "" }, { name: "status", type: "enum", note: "" }, { name: "ownerId", type: "uuid", note: "fk → User" }, { name: "createdAt", type: "datetime", note: "" }] },
    ],
    relationships: [{ from: "User", to: entityName, kind: "one-to-many" }],
    pages: [
      { name: "Landing", path: "/", purpose: "Marketing homepage", auth: false },
      { name: "Sign in / Sign up", path: "/login", purpose: "Authentication", auth: false },
      { name: "Dashboard", path: "/dashboard", purpose: "Authenticated home", auth: true },
      { name: `${entityName} list`, path: "/app", purpose: `Browse ${entityName.toLowerCase()}s`, auth: true },
      { name: "Settings", path: "/settings", purpose: "Account & preferences", auth: true },
    ],
    api_endpoints: [
      { method: "POST", path: "/api/auth/register", purpose: "Create account", auth: false },
      { method: "POST", path: "/api/auth/login", purpose: "Sign in", auth: false },
      { method: "GET", path: `/api/${entityName.toLowerCase()}s`, purpose: `List ${entityName.toLowerCase()}s`, auth: true },
      { method: "POST", path: `/api/${entityName.toLowerCase()}s`, purpose: `Create ${entityName.toLowerCase()}`, auth: true },
    ],
    auth: { required: true, methods: ["email-password"], roles: ["user", "admin"] },
    backend_services: ["Authentication & sessions", "Data access (Prisma)", "File storage", "Transactional email"].concat(funcs.some((f) => /analytic/i.test(f)) ? ["Analytics"] : []),
    integrations: [],
    env_vars: ["DATABASE_URL", "AUTH_SECRET", "STORAGE_DIR"],
    deployment: "Vercel (or any Node host) + a managed Postgres database.",
    testing_plan: ["Unit tests for services", "API route tests", "Auth flow end-to-end", "Accessibility checks"],
    scaling_notes: "Stateless request handlers, DB connection pooling, cache hot reads, background jobs for heavy work.",
  };
}

// Deterministic assistant reply grounded in the project context that was passed in —
// clearly marked as the development fallback, never pretending to be a real model.
function assistantReply(promptUser: string): string {
  const art = promptUser.match(/art direction:\s*([^\n]+)/i)?.[1]?.trim();
  const score = promptUser.match(/score:\s*([0-9.]+)/i)?.[1];
  const name = promptUser.match(/project:\s*([^\n]+)/i)?.[1]?.trim();
  const msg = promptUser.split("USER'S MESSAGE:")[1]?.trim().slice(0, 200) || "your question";
  const issue = promptUser.match(/-\s*([a-z ]+):\s*(?:low|medium|high)/i)?.[1]?.trim();

  return [
    `**Development fallback reply** (no AI provider available — add a key to get a real answer).`,
    ``,
    `On “${msg}”${name ? ` for **${name}**` : ""}:`,
    art ? `- The project's art direction is **${art}** — any change should stay inside that language rather than importing a different style.` : "",
    score ? `- The current version scores **${score}**, so there's measurable headroom; targeted fixes beat a full regenerate.` : "",
    issue ? `- The critique already flags **${issue}** — that's the highest-leverage thing to address first.` : "",
    `- A concrete instruction you could apply with the editor: “Improve ${issue || "visual hierarchy"} in the current design while keeping the existing content and art direction.”`,
  ]
    .filter(Boolean)
    .join("\n");
}

// Deterministic app art direction — rotates treatments so no two adjacent pages match,
// and keeps effects proportional to the brand's atmosphere.
function appDesign(promptUser: string) {
  const atmosphere = (promptUser.match(/"atmosphere"\s*:\s*"([^"]*)"/)?.[1] || "restrained").toLowerCase();
  const clean = atmosphere === "none";
  const rich = atmosphere === "rich";
  const routes = [...promptUser.matchAll(/^\s*(\/[a-z0-9\-/[\]]*)\s+—\s+(.+)$/gim)].map((m) => ({ route: m[1], purpose: m[2] }));
  const list = routes.length ? routes : [{ route: "/dashboard", purpose: "Overview" }];

  const heroes = ["colossal", "editorial", "split", "centered", "minimal"];
  const decors = clean ? ["grid", "none", "grid", "none", "mesh"] : rich ? ["orbs", "aurora", "rays", "mesh", "orbs"] : ["mesh", "grid", "orbs", "none", "rays"];
  const motions = ["mask", "stagger", "slide", "blur", "rise"];
  const layouts = ["cards", "magazine", "rows", "mosaic", "cards"];

  return {
    motion_language: clean ? "restrained fades and precise reveals" : "layered reveals with gentle parallax",
    signature_visual: clean ? "An oversized typographic number wall that anchors the workspace" : "A drifting light form that follows the pointer across the workspace",
    pages: list.map((p, i) => ({
      route: p.route,
      hero: heroes[i % heroes.length],
      decor: decors[i % decors.length],
      motion: motions[i % motions.length],
      layout: layouts[i % layouts.length],
      eyebrow: p.purpose.split(/[.,]/)[0].slice(0, 40),
      headline: capitalize(p.purpose.split(/[.,]/)[0].slice(0, 60)),
      subcopy: `Everything here is live and stored in your database.`,
      visual_idea: clean ? "Generous whitespace with a single decisive rule line" : "A soft light form drifting behind the content",
    })),
    custom_css: "",
  };
}

function websitePlan() {
  return {
    pages: [
      {
        name: "Home",
        path: "/",
        sections: [
          { type: "nav", purpose: "wayfinding + primary CTA", note: "sticky, slim" },
          { type: "hero", purpose: "value proposition", note: "headline + dual CTA + visual" },
          { type: "logos", purpose: "social proof", note: "trusted-by row" },
          { type: "features", purpose: "explain benefits", note: "3-up alternating rows" },
          { type: "showcase", purpose: "product proof", note: "UI mockup" },
          { type: "metrics", purpose: "credibility", note: "3 key numbers" },
          { type: "testimonial", purpose: "trust", note: "single strong quote" },
          { type: "pricing", purpose: "conversion", note: "3 tiers" },
          { type: "cta", purpose: "final conversion", note: "full-width band" },
          { type: "footer", purpose: "navigation + legal", note: "multi-column" },
        ],
      },
    ],
    components: ["Button", "Nav", "Card", "Section", "Badge", "Metric", "PricingTier", "Footer"],
    navigation: ["Features", "Showcase", "Pricing", "Contact"],
  };
}

function critique(seed: number) {
  const r = rng(seed);
  const base = 70 + Math.floor(r() * 16);
  const dims = ["visual hierarchy", "spacing", "alignment", "typography", "color harmony", "contrast", "consistency", "composition", "responsiveness", "originality", "clarity of CTA", "accessibility"];
  return {
    overall_score: base,
    dimensions: dims.map((name, i) => ({ name, score: Math.max(40, Math.min(96, base + Math.floor((rng(seed + i)() - 0.5) * 26))), note: "" })),
    issues: [
      { category: "spacing", severity: "medium", description: "Section padding is slightly inconsistent between the features and pricing blocks.", suggested_fix: "Normalize all top-level sections to the same vertical rhythm token (section spacing)." },
      { category: "hierarchy", severity: "low", description: "Secondary CTA has nearly equal weight to the primary, diluting focus.", suggested_fix: "Demote the secondary CTA to a ghost/outline style." },
      { category: "contrast", severity: "low", description: "Muted body text on surface panels is near the low end of comfortable contrast.", suggested_fix: "Darken muted text by ~8% or lighten the surface." },
    ],
    strengths: ["Clear focal path in the hero", "Consistent radius + shadow language", "Restrained, confident color use"],
    improvements: ["Unify section vertical rhythm", "Strengthen primary/secondary CTA distinction", "Add one concrete proof metric to the hero"],
  };
}

function qualityEval(seed: number) {
  const r = rng(seed);
  const base = 72 + Math.floor(r() * 14);
  const dims = ["visual quality", "usability", "accessibility", "responsiveness", "consistency", "originality", "requirement alignment", "DNA alignment", "technical quality"];
  return {
    dimensions: dims.map((name, i) => ({ name, score: Math.max(45, Math.min(95, base + Math.floor((rng(seed + i * 7)() - 0.5) * 22))), explanation: "Automated development-fallback estimate." })),
    overall: base,
    verdict: "Solid, coherent baseline. Aesthetic quality is inherently subjective — treat this as one signal, not ground truth.",
  };
}

export class MockProvider implements AiProvider {
  readonly name = "mock";

  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const seed = hash(opts.operation + "::" + opts.user + "::" + (opts.images?.length ?? 0));
    let payload: unknown = { note: "development fallback", operation: opts.operation };

    switch (opts.operation) {
      case "reference-analysis":
      case "screenshot-analysis":
      case "dna-synthesis":
        payload = designDNA(seed);
        break;
      case "requirement-analysis":
        payload = requirements(opts.user);
        break;
      case "design-direction":
        payload = designDirection(seed, opts.user);
        break;
      case "design-system":
        payload = designSystem(seed);
        break;
      case "website-architecture":
        payload = websitePlan();
        break;
      case "scene-plan":
        payload = scenePlan(opts.user, seed);
        break;
      case "application-blueprint":
        payload = applicationBlueprint(opts.user);
        break;
      case "app-design":
        payload = appDesign(opts.user);
        break;
      case "design-assistant":
        // Free-form reply (not JSON) — grounded in whatever context was passed in.
        return {
          text: assistantReply(opts.user),
          meta: {
            provider: this.name,
            model: "mock",
            operation: opts.operation,
            promptVersion: opts.promptVersion,
            inputType: "text",
            inputTokens: Math.ceil(opts.user.length / 4),
            outputTokens: 120,
            latencyMs: 40 + (seed % 60),
            ok: true,
          },
        };
      case "visual-critique":
        payload = critique(seed);
        break;
      case "quality-eval":
        payload = qualityEval(seed);
        break;
      default:
        payload = { note: "development fallback", operation: opts.operation };
    }

    // Simulate a tiny latency band deterministically (no Date.random needed).
    const latencyMs = 40 + (seed % 60);
    return {
      text: opts.json ? JSON.stringify(payload) : String((payload as { note?: string }).note ?? ""),
      meta: {
        provider: this.name,
        model: "mock",
        operation: opts.operation,
        promptVersion: opts.promptVersion,
        inputType: opts.images?.length ? "vision" : "text",
        inputTokens: Math.ceil(opts.user.length / 4),
        outputTokens: 200,
        latencyMs,
        ok: true,
      },
    };
  }
}
