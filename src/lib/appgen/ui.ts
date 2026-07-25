import type { DesignSystem } from "@/lib/design/schema";
import { tokenCss } from "./tokens";
import { effectsCss } from "./effects";

// The generated application's VISUAL layer: a rich, art-directed design system plus a
// motion runtime. This is what stops the app half of a generated project from looking
// like a plain CRUD admin bolted onto a beautiful landing page.
//
// Everything here is CSS + a tiny vanilla runtime, so an AI-authored flourish can only
// degrade the look — it can never break the build (unlike generated JSX).

export type PageTreatment = {
  /** hero style for the page header */
  hero: "colossal" | "editorial" | "split" | "centered" | "minimal";
  /** ambient decoration behind the page */
  decor: "orbs" | "mesh" | "grid" | "rays" | "aurora" | "none";
  /** how content animates in */
  motion: "stagger" | "mask" | "rise" | "blur" | "slide";
  /** list/collection presentation */
  layout: "cards" | "magazine" | "rows" | "mosaic";
};

export const DEFAULT_TREATMENTS: PageTreatment[] = [
  { hero: "colossal", decor: "orbs", motion: "mask", layout: "cards" },
  { hero: "editorial", decor: "grid", motion: "stagger", layout: "magazine" },
  { hero: "split", decor: "aurora", motion: "slide", layout: "rows" },
  { hero: "centered", decor: "rays", motion: "blur", layout: "mosaic" },
  { hero: "minimal", decor: "mesh", motion: "rise", layout: "cards" },
];

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

/** The application design system — glass, depth, dramatic type, motion, decor. */
export function appUiCss(s: DesignSystem, customCss = ""): string {
  const c = s.colors;
  const t = s.typography;
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

${tokenCss(s)}

:root{
  --bg:${c.bg};--surface:${c.surface};--surface-alt:${c.surfaceAlt};
  --text:${c.text};--text-muted:${c.textMuted};--border:${c.border};
  --primary:${c.primary};--primary-text:${c.primaryText};--accent:${c.accent};
  --font-heading:${t.fontHeading};--font-body:${t.fontBody};
  --r-sm:${s.radius.sm};--r-md:${s.radius.md};--r-lg:${s.radius.lg};--r-pill:${s.radius.pill};
  --sh-sm:${s.shadow.sm};--sh-md:${s.shadow.md};--sh-lg:${s.shadow.lg};
  --ease:${s.motion.easing};--dur:${s.motion.durationMs}ms;
  --glass:color-mix(in srgb, var(--surface) 62%, transparent);
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:var(--font-body),system-ui,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden}
h1,h2,h3,h4{font-family:var(--font-heading),var(--font-body),sans-serif;line-height:1.04;letter-spacing:-.025em}
a{color:inherit;text-decoration:none}
img,svg{max-width:100%;display:block}
p{color:var(--text-muted)}

/* ── Layout ─────────────────────────────────────────── */
/* Each is standalone-complete: used alone they must still centre and pad, otherwise
   content pins to the left edge. (Never make these modifier-only.) */
[data-composed]{position:relative;display:flow-root;z-index:0}
.wrap,.wrap-wide,.wrap-narrow{width:100%;margin-inline:auto;padding-inline:clamp(1.1rem,4vw,2rem)}
.wrap{max-width:1180px}
.wrap-wide{max-width:1420px}
.wrap-narrow{max-width:760px}
.stack{display:grid;gap:clamp(1rem,2.4vw,1.6rem)}
.row{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}
.grid{display:grid;gap:clamp(1rem,2.4vw,1.7rem)}
.g2{grid-template-columns:repeat(2,1fr)}
.g3{grid-template-columns:repeat(3,1fr)}
.split{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(1.6rem,4vw,3.4rem);align-items:center}
@media(max-width:900px){.g2,.g3,.split{grid-template-columns:1fr}}

/* ── Type scale (dramatic, varied) ──────────────────── */
.kicker{display:inline-flex;align-items:center;gap:.55rem;font-size:.72rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--accent)}
.kicker::before{content:"";width:1.7rem;height:1px;background:currentColor;opacity:.7}
.t-colossal{font-size:clamp(2.8rem,8vw,6.5rem);font-weight:800;line-height:.94;letter-spacing:-.04em}
.t-display{font-size:clamp(2.1rem,5vw,3.8rem);font-weight:800;line-height:1}
.t-title{font-size:clamp(1.5rem,2.6vw,2.2rem);font-weight:700}
.t-lead{font-size:clamp(1rem,1.5vw,1.2rem);color:var(--text-muted);max-width:60ch;line-height:1.6}
.muted{color:var(--text-muted)}
.balance{text-wrap:balance}
.stat-num{font-family:var(--font-heading),sans-serif;font-weight:800;font-size:clamp(2.4rem,6vw,4.6rem);line-height:.9;letter-spacing:-.035em;background:linear-gradient(135deg,var(--text),color-mix(in srgb,var(--primary) 75%,var(--text)));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}

