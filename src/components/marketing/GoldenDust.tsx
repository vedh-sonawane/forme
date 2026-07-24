"use client";

import { useEffect, useRef } from "react";

// Canvas particle field of golden dust that drifts through the lighthouse beam.
// Fades in/out with `active`; the animation loop reads a ref so toggling never
// re-seeds the particles. Biased toward a diagonal band (the beam) for realism.
type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; tw: number };

export function GoldenDust({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, raf = 0, alpha = 0;
    const parts: P[] = [];

    // Seed a particle clustered along the beam's diagonal band (lamp top-left → mid-right).
    const seed = (fromLeft = false): P => {
      const x = fromLeft ? -8 : Math.random() * w;
      const beamY = (0.12 + (Math.max(0, x) / Math.max(1, w)) * 0.36) * h; // beam centerline
      const y = beamY + (Math.random() - 0.5) * h * 0.24; // spread within the cone
      return {
        x,
        y,
        vx: 0.2 + Math.random() * 0.6, // drift right along the beam
        vy: -(0.05 + Math.random() * 0.35) + (Math.random() - 0.5) * 0.2,
        r: Math.random() * 2 + 0.6,
        a: Math.random() * Math.PI * 2,
        tw: Math.random() * 0.05 + 0.015,
      };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (parts.length === 0) for (let i = 0; i < 170; i++) parts.push(seed());
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = () => {
      alpha += ((activeRef.current ? 1 : 0) - alpha) * 0.05;
      ctx.clearRect(0, 0, w, h);
      if (alpha > 0.01) {
        ctx.globalCompositeOperation = "lighter";
        for (const p of parts) {
          p.x += p.vx; p.y += p.vy; p.a += p.tw;
          if (p.x > w + 12 || p.y < -12) Object.assign(p, seed(true));
          const tw = Math.sin(p.a) * 0.5 + 0.5;
          const rad = p.r * 3.4;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
          g.addColorStop(0, `rgba(255,232,160,${0.9 * tw * alpha})`);
          g.addColorStop(0.4, `rgba(244,200,91,${0.5 * tw * alpha})`);
          g.addColorStop(1, "rgba(244,200,91,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
