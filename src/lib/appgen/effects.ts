// Immersive visual-effect library. The AI composes pages freely and invokes an effect
// by class name (e.g. <div class="fx fx-waterfall"></div>) when it genuinely serves the
// page. Implementations are hand-tuned CSS/SVG + one small canvas runtime, so they are
// GPU-friendly, respect reduced-motion, and can never break a build.

export const EFFECT_NAMES = [
  "aurora", "waterfall", "waves", "stars", "fog", "particles",
  "mesh", "rays", "blobs", "orbit", "grid", "grain", "bloom",
] as const;

export const effectsCss = () => `
/* ── Immersive effects — decorative only (aria-hidden, pointer-events:none) ── */
.fx{position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.fx-parent{position:relative;isolation:isolate}
.fx-parent > :not(.fx){position:relative;z-index:1}

/* Aurora — slow drifting light sheets */
.fx-aurora::before,.fx-aurora::after{content:"";position:absolute;inset:-40% -20%;filter:blur(70px);opacity:.55;
  background:linear-gradient(120deg,color-mix(in srgb,var(--primary) 55%,transparent),transparent 45%,color-mix(in srgb,var(--accent) 50%,transparent) 75%);
  animation:fx-aurora 22s var(--ease) infinite alternate}
.fx-aurora::after{animation-duration:31s;animation-direction:alternate-reverse;opacity:.4;filter:blur(100px)}
@keyframes fx-aurora{from{transform:translate3d(-6%,-4%,0) rotate(-4deg) scale(1)}to{transform:translate3d(7%,5%,0) rotate(5deg) scale(1.18)}}

/* Waterfall — falling light columns with mist at the base */
.fx-waterfall{background:linear-gradient(180deg,color-mix(in srgb,var(--primary) 10%,transparent),transparent 60%)}
.fx-waterfall::before{content:"";position:absolute;inset:-10% 0 20% 0;
  background:repeating-linear-gradient(90deg,
    transparent 0 14px,
    color-mix(in srgb,var(--accent) 26%,transparent) 14px 16px,
    transparent 16px 34px,
    color-mix(in srgb,var(--primary) 22%,transparent) 34px 35px,
    transparent 35px 62px);
  -webkit-mask-image:linear-gradient(180deg,transparent,#000 18%,#000 62%,transparent);
  mask-image:linear-gradient(180deg,transparent,#000 18%,#000 62%,transparent);
  filter:blur(1.2px);animation:fx-fall 2.6s linear infinite}
.fx-waterfall::after{content:"";position:absolute;left:-10%;right:-10%;bottom:-6%;height:34%;border-radius:50%;
  background:radial-gradient(60% 100% at 50% 100%,color-mix(in srgb,var(--accent) 34%,transparent),transparent 70%);
  filter:blur(26px);animation:fx-mist 7s var(--ease) infinite alternate}
@keyframes fx-fall{to{transform:translateY(120px)}}
@keyframes fx-mist{from{opacity:.45;transform:translateY(6px) scale(1)}to{opacity:.8;transform:translateY(-6px) scale(1.06)}}

/* Waves — layered SVG-ish bands rolling horizontally */
.fx-waves::before,.fx-waves::after{content:"";position:absolute;left:-50%;right:-50%;bottom:0;height:42%;
  background:radial-gradient(50% 100% at 50% 100%,color-mix(in srgb,var(--primary) 40%,transparent),transparent 70%);
  border-radius:45%;animation:fx-wave 14s linear infinite;opacity:.5}
.fx-waves::after{height:56%;opacity:.32;animation-duration:21s;animation-direction:reverse;
  background:radial-gradient(50% 100% at 50% 100%,color-mix(in srgb,var(--accent) 42%,transparent),transparent 70%)}
@keyframes fx-wave{from{transform:translateX(-12%) rotate(0)}to{transform:translateX(12%) rotate(6deg)}}

/* Stars — quiet twinkling field */
.fx-stars{background-image:
  radial-gradient(1.6px 1.6px at 12% 22%,color-mix(in srgb,var(--text) 60%,transparent),transparent),
  radial-gradient(1.4px 1.4px at 68% 14%,color-mix(in srgb,var(--text) 45%,transparent),transparent),
  radial-gradient(1.8px 1.8px at 38% 62%,color-mix(in srgb,var(--text) 55%,transparent),transparent),
  radial-gradient(1.2px 1.2px at 84% 54%,color-mix(in srgb,var(--text) 40%,transparent),transparent),
  radial-gradient(1.5px 1.5px at 26% 84%,color-mix(in srgb,var(--text) 50%,transparent),transparent),
  radial-gradient(1.3px 1.3px at 92% 82%,color-mix(in srgb,var(--text) 42%,transparent),transparent);
  animation:fx-twinkle 5.5s ease-in-out infinite alternate}
@keyframes fx-twinkle{from{opacity:.45}to{opacity:.95}}

/* Fog — soft drifting haze */
.fx-fog::before,.fx-fog::after{content:"";position:absolute;inset:-30%;filter:blur(60px);opacity:.4;
  background:radial-gradient(40% 40% at 30% 50%,color-mix(in srgb,var(--surface-alt) 90%,transparent),transparent 70%),
             radial-gradient(45% 45% at 70% 40%,color-mix(in srgb,var(--primary) 18%,transparent),transparent 70%);
  animation:fx-drift 26s var(--ease) infinite alternate}
.fx-fog::after{animation-duration:38s;animation-direction:alternate-reverse;opacity:.3}
@keyframes fx-drift{from{transform:translate3d(-5%,0,0)}to{transform:translate3d(6%,-3%,0)}}

/* Mesh gradient */
.fx-mesh{filter:blur(12px);background:
  radial-gradient(38% 38% at 16% 20%,color-mix(in srgb,var(--primary) 34%,transparent),transparent 70%),
  radial-gradient(34% 34% at 84% 26%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 70%),
  radial-gradient(46% 46% at 58% 96%,color-mix(in srgb,var(--primary) 20%,transparent),transparent 72%)}

/* Light rays */
.fx-rays{opacity:.5;filter:blur(6px);background:conic-gradient(from 200deg at 50% -10%,
  transparent 0deg,color-mix(in srgb,var(--accent) 24%,transparent) 28deg,transparent 58deg,
  color-mix(in srgb,var(--primary) 22%,transparent) 92deg,transparent 128deg)}

/* Morphing blobs */
.fx-blobs::before,.fx-blobs::after{content:"";position:absolute;width:38%;padding-bottom:38%;border-radius:44% 56% 62% 38%/48% 42% 58% 52%;
  background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 42%,transparent),color-mix(in srgb,var(--accent) 38%,transparent));
  filter:blur(6px);opacity:.6;animation:fx-morph 17s var(--ease) infinite alternate}
.fx-blobs::before{top:6%;left:4%}
.fx-blobs::after{bottom:4%;right:6%;animation-duration:23s;animation-direction:alternate-reverse}
@keyframes fx-morph{from{border-radius:44% 56% 62% 38%/48% 42% 58% 52%;transform:translate3d(0,0,0) rotate(0)}
  to{border-radius:60% 40% 38% 62%/56% 60% 40% 44%;transform:translate3d(3%,-4%,0) rotate(18deg)}}

/* Orbiting rings */
.fx-orbit::before,.fx-orbit::after{content:"";position:absolute;top:50%;left:50%;width:52%;padding-bottom:52%;
  border:1px solid color-mix(in srgb,var(--text) 14%,transparent);border-radius:50%;
  transform:translate(-50%,-50%);animation:fx-spin 34s linear infinite}
.fx-orbit::after{width:78%;padding-bottom:78%;border-style:dashed;opacity:.6;animation-duration:56s;animation-direction:reverse}
@keyframes fx-spin{to{transform:translate(-50%,-50%) rotate(360deg)}}

/* Perspective grid */
.fx-grid{opacity:.4;background-image:
  linear-gradient(color-mix(in srgb,var(--text) 8%,transparent) 1px,transparent 1px),
  linear-gradient(90deg,color-mix(in srgb,var(--text) 8%,transparent) 1px,transparent 1px);
  background-size:54px 54px;
  -webkit-mask-image:radial-gradient(75% 65% at 50% 0%,#000,transparent);
  mask-image:radial-gradient(75% 65% at 50% 0%,#000,transparent)}

/* Film grain */
.fx-grain{opacity:.05;mix-blend-mode:overlay;background-size:190px 190px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.6'/%3E%3C/svg%3E")}

/* Light bloom */
.fx-bloom::before{content:"";position:absolute;top:-30%;left:50%;width:70%;padding-bottom:70%;transform:translateX(-50%);
  background:radial-gradient(circle,color-mix(in srgb,var(--accent) 34%,transparent),transparent 65%);filter:blur(60px);
  animation:fx-pulse 9s var(--ease) infinite alternate}
@keyframes fx-pulse{from{opacity:.5;transform:translateX(-50%) scale(1)}to{opacity:.85;transform:translateX(-50%) scale(1.14)}}

@media (prefers-reduced-motion: reduce){
  .fx-aurora::before,.fx-aurora::after,.fx-waterfall::before,.fx-waterfall::after,
  .fx-waves::before,.fx-waves::after,.fx-stars,.fx-fog::before,.fx-fog::after,
  .fx-blobs::before,.fx-blobs::after,.fx-orbit::before,.fx-orbit::after,.fx-bloom::before{animation:none}
}
`;