/* ── Surfaces ───────────────────────────────────────── */
.card{position:relative;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:clamp(1.3rem,2.6vw,1.9rem);box-shadow:var(--sh-sm);transition:transform .45s var(--ease),box-shadow .45s var(--ease),border-color .45s var(--ease)}
.card:hover{transform:translateY(-6px);box-shadow:var(--sh-lg);border-color:color-mix(in srgb,var(--primary) 45%,var(--border))}
.glass{background:var(--glass);border:1px solid color-mix(in srgb,var(--text) 10%,transparent);border-radius:var(--r-lg);backdrop-filter:blur(18px) saturate(150%);-webkit-backdrop-filter:blur(18px) saturate(150%);box-shadow:var(--sh-md)}
.panel{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--surface-alt);overflow:hidden;box-shadow:var(--sh-lg)}
.hairline{height:1px;border:0;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--text) 20%,transparent),transparent)}

/* ── Controls ───────────────────────────────────────── */
/* base applies to every variant so a lone btn-primary class still looks right */
.btn,.btn-primary,.btn-ghost{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;font-family:var(--font-body);font-weight:600;font-size:.94rem;padding:.8rem 1.5rem;border-radius:var(--r-pill);border:1px solid transparent;cursor:pointer;transition:transform .3s var(--ease),box-shadow .3s var(--ease),filter .3s var(--ease);position:relative}
.btn:active,.btn-primary:active,.btn-ghost:active{transform:translateY(1px) scale(.99)}
.btn-primary{background:var(--primary);color:var(--primary-text);box-shadow:0 10px 30px -12px color-mix(in srgb,var(--primary) 80%,transparent)}
.btn-primary:hover{transform:translateY(-2px);filter:brightness(1.08);box-shadow:0 18px 40px -14px color-mix(in srgb,var(--primary) 85%,transparent)}
.btn-ghost{background:color-mix(in srgb,var(--surface) 70%,transparent);color:var(--text);border-color:var(--border);backdrop-filter:blur(8px)}
.btn-ghost:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--primary) 50%,var(--border))}
.input{width:100%;border:1px solid var(--border);background:color-mix(in srgb,var(--surface) 88%,transparent);border-radius:var(--r-md);padding:.85rem 1rem;font:inherit;font-size:.94rem;color:var(--text);outline:none;transition:border-color .3s var(--ease),box-shadow .3s var(--ease),background .3s var(--ease)}
.input:focus{border-color:color-mix(in srgb,var(--primary) 60%,var(--border));box-shadow:0 0 0 4px color-mix(in srgb,var(--primary) 16%,transparent)}
.label{display:block;font-size:.74rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);margin-bottom:.45rem}
.tag{display:inline-flex;align-items:center;gap:.35rem;padding:.32rem .8rem;border-radius:var(--r-pill);background:color-mix(in srgb,var(--primary) 12%,transparent);border:1px solid color-mix(in srgb,var(--primary) 24%,transparent);font-size:.74rem;font-weight:600;color:var(--text)}

