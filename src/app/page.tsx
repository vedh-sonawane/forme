"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Reveal } from "@/components/marketing/Reveal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

/* ── Top navigation (frosted, solidifies on scroll) ─────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled ? "py-2.5" : "py-4")}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--accent)] text-[color:var(--accent-fg)] font-display text-lg font-bold">F</span>
          <span className="font-display text-lg font-bold tracking-tight">FORME</span>
        </Link>
        <nav className={cn("hidden items-center gap-1 rounded-full border px-1.5 py-1.5 transition-all md:flex", scrolled ? "glass" : "bg-surface/40 backdrop-blur")}>
          {[["How it works", "#how"], ["Features", "#features"], ["Pipeline", "#pipeline"], ["Why FORME", "#why"]].map(([label, href]) => (
            <a key={href} href={href} className="rounded-full px-4 py-1.5 text-sm font-medium text-fg-dim transition hover:bg-surface hover:text-fg">{label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/dashboard" className="hidden text-sm font-medium text-fg-dim transition hover:text-fg sm:block">Sign in</Link>
          <Link href="/dashboard" className="btn-primary">Start free</Link>
        </div>
      </div>
    </header>
  );
}

/* ── Floating glassmorphism shapes that drift + radiate (hero only) ─────────── */
const ORBS = [
  { s: 120, top: "12%", left: "6%", dur: "16s", dx: "14px", dy: "-20px", d: "0s" },
  { s: 84, top: "62%", left: "12%", dur: "13s", dx: "-10px", dy: "16px", d: "1.2s" },
  { s: 46, top: "30%", left: "20%", dur: "11s", dx: "8px", dy: "12px", d: "2.1s" },
  { s: 150, top: "18%", left: "80%", dur: "18s", dx: "-16px", dy: "18px", d: "0.6s" },
  { s: 70, top: "70%", left: "84%", dur: "14s", dx: "12px", dy: "-14px", d: "2.6s" },
  { s: 34, top: "48%", left: "72%", dur: "10s", dx: "-8px", dy: "10px", d: "1.6s" },
  { s: 14, top: "24%", left: "46%", dur: "9s", dx: "6px", dy: "-8px", d: "0.3s" },
  { s: 18, top: "78%", left: "40%", dur: "12s", dx: "-6px", dy: "8px", d: "3.1s" },
  { s: 12, top: "40%", left: "90%", dur: "8s", dx: "5px", dy: "6px", d: "2.4s" },
  { s: 26, top: "14%", left: "60%", dur: "12s", dx: "-7px", dy: "9px", d: "1.9s" },
];