/** Canvas particle field — mounted only where the AI asks for `.fx-particles`. */
export const PARTICLES_COMPONENT = `"use client";

import { useEffect, useRef } from "react";

// Lightweight particle field: capped count, pauses offscreen, honours reduced-motion.
export function Particles({ density = 0.00008 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    let dots: P[] = [];

    const colour = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#888";

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      w = Math.max(1, rect?.width ?? window.innerWidth);
      h = Math.max(1, rect?.height ?? 400);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.max(18, Math.round(w * h * density)));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.16,
        vy: -0.05 - Math.random() * 0.22,
        r: 0.7 + Math.random() * 1.9,
        a: 0.18 + Math.random() * 0.5,
      }));
    };

    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.y < -8) { d.y = h + 8; d.x = Math.random() * w; }
        if (d.x < -8) d.x = w + 8;
        if (d.x > w + 8) d.x = -8;
        ctx.globalAlpha = d.a;
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };

    resize();
    tick();
    window.addEventListener("resize", resize);

    // Pause when scrolled out of view (saves battery / main thread).
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        running = e.isIntersecting;
        if (running) { cancelAnimationFrame(raf); tick(); }
      });
    });
    if (canvas.parentElement) io.observe(canvas.parentElement);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      io.disconnect();
    };
  }, [density]);

  return <canvas ref={ref} className="fx" aria-hidden="true" />;
}
`;