/* ── Ambient decoration ─────────────────────────────── */
.scene{position:relative;overflow:hidden}
.scene>.wrap,.scene>.wrap-wide,.scene>.wrap-narrow{position:relative;z-index:1}
.orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:.5;pointer-events:none;z-index:0}
.orb-a{background:radial-gradient(circle,var(--primary),transparent 70%)}
.orb-b{background:radial-gradient(circle,var(--accent),transparent 70%)}
.mesh{position:absolute;inset:-25%;z-index:0;pointer-events:none;filter:blur(14px);background:
  radial-gradient(38% 38% at 15% 20%,color-mix(in srgb,var(--primary) 30%,transparent),transparent 70%),
  radial-gradient(34% 34% at 85% 25%,color-mix(in srgb,var(--accent) 26%,transparent),transparent 70%),
  radial-gradient(46% 46% at 60% 95%,color-mix(in srgb,var(--primary) 18%,transparent),transparent 72%)}
.grid-bg{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.5;background-image:linear-gradient(color-mix(in srgb,var(--text) 7%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--text) 7%,transparent) 1px,transparent 1px);background-size:56px 56px;-webkit-mask-image:radial-gradient(70% 60% at 50% 0%,#000,transparent);mask-image:radial-gradient(70% 60% at 50% 0%,#000,transparent)}
.rays{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.5;background:conic-gradient(from 200deg at 50% -10%,transparent 0deg,color-mix(in srgb,var(--accent) 22%,transparent) 30deg,transparent 60deg,color-mix(in srgb,var(--primary) 20%,transparent) 95deg,transparent 130deg);filter:blur(6px)}
.aurora{position:absolute;inset:-30% -10% auto -10%;height:70%;z-index:0;pointer-events:none;background:linear-gradient(120deg,color-mix(in srgb,var(--primary) 26%,transparent),color-mix(in srgb,var(--accent) 24%,transparent) 45%,transparent 75%);filter:blur(60px);animation:drift 18s ease-in-out infinite alternate}
@keyframes drift{from{transform:translate3d(-3%,0,0) scale(1)}to{transform:translate3d(4%,3%,0) scale(1.12)}}
.grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.045;mix-blend-mode:overlay;background-image:${GRAIN};background-size:180px 180px}
.shape{position:absolute;z-index:0;pointer-events:none;opacity:.6;border-radius:36% 64% 58% 42%/48% 38% 62% 52%;background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 40%,transparent),color-mix(in srgb,var(--accent) 34%,transparent));filter:blur(2px);animation:float 14s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-22px) rotate(8deg)}}

/* ── Page headers ───────────────────────────────────── */
.pagehead{position:relative;padding-block:clamp(2.6rem,7vw,5.5rem)}
.pagehead--minimal{padding-block:clamp(1.6rem,3.5vw,2.6rem)}
.pagehead--split{display:grid;grid-template-columns:1.15fr .85fr;gap:clamp(1.5rem,4vw,3rem);align-items:end}
@media(max-width:900px){.pagehead--split{grid-template-columns:1fr}}

/* ── Collections ────────────────────────────────────── */
.mosaic{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:clamp(1rem,2vw,1.5rem)}
.mosaic>*:nth-child(6n+1){grid-column:span 2}
@media(max-width:760px){.mosaic>*:nth-child(6n+1){grid-column:span 1}}
.rowitem{display:flex;align-items:center;justify-content:space-between;gap:1.4rem;padding:clamp(1rem,2vw,1.4rem) clamp(1.1rem,2.2vw,1.7rem);border:1px solid var(--border);border-radius:var(--r-lg);background:var(--surface);transition:transform .4s var(--ease),border-color .4s var(--ease),box-shadow .4s var(--ease)}
.rowitem:hover{transform:translateX(6px);border-color:color-mix(in srgb,var(--primary) 45%,var(--border));box-shadow:var(--sh-md)}
.magazine{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:clamp(1.2rem,2.5vw,2rem)}
.magazine>*:first-child{grid-column:1/-1}