function HeroOrbs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* soft color mesh blobs */}
      <div className="animate-float absolute -left-24 top-6 h-[440px] w-[440px] rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, var(--accent), transparent 62%)" }} />
      <div className="animate-float absolute right-[-6rem] top-32 h-[480px] w-[480px] rounded-full opacity-35 blur-3xl" style={{ background: "radial-gradient(circle, var(--mint), transparent 62%)", animationDelay: "1.5s" }} />
      <div className="animate-float absolute bottom-[-8rem] left-1/3 h-[400px] w-[400px] rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, var(--violet), transparent 62%)", animationDelay: "3s" }} />
      {/* glass orbs */}
      {ORBS.map((o, i) => (
        <span
          key={i}
          className="glass-orb"
          style={{ width: o.s, height: o.s, top: o.top, left: o.left, "--dur": o.dur, "--dx": o.dx, "--dy": o.dy, animationDelay: `${o.d}, ${o.d}` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/* ── Lighthouse with a flashlight toggle that makes "expensively" glitter ────── */
function Lighthouse({ lit, onToggle }: { lit: boolean; onToggle: () => void }) {
  return (
    <div className="pointer-events-none absolute bottom-0 right-2 z-10 select-none sm:right-8 lg:right-16">
      {/* beam sweeping up-left toward the headline */}
      <div className={cn("beam absolute bottom-[62%] right-[46%] h-40 w-[60vw] max-w-2xl origin-bottom-right -rotate-[8deg]", lit && "on")} />
      <div className="relative flex flex-col items-center">
        {/* real vector asset (Iconify · game-icons), not hand-drawn */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://api.iconify.design/game-icons:lighthouse.svg?color=%23f4c85b"
          alt="Lighthouse"
          width={92}
          height={92}
          className={cn("h-20 w-20 opacity-70 drop-shadow-[0_0_18px_rgba(244,200,91,0.0)] transition-all duration-500 sm:h-24 sm:w-24", lit && "opacity-100 drop-shadow-[0_0_26px_rgba(244,200,91,0.6)]")}
        />
        <button
          onClick={onToggle}
          aria-pressed={lit}
          aria-label="Toggle the lighthouse"
          className={cn(
            "pointer-events-auto -mt-3 grid h-9 w-9 place-items-center rounded-full border backdrop-blur transition",
            lit ? "border-[color:var(--spark)] bg-[color:var(--spark)] text-[color:var(--spark-ink)] shadow-[0_0_24px_rgba(244,200,91,0.6)]" : "bg-surface/70 text-fg-dim hover:text-fg"
          )}
          title="Shine the light"
        >
          {/* flashlight icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h12l-1.5 4.5a2 2 0 0 1-.5 1L14 10v10a2 2 0 0 1-4 0V10L7.9 8.5a2 2 0 0 1-.5-1z" />
            <path d="M9 3v2M15 3v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Sparkles({ show }: { show: boolean }) {
  const pts = [
    { top: "-18px", left: "8%", d: "0s", s: 10 },
    { top: "-8px", left: "42%", d: "0.3s", s: 7 },
    { top: "-22px", left: "70%", d: "0.6s", s: 12 },
    { top: "8px", left: "92%", d: "0.2s", s: 8 },
    { top: "26px", left: "24%", d: "0.5s", s: 9 },
    { top: "18px", left: "58%", d: "0.8s", s: 6 },
    { top: "-14px", left: "88%", d: "0.4s", s: 7 },
  ];
  if (!show) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {pts.map((p, i) => (
        <svg key={i} className="sparkle absolute text-[color:var(--spark)]" style={{ top: p.top, left: p.left, width: p.s, height: p.s, animationDelay: p.d }} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0l2.4 8.4L24 12l-9.6 3.6L12 24l-2.4-8.4L0 12l9.6-3.6z" />
        </svg>
      ))}
    </span>
  );
}

const COMPANIES = [
  "Vercel", "Linear", "Stripe", "Notion", "Framer", "Figma", "Ramp", "Retool", "Supabase", "Raycast",
  "Mercury", "Brex", "Superhuman", "Arc", "Perplexity", "Descript", "Pitch", "Webflow", "Contra", "Vanta",
  "Deel", "Rippling", "Scale", "Runway", "Cursor", "Loom", "Amplitude", "Census",
];

const STEPS = [
  { n: "01", t: "Analyze", d: "Feed FORME a URL or screenshots. It renders the page in a real browser and studies every visual decision." },
  { n: "02", t: "Extract DNA", d: "It distills a structured Design DNA — type, color, spacing, composition, motion — the reusable principles, not a copy." },
  { n: "03", t: "Direct", d: "Requirements + DNA become a decisive design direction and a real token system: color, scale, radius, motion." },
  { n: "04", t: "Generate", d: "It writes a real, responsive, accessible site — then renders, critiques, and improves it until it looks intentional." },
];

const FEATURES = [
  { t: "Design DNA Profiles", d: "A structured fingerprint of any great design — so you reuse its intelligence, never plagiarize it.", tone: "spark" },
  { t: "Visual Critic", d: "Renders the result and returns actionable critique across 16 dimensions — not just a number.", tone: "mint" },
  { t: "Improvement loop", d: "Generate → render → critique → fix → re-render, keeping only changes that measurably help. Regressions revert.", tone: "violet" },
  { t: "Redesign, on-brand", d: "Point at an existing site. FORME preserves brand, content & purpose while fixing what's holding it back.", tone: "spark" },
  { t: "Reference Library", d: "Save, tag, search and collect the web's best design — your private design-intelligence dataset.", tone: "mint" },
  { t: "Quality Evaluation", d: "Multi-dimensional scoring that explains itself. Aesthetic quality, made legible and improvable.", tone: "violet" },
];

const toneBg: Record<string, string> = { spark: "var(--spark)", mint: "var(--mint)", violet: "var(--violet)" };

const IMG_ABYSS = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1600&auto=format&fit=crop";
const IMG_TEXTURE = "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1600&auto=format&fit=crop";

export default function Home() {
  const [lit, setLit] = useState(false);

  return (
    <div className="relative overflow-x-clip">
      <Nav />

      {/* HERO — the only section with floating orbs + grain + lighthouse */}
      <section className="grain relative overflow-hidden px-4 pb-40 pt-36 sm:pt-44">
        <HeroOrbs />
        <Lighthouse lit={lit} onToggle={() => setLit((v) => !v)} />
        {/* warm glow that blooms when lit */}
        <div aria-hidden className={cn("pointer-events-none absolute left-1/2 top-[42%] -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl transition-opacity duration-700", lit ? "opacity-60" : "opacity-0")} style={{ background: "radial-gradient(circle, var(--spark), transparent 60%)" }} />

        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-3xl text-center">
            <span className="eyebrow mx-auto">Design intelligence, not templates</span>
            <h1 className="relative mt-5 font-display text-[clamp(2.6rem,7vw,5.4rem)] font-bold leading-[0.98] tracking-tight">
              Make vibe-coded sites
              <br className="hidden sm:block" /> look{" "}
              <span className="relative inline-block">
                <span className={cn("serif italic font-normal transition-colors", lit && "glimmer")}>expensively</span>
                <Sparkles show={lit} />
              </span>{" "}
              designed.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-base text-fg-dim sm:text-lg">
              FORME studies world-class design, extracts its underlying principles, and generates or redesigns websites that look intentionally, professionally crafted — refined through real visual critique.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard" className="btn-primary w-full px-6 py-3 text-[15px] sm:w-auto">Generate my first site</Link>
              <a href="#how" className="btn-ghost w-full px-6 py-3 text-[15px] sm:w-auto">See how it works</a>
            </div>
            <p className="mt-4 text-xs text-muted">Flip the lighthouse switch → watch it glitter · No credit card · Export the code</p>
          </Reveal>

          <Reveal delay={140} className="relative mx-auto mt-16 flex max-w-5xl items-end justify-center gap-6">
            <div className="hidden flex-1 lg:block">
              <div className="glass ml-auto max-w-xs p-5">
                <div className="text-[11px] uppercase tracking-wider text-muted">Design DNA</div>
                <div className="mt-2 font-display text-lg font-bold">Editorial · Confident</div>
                <div className="mt-3 flex gap-1.5">
                  {["#f5f5f7", "#4f8cff", "#46d69f", "#a88bff", "#08080a"].map((c) => (
                    <span key={c} className="h-8 flex-1 rounded-lg border" style={{ background: c }} />
                  ))}
                </div>
                <p className="mt-3 text-xs text-fg-dim">Big editorial type, generous whitespace, soft gradient mesh, one decisive accent.</p>
              </div>
            </div>
            <div className="glass relative w-full max-w-md p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[color:var(--accent)] text-[10px] font-bold text-[color:var(--accent-fg)]">F</span>
                  <span className="text-sm font-semibold">Aurora Robotics</span>
                </div>
                <span className="rounded-full bg-[color:var(--spark)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--spark-ink)]">92 · premium</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[["Hierarchy", "94"], ["Type", "91"], ["Color", "89"]].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-surface/70 p-3">
                    <div className="font-display text-xl font-bold">{v}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">{k}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                {[["Spacing rhythm", 82], ["Originality", 88], ["Responsiveness", 95]].map(([k, v]) => (
                  <div key={k as string}>
                    <div className="mb-1 flex justify-between text-[11px] text-fg-dim"><span>{k}</span><span>{v}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${v}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden flex-1 lg:block">
              <div className="glass mr-auto max-w-xs animate-float p-5" style={{ animationDelay: "2s" }}>
                <div className="text-[11px] uppercase tracking-wider text-muted">Improvement</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-[color:var(--ok)]">+17</span>
                  <span className="text-xs text-fg-dim">v1 → v3 quality</span>
                </div>
                <div className="mt-3 flex items-end gap-1.5">
                  {[54, 62, 71, 78, 83, 88, 92].map((h, i) => (
                    <span key={i} className="w-full rounded-t bg-[color:var(--accent)]" style={{ height: h, opacity: 0.4 + i * 0.08 }} />
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* COMPANIES MARQUEE */}
      <section className="border-y bg-surface/30 py-8">
        <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted">Trusted by product teams at</p>
        <div className="mx-auto max-w-full overflow-hidden">
          <div className="flex w-max items-center gap-12 whitespace-nowrap">
            <div className="animate-marquee flex shrink-0 items-center gap-12">
              {[...COMPANIES, ...COMPANIES].map((c, i) => (
                <span key={i} className="font-display text-xl font-semibold tracking-tight text-fg-dim/70 transition hover:text-fg">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM → SOLUTION (subtle dark image bg) */}
      <section id="why" className="relative overflow-hidden px-4 py-24 sm:py-32">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-[0.06]" style={{ backgroundImage: `url(${IMG_ABYSS})` }} />
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <span className="eyebrow">The problem</span>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">AI builders ship sites that <span className="serif italic font-normal">technically</span> work — and visibly don&apos;t.</h2>
            <p className="mt-5 text-fg-dim">Generic heroes. Repetitive sections. Muddy hierarchy. Random spacing. They look like every other generated site because they have no taste — only tokens.</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {["Cookie-cutter layouts with no point of view", "Weak type scale and inconsistent spacing", "No feedback loop — the AI never sees its own output"].map((x) => (
                <li key={x} className="flex items-center gap-3 text-fg-dim"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color:var(--danger)]/15 text-[color:var(--danger)]">✕</span>{x}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="glass p-7">
              <span className="eyebrow">The FORME way</span>
              <h3 className="mt-4 font-display text-2xl font-bold">Taste, made systematic.</h3>
              <p className="mt-3 text-sm text-fg-dim">FORME learns from designs that already work, encodes their principles, then critiques and improves its own output like a senior designer would.</p>
              <div className="mt-6 space-y-3">
                {[["Studies real, great design", "spark"], ["Extracts reusable principles", "mint"], ["Critiques its own renders", "violet"], ["Improves until it looks intentional", "spark"]].map(([x, tone]) => (
                  <div key={x} className="flex items-center gap-3 rounded-2xl bg-surface/70 p-3">
                    <span className="h-8 w-8 shrink-0 rounded-xl" style={{ background: toneBg[tone] }} />
                    <span className="text-sm font-medium">{x}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PIPELINE / HOW */}
      <section id="how" className="px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="eyebrow mx-auto">The pipeline</span>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">Four moves from idea to intentional.</h2>
            <p className="mt-4 text-fg-dim">Every stage is a specialized agent with a versioned prompt and structured output — no one giant black box.</p>
          </Reveal>
          <div id="pipeline" className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="card group h-full p-6 transition hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-3xl font-bold text-[color:var(--accent)]/30">{s.n}</span>
                    <span className="h-9 w-9 rounded-2xl" style={{ background: [toneBg.spark, toneBg.mint, toneBg.violet, toneBg.spark][i] }} />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold">{s.t}</h3>
                  <p className="mt-2 text-sm text-fg-dim">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="eyebrow mx-auto">Capabilities</span>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">Everything a design studio does — in software.</h2>
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.t} delay={(i % 3) * 90}>
                <div className="card group relative h-full overflow-hidden p-6 transition hover:-translate-y-1">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-30 blur-2xl transition group-hover:opacity-60" style={{ background: toneBg[f.tone] }} />
                  <div className="relative">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: toneBg[f.tone] }}>
                      <span className="h-4 w-4 rounded-md bg-black/70" />
                    </span>
                    <h3 className="mt-5 font-display text-lg font-bold">{f.t}</h3>
                    <p className="mt-2 text-sm text-fg-dim">{f.d}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="px-4 py-16">
        <Reveal className="mx-auto max-w-6xl">
          <div className="glass grid gap-6 p-10 sm:grid-cols-3">
            {[["16", "critique dimensions"], ["4", "core workflows"], ["∞", "reference intelligence"]].map(([n, l]) => (
              <div key={l} className="text-center">
                <div className="font-display text-5xl font-bold tracking-tight sm:text-6xl">{n}</div>
                <div className="mt-2 text-sm uppercase tracking-wider text-muted">{l}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* CTA (subtle dark image bg) */}
      <section className="px-4 py-24 sm:py-32">
        <Reveal className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-[32px] border p-10 text-center sm:p-16">
            <div aria-hidden className="absolute inset-0 -z-10 bg-cover bg-center opacity-[0.14]" style={{ backgroundImage: `url(${IMG_TEXTURE})` }} />
            <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, var(--surface)), color-mix(in srgb, var(--violet) 18%, var(--surface)))" }} />
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-40 blur-3xl" style={{ background: "var(--spark)" }} />
            <h2 className="relative font-display text-4xl font-bold tracking-tight sm:text-5xl">Ship a site that looks like<br /> you hired a studio.</h2>
            <p className="relative mx-auto mt-4 max-w-lg text-fg-dim">Describe your idea, add a few references, and let FORME design, critique, and refine until it&apos;s genuinely premium.</p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard" className="btn-primary px-7 py-3 text-[15px]">Start building free</Link>
              <Link href="/dashboard" className="btn-ghost px-7 py-3 text-[15px]">Open the dashboard</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[color:var(--accent)] text-sm font-bold text-[color:var(--accent-fg)]">F</span>
            <span className="font-display font-bold">FORME</span>
            <span className="text-sm text-muted">— design intelligence</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-fg-dim">
            <a href="#how" className="hover:text-fg">How it works</a>
            <a href="#features" className="hover:text-fg">Features</a>
            <Link href="/dashboard" className="hover:text-fg">Dashboard</Link>
          </div>
          <p className="text-xs text-muted">© 2026 FORME</p>
        </div>
      </footer>
    </div>
  );
}
