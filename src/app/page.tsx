"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Reveal } from "@/components/marketing/Reveal";
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
          <Link href="/dashboard" className="hidden text-sm font-medium text-fg-dim transition hover:text-fg sm:block">Sign in</Link>
          <Link href="/dashboard" className="btn-primary">Start free</Link>
        </div>
      </div>
    </header>
  );
}

/* ── Decorative mesh orbs ───────────────────────────────────────────────────── */
function Orbs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="animate-float absolute -left-24 top-10 h-[420px] w-[420px] rounded-full opacity-70 blur-3xl" style={{ background: "radial-gradient(circle, var(--spark), transparent 62%)" }} />
      <div className="animate-float absolute right-[-6rem] top-40 h-[460px] w-[460px] rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, var(--mint), transparent 62%)", animationDelay: "1.5s" }} />
      <div className="animate-float absolute bottom-[-8rem] left-1/3 h-[380px] w-[380px] rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle, var(--violet), transparent 62%)", animationDelay: "3s" }} />
    </div>
  );
}

/* ── A stylized product preview card (echoes a premium dashboard) ───────────── */
function PreviewCard() {
  return (
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
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${v}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  { n: "01", t: "Analyze", d: "Feed FORME a URL or screenshots. It renders the page in a real browser and studies every visual decision." },
  { n: "02", t: "Extract DNA", d: "It distills a structured Design DNA — type, color, spacing, composition, motion — the reusable principles, not a copy." },
  { n: "03", t: "Direct", d: "Requirements + DNA become a decisive design direction and a real token system: color, scale, radius, motion." },
  { n: "04", t: "Generate", d: "It writes a real, responsive, accessible site — then renders, critiques, and improves it until it looks intentional." },
];

const FEATURES = [
  { t: "Design DNA Profiles", d: "A structured fingerprint of any great design — so you can reuse its intelligence, never plagiarize it.", tone: "spark" },
  { t: "Visual Critic", d: "Renders the result and returns actionable critique across 16 dimensions — not just a number.", tone: "mint" },
  { t: "Improvement loop", d: "Generate → render → critique → fix → re-render, keeping only changes that measurably help. Regressions revert.", tone: "violet" },
  { t: "Redesign, on-brand", d: "Point at an existing site. FORME preserves brand, content & purpose while fixing what's holding it back.", tone: "spark" },
  { t: "Reference Library", d: "Save, tag, search and collect the web's best design — your private design-intelligence dataset.", tone: "mint" },
  { t: "Quality Evaluation", d: "Multi-dimensional scoring that explains itself. Aesthetic quality, made legible and improvable.", tone: "violet" },
];

const toneBg: Record<string, string> = {
  spark: "var(--spark)",
  mint: "var(--mint)",
  violet: "var(--violet)",
};

export default function Home() {
  return (
    <div className="relative overflow-x-clip">
      <Nav />

      {/* HERO */}
      <section className="relative px-4 pb-24 pt-36 sm:pt-44">
        <Orbs />
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-3xl text-center">
            <span className="eyebrow mx-auto"><span className="h-1.5 w-1.5 rounded-full bg-[color:var(--spark)]" /> Design intelligence, not templates</span>
            <h1 className="mt-5 font-display text-[clamp(2.6rem,7vw,5.2rem)] font-bold leading-[0.98] tracking-tight">
              Make vibe-coded sites
              <br className="hidden sm:block" /> look <span className="serif italic font-normal">expensively</span> designed.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-base text-fg-dim sm:text-lg">
              FORME studies world-class design, extracts its underlying principles, and generates or redesigns websites that look intentionally, professionally crafted — refined through real visual critique.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard" className="btn-primary w-full px-6 py-3 text-[15px] sm:w-auto">Generate my first site</Link>
              <a href="#how" className="btn-ghost w-full px-6 py-3 text-[15px] sm:w-auto">See how it works</a>
            </div>
            <p className="mt-4 text-xs text-muted">No credit card · Real AI analysis · Export the code</p>
          </Reveal>

          <Reveal delay={140} className="relative mx-auto mt-16 flex max-w-5xl items-end justify-center gap-6">
            <div className="hidden flex-1 lg:block">
              <div className="glass ml-auto max-w-xs p-5">
                <div className="text-[11px] uppercase tracking-wider text-muted">Design DNA</div>
                <div className="mt-2 font-display text-lg font-bold">Editorial · Confident</div>
                <div className="mt-3 flex gap-1.5">
                  {["#141117", "#f4c85b", "#8fe0b6", "#b9abff", "#efece3"].map((c) => (
                    <span key={c} className="h-8 flex-1 rounded-lg border" style={{ background: c }} />
                  ))}
                </div>
                <p className="mt-3 text-xs text-fg-dim">Big editorial type, generous whitespace, soft gradient mesh, one decisive accent.</p>
              </div>
            </div>
            <PreviewCard />
            <div className="hidden flex-1 lg:block">
              <div className="glass mr-auto max-w-xs animate-float p-5" style={{ animationDelay: "2s" }}>
                <div className="text-[11px] uppercase tracking-wider text-muted">Improvement</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-[color:var(--ok)]">+17</span>
                  <span className="text-xs text-fg-dim">v1 → v3 quality</span>
                </div>
                <div className="mt-3 flex items-end gap-1.5">
                  {[54, 62, 71, 78, 83, 88, 92].map((h, i) => (
                    <span key={i} className="w-full rounded-t bg-[color:var(--accent)]/80" style={{ height: h, opacity: 0.35 + i * 0.09 }} />
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="border-y bg-surface/40 py-6">
        <div className="mx-auto max-w-6xl overflow-hidden px-4">
          <div className="flex items-center gap-14 whitespace-nowrap">
            <div className="animate-marquee flex shrink-0 items-center gap-14">
              {["EDITORIAL", "BRUTALIST", "MINIMAL", "LUXURY", "SAAS", "EXPERIMENTAL", "AI", "PORTFOLIO", "EDITORIAL", "BRUTALIST", "MINIMAL", "LUXURY", "SAAS", "EXPERIMENTAL", "AI", "PORTFOLIO"].map((w, i) => (
                <span key={i} className="font-display text-lg font-semibold tracking-tight text-muted">{w}<span className="ml-14 text-[color:var(--spark)]">✦</span></span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM → SOLUTION */}
      <section id="why" className="px-4 py-24 sm:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-[color:var(--danger)]" /> The problem</span>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">AI builders ship sites that <span className="serif italic font-normal">technically</span> work — and visibly don&apos;t.</h2>
            <p className="mt-5 text-fg-dim">Generic heroes. Repetitive sections. Muddy hierarchy. Random spacing. They look like every other generated site because they have no taste — only tokens.</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {["Cookie-cutter layouts with no point of view", "Weak type scale and inconsistent spacing", "No feedback loop — the AI never sees its own output"].map((x) => (
                <li key={x} className="flex items-center gap-3 text-fg-dim"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color:var(--danger)]/12 text-[color:var(--danger)]">✕</span>{x}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="glass p-7">
              <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-[color:var(--ok)]" /> The FORME way</span>
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
                    <span className="font-display text-3xl font-bold text-[color:var(--accent)]/25">{s.n}</span>
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
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-2xl transition group-hover:opacity-70" style={{ background: toneBg[f.tone] }} />
                  <div className="relative">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: toneBg[f.tone] }}>
                      <span className="h-4 w-4 rounded-md bg-[color:var(--spark-ink)]/80" />
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

      {/* CTA */}
      <section className="px-4 py-24 sm:py-32">
        <Reveal className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-[32px] border p-10 text-center sm:p-16" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--spark) 30%, var(--surface)), color-mix(in srgb, var(--mint) 24%, var(--surface)))" }}>
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-50 blur-3xl" style={{ background: "var(--violet)" }} />
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