/* ── Empty state art ────────────────────────────────── */
.empty{position:relative;display:grid;place-items:center;gap:.6rem;padding:clamp(2.5rem,7vw,4.5rem);text-align:center;border:1px dashed color-mix(in srgb,var(--text) 18%,transparent);border-radius:var(--r-lg);background:color-mix(in srgb,var(--surface) 55%,transparent)}
.empty-art{width:120px;height:120px;border-radius:50%;background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--accent) 55%,transparent),transparent 62%),radial-gradient(circle at 70% 70%,color-mix(in srgb,var(--primary) 50%,transparent),transparent 60%);filter:blur(.4px);animation:float 9s ease-in-out infinite}

/* ── Motion primitives (screenshot-safe: .in resets all) ── */
.rv{opacity:0;transform:translateY(26px);transition:opacity .9s var(--ease),transform .9s var(--ease),filter .9s var(--ease),clip-path 1s var(--ease);will-change:opacity,transform}
.rv-slide{transform:translateX(-38px)}
.rv-blur{filter:blur(16px)}
.rv-mask{clip-path:inset(0 100% 0 0);transform:none}
.rv-scale{transform:scale(.93)}
.rv.in{opacity:1;transform:none;filter:none;clip-path:inset(0 0 0 0)}
.stagger>*{opacity:0;transform:translateY(22px);transition:opacity .8s var(--ease),transform .8s var(--ease)}
.stagger.in>*{opacity:1;transform:none}
.stagger.in>*:nth-child(1){transition-delay:.05s}
.stagger.in>*:nth-child(2){transition-delay:.13s}
.stagger.in>*:nth-child(3){transition-delay:.21s}
.stagger.in>*:nth-child(4){transition-delay:.29s}
.stagger.in>*:nth-child(5){transition-delay:.37s}
.stagger.in>*:nth-child(6){transition-delay:.45s}
.zoomable{overflow:hidden;border-radius:var(--r-md)}
.zoomable>*{transition:transform .8s var(--ease)}
.zoomable:hover>*{transform:scale(1.06)}
.progress{position:fixed;top:0;left:0;height:3px;width:0;z-index:100;background:linear-gradient(90deg,var(--primary),var(--accent));transition:width .1s linear}
@media(prefers-reduced-motion:reduce){
  .rv,.stagger>*{opacity:1!important;transform:none!important;filter:none!important;clip-path:none!important;transition:none!important}
  .aurora,.shape,.empty-art{animation:none}
  html{scroll-behavior:auto}
}
${effectsCss()}
${customCss ? `\n/* ── Brand flourishes (art-directed) ── */\n${customCss}\n` : ""}
`.trim();
}

/** Client motion runtime: reveals, parallax, mouse-parallax, tilt, count-up, progress. */
export const MOTION_COMPONENT = `"use client";

import { useEffect } from "react";

// Motion runtime for the whole app — reveals, parallax, tilt, count-up, scroll progress.
// Re-runs on every route change so newly mounted sections animate too.
export function Motion() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealables = Array.from(document.querySelectorAll<HTMLElement>(".rv, .stagger"));

    if (reduce) {
      revealables.forEach((el) => el.classList.add("in"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
      );
      revealables.forEach((el) => io.observe(el));
      // Anything already on screen shows immediately.
      requestAnimationFrame(() => {
        revealables.forEach((el) => {
          if (el.getBoundingClientRect().top < window.innerHeight * 0.92) el.classList.add("in");
        });
      });
      // FAILSAFE: never leave content invisible. If the observer misses an element
      // (late hydration, offscreen-but-short page, resize race), reveal it anyway.
      var failsafe = window.setTimeout(() => {
        revealables.forEach((el) => el.classList.add("in"));
      }, 2000);
      var cleanupIo = () => { io.disconnect(); window.clearTimeout(failsafe); };
    }

    // Count-up numbers
    document.querySelectorAll<HTMLElement>("[data-countup]").forEach((el) => {
      const target = parseFloat(el.getAttribute("data-countup") || "0");
      const suffix = el.getAttribute("data-suffix") || "";
      if (reduce) { el.textContent = String(target) + suffix; return; }
      let started = false;
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting || started) return;
          started = true;
          const t0 = performance.now();
          const step = (now: number) => {
            const p = Math.min(1, (now - t0) / 1200);
            el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toString() + suffix;
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      }, { threshold: 0.5 });
      io2.observe(el);
    });

    if (reduce) return () => {};

    // Scroll parallax + progress bar
    const parallax = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    const bar = document.querySelector<HTMLElement>(".progress");
    const onScroll = () => {
      const y = window.scrollY;
      parallax.forEach((el) => {
        const speed = parseFloat(el.getAttribute("data-parallax") || "0.2");
        el.style.transform = \`translate3d(0, \${y * speed * -0.14}px, 0)\`;
      });
      if (bar) {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Pointer-driven depth + 3D tilt (fine pointers only)
    const fine = window.matchMedia("(pointer:fine)").matches;
    const mouseEls = Array.from(document.querySelectorAll<HTMLElement>("[data-mouse]"));
    const onMove = (e: MouseEvent) => {
      const cx = e.clientX / window.innerWidth - 0.5;
      const cy = e.clientY / window.innerHeight - 0.5;
      mouseEls.forEach((el) => {
        const d = parseFloat(el.getAttribute("data-mouse") || "18");
        el.style.transform = \`translate3d(\${cx * d}px, \${cy * d}px, 0)\`;
      });
    };
    if (fine && mouseEls.length) window.addEventListener("mousemove", onMove);

    const tilts = Array.from(document.querySelectorAll<HTMLElement>("[data-tilt]"));
    const tiltHandlers: Array<[HTMLElement, (e: MouseEvent) => void, () => void]> = [];
    if (fine) {
      tilts.forEach((el) => {
        const move = (e: MouseEvent) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = \`perspective(900px) rotateY(\${px * 7}deg) rotateX(\${-py * 7}deg) translateY(-4px)\`;
        };
        const leave = () => { el.style.transform = ""; };
        el.style.transition = "transform .35s var(--ease)";
        el.addEventListener("mousemove", move);
        el.addEventListener("mouseleave", leave);
        tiltHandlers.push([el, move, leave]);
      });
    }

    return () => {
      cleanupIo?.();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
      tiltHandlers.forEach(([el, move, leave]) => {
        el.removeEventListener("mousemove", move);
        el.removeEventListener("mouseleave", leave);
      });
    };
  });

  return null;
}
`;

/** Framer Motion page transition + photo credit overlay for the generated app shell. */
export const TRANSITION_COMPONENT = `"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Route-level choreography: content settles in with a spring rather than snapping.
// Honours prefers-reduced-motion by collapsing to a plain fade.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, filter: "blur(6px)" }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
        transition={reduce ? { duration: 0.2 } : { type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
`;

/** Decorative markup for a page treatment (sits behind content). */
export function decorMarkup(decor: PageTreatment["decor"]): string {
  switch (decor) {
    case "orbs":
      return `<div className="orb orb-a" style={{ width: "42vw", height: "42vw", maxWidth: 520, maxHeight: 520, top: "-16%", left: "-10%" }} data-parallax="0.3" />
        <div className="orb orb-b" style={{ width: "32vw", height: "32vw", maxWidth: 420, maxHeight: 420, bottom: "-22%", right: "-8%" }} data-mouse="22" />
        <div className="grain" />`;
    case "mesh":
      return `<div className="mesh" data-parallax="0.18" /><div className="grain" />`;
    case "grid":
      return `<div className="grid-bg" /><div className="orb orb-a" style={{ width: 380, height: 380, top: "-18%", right: "-6%", opacity: 0.35 }} data-mouse="16" />`;
    case "rays":
      return `<div className="rays" data-parallax="0.12" /><div className="grain" />`;
    case "aurora":
      return `<div className="aurora" /><div className="shape" style={{ width: 190, height: 190, right: "6%", top: "12%" }} data-mouse="26" /><div className="grain" />`;
    default:
      return "";
  }
}

/** Reveal class for a motion style. */
export const revealClass = (m: PageTreatment["motion"]) =>
  m === "mask" ? "rv rv-mask" : m === "blur" ? "rv rv-blur" : m === "slide" ? "rv rv-slide" : m === "stagger" ? "rv" : "rv";
