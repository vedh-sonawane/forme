import type { DesignSystem } from "@/lib/design/schema";

// Convert Design System tokens into a premium, coherent CSS layer: :root variables
// + a curated set of reusable, expensively-designed component classes. Both the LLM
// code generator and the deterministic baseline renderer consume this, so the visual
// language stays high-quality and consistent regardless of which path produced the HTML.

function googleFontQuery(system: DesignSystem): string {
  const families = new Set<string>();
  for (const f of [system.typography.fontHeading, system.typography.fontBody]) {
    const first = f.split(",")[0].replace(/["']/g, "").trim();
    if (first && !/system-ui|sans-serif|serif|monospace|ui-|-apple/i.test(first)) {
      families.add(first);
    }
  }
  if (families.size === 0) families.add("Inter");
  const parts = Array.from(families).map(
    (f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700;800;900`
  );
  return `https://fonts.googleapis.com/css2?${parts.join("&")}&display=swap`;
}

export function fontLinkTag(system: DesignSystem): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${googleFontQuery(system)}">`;
}

// A fine film-grain texture (SVG data URI) — premium tactile depth, barely visible.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

export function systemToCss(s: DesignSystem): string {
  const c = s.colors;
  const t = s.typography;
  return `
:root{
  --bg:${c.bg};--surface:${c.surface};--surface-alt:${c.surfaceAlt};
  --text:${c.text};--text-muted:${c.textMuted};--border:${c.border};
  --primary:${c.primary};--primary-text:${c.primaryText};--accent:${c.accent};
  --primary-soft:color-mix(in srgb,var(--primary) 14%,var(--surface));
  --accent-soft:color-mix(in srgb,var(--accent) 16%,var(--surface));
  --glass:color-mix(in srgb,var(--surface) 62%,transparent);
  --font-heading:${t.fontHeading};--font-body:${t.fontBody};
  --w-head:${t.weightHeading};--w-body:${t.weightBody};
  --fs-display:${t.scale.display};--fs-h1:${t.scale.h1};--fs-h2:${t.scale.h2};--fs-h3:${t.scale.h3};--fs-body:${t.scale.body};--fs-small:${t.scale.small};
  --tracking:${t.tracking};--lh:${t.lineHeight};
  --section:${s.spacing.section};--container:${s.spacing.container};--unit:${s.spacing.unit}px;
  --r-sm:${s.radius.sm};--r-md:${s.radius.md};--r-lg:${s.radius.lg};--r-xl:calc(${s.radius.lg} + 10px);--r-pill:${s.radius.pill};
  --sh-sm:${s.shadow.sm};--sh-md:${s.shadow.md};--sh-lg:${s.shadow.lg};
  --ease:${s.motion.easing};--dur:${s.motion.durationMs}ms;
}
*{box-sizing:border-box;margin:0;padding:0}
::selection{background:color-mix(in srgb,var(--accent) 30%,transparent);color:var(--text)}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--text);font-family:var(--font-body);font-weight:var(--w-body);font-size:var(--fs-body);line-height:var(--lh);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden}
h1,h2,h3,h4{font-family:var(--font-heading);font-weight:var(--w-head);line-height:1.04;letter-spacing:var(--tracking);text-wrap:balance}
p{color:var(--text-muted);text-wrap:pretty}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
ul{list-style:none}

/* Layout */
.container{width:100%;max-width:var(--container);margin-inline:auto;padding-inline:clamp(1.25rem,4vw,2.5rem)}
.section{padding-block:var(--section);position:relative}
.section-sm{padding-block:clamp(2.5rem,6vw,4.5rem);position:relative}
.center{text-align:center}
.stack{display:grid;gap:1rem}
.grid{display:grid;gap:clamp(1rem,2.4vw,1.6rem)}
.grid-2{grid-template-columns:repeat(2,1fr)}
.grid-3{grid-template-columns:repeat(3,1fr)}
.grid-4{grid-template-columns:repeat(4,1fr)}
/* Bento — editorial, varied cell sizes */
.bento{display:grid;grid-template-columns:repeat(6,1fr);gap:clamp(.9rem,2vw,1.4rem)}
.bento>*{grid-column:span 2}
.bento>.wide{grid-column:span 4}
.bento>.tall{grid-row:span 2}
.bento>.full{grid-column:span 6}

/* Type */
.display{font-size:var(--fs-display);letter-spacing:-.03em}
.h1{font-size:var(--fs-h1)} .h2{font-size:var(--fs-h2)} .h3{font-size:var(--fs-h3)}
.lead{font-size:clamp(1.05rem,1.4vw,1.28rem);color:var(--text-muted);line-height:1.55;max-width:62ch}
.muted{color:var(--text-muted)}
.small{font-size:var(--fs-small)}
.grad{background:linear-gradient(120deg,var(--text) 30%,color-mix(in srgb,var(--primary) 80%,var(--text)) 62%,color-mix(in srgb,var(--accent) 80%,var(--text)));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
.serif-accent{font-style:italic;font-weight:500}

/* Eyebrow chip */
.eyebrow{display:inline-flex;align-items:center;gap:.5rem;font-family:var(--font-body);font-size:var(--fs-small);font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--text-muted);background:var(--surface);border:1px solid var(--border);padding:.4rem .85rem;border-radius:var(--r-pill)}
.eyebrow.plain{background:none;border:none;padding:0;color:var(--accent)}

/* Buttons */
.btn{display:inline-flex;align-items:center;gap:.55rem;font-family:var(--font-body);font-weight:600;font-size:var(--fs-body);padding:.9rem 1.6rem;border-radius:var(--r-pill);border:1px solid transparent;cursor:pointer;transition:transform var(--dur) var(--ease),box-shadow var(--dur) var(--ease),background var(--dur) var(--ease),filter var(--dur) var(--ease);white-space:nowrap}
.btn-primary{background:linear-gradient(180deg,color-mix(in srgb,var(--primary) 92%,#fff),var(--primary));color:var(--primary-text);box-shadow:0 10px 30px -10px color-mix(in srgb,var(--primary) 60%,transparent),inset 0 1px 0 color-mix(in srgb,#fff 30%,transparent)}
.btn-primary:hover{transform:translateY(-2px);filter:brightness(1.05);box-shadow:0 18px 40px -12px color-mix(in srgb,var(--primary) 65%,transparent)}
.btn-ghost{background:var(--glass);color:var(--text);border-color:var(--border);backdrop-filter:blur(8px)}
.btn-ghost:hover{transform:translateY(-2px);background:var(--surface)}
.btn-lg{padding:1.05rem 1.9rem;font-size:calc(var(--fs-body) * 1.05)}

/* Cards */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:clamp(1.5rem,3vw,2.1rem);box-shadow:var(--sh-sm);transition:transform var(--dur) var(--ease),box-shadow var(--dur) var(--ease),border-color var(--dur) var(--ease);position:relative;overflow:hidden}
.card:hover{transform:translateY(-5px);box-shadow:var(--sh-lg);border-color:color-mix(in srgb,var(--primary) 45%,var(--border))}
.glass{background:var(--glass);border:1px solid color-mix(in srgb,var(--text) 8%,transparent);backdrop-filter:blur(18px) saturate(150%);border-radius:var(--r-lg);box-shadow:var(--sh-md)}
.icon-tile{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,var(--primary),var(--accent));color:var(--primary-text);box-shadow:0 8px 20px -8px color-mix(in srgb,var(--primary) 60%,transparent)}
.badge{display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .8rem;border-radius:var(--r-pill);background:var(--surface);border:1px solid var(--border);font-size:var(--fs-small);color:var(--text-muted);font-weight:500}

/* Mesh & decoration */
.mesh{position:absolute;inset:0;z-index:0;pointer-events:none;background:
  radial-gradient(42% 40% at 12% 8%,color-mix(in srgb,var(--primary) 26%,transparent),transparent 62%),
  radial-gradient(40% 38% at 88% 4%,color-mix(in srgb,var(--accent) 24%,transparent),transparent 60%),
  radial-gradient(46% 44% at 78% 92%,color-mix(in srgb,var(--primary) 16%,transparent),transparent 64%)}
.grain::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.4;mix-blend-mode:overlay;background-image:${GRAIN}}
.orb{position:absolute;border-radius:50%;filter:blur(60px);opacity:.5;pointer-events:none;z-index:0}

/* Nav */
.nav{position:sticky;top:0;z-index:50;backdrop-filter:saturate(160%) blur(14px);background:color-mix(in srgb,var(--bg) 78%,transparent);border-bottom:1px solid color-mix(in srgb,var(--border) 70%,transparent)}
.nav-inner{display:flex;align-items:center;justify-content:space-between;height:72px;gap:1rem}
.nav-links{display:flex;gap:1.9rem;align-items:center}
.nav-links a{color:var(--text-muted);font-size:var(--fs-small);font-weight:500;transition:color var(--dur) var(--ease)}
.nav-links a:hover{color:var(--text)}
.brand{font-family:var(--font-heading);font-weight:800;font-size:1.28rem;letter-spacing:-.03em;display:flex;align-items:center;gap:.6rem}
.brand-mark{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,var(--primary),var(--accent));box-shadow:0 6px 16px -6px color-mix(in srgb,var(--primary) 70%,transparent)}

/* Hero */
.hero{position:relative;overflow:hidden;padding-top:clamp(4rem,10vw,7rem)}
.hero-inner{position:relative;z-index:2}
.hero .mesh{opacity:.9}

/* Product mock — premium browser frame */
.mock{border:1px solid var(--border);border-radius:var(--r-xl);background:var(--surface-alt);box-shadow:var(--sh-lg);overflow:hidden;position:relative}
.mock-bar{display:flex;gap:.45rem;align-items:center;padding:.8rem 1rem;border-bottom:1px solid var(--border);background:var(--surface)}
.mock-dot{width:11px;height:11px;border-radius:50%;background:var(--border)}
.float-card{position:absolute;background:var(--glass);border:1px solid color-mix(in srgb,var(--text) 8%,transparent);backdrop-filter:blur(14px);border-radius:var(--r-md);box-shadow:var(--sh-lg);padding:.9rem 1.1rem}

/* Metrics */
.metric-num{font-family:var(--font-heading);font-weight:800;font-size:clamp(2.4rem,4.4vw,3.6rem);line-height:1;letter-spacing:-.03em;background:linear-gradient(135deg,var(--text),color-mix(in srgb,var(--primary) 75%,var(--text)));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}

/* Logos marquee */
.logos-wrap{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.logos{display:flex;gap:3.4rem;align-items:center;width:max-content;animation:marq 26s linear infinite}
.logo-item{font-family:var(--font-heading);font-weight:700;font-size:1.25rem;color:var(--text-muted);opacity:.75;white-space:nowrap}
@keyframes marq{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* Pricing */
.price{font-family:var(--font-heading);font-weight:800;font-size:clamp(2.2rem,3.6vw,2.9rem);letter-spacing:-.02em}
.tier-feat{border-color:color-mix(in srgb,var(--primary) 55%,var(--border))!important;box-shadow:0 24px 60px -24px color-mix(in srgb,var(--primary) 45%,transparent)!important;transform:translateY(-6px)}
.check{color:var(--accent);flex:0 0 auto}

/* CTA */
.cta-band{position:relative;overflow:hidden;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-xl)}
.cta-band .mesh{opacity:1}

/* Footer */
.footer{border-top:1px solid var(--border);color:var(--text-muted)}
.footer a{color:var(--text-muted);transition:color var(--dur) var(--ease)}
.footer a:hover{color:var(--text)}

/* Divider dot */
.dot{width:5px;height:5px;border-radius:50%;background:var(--accent);display:inline-block}

/* Reveal */
.reveal{opacity:0;transform:translateY(22px);transition:opacity .8s var(--ease),transform .8s var(--ease)}
.reveal.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none}.logos{animation:none}}

/* Responsive */
@media(max-width:960px){
  .grid-3,.grid-4{grid-template-columns:1fr 1fr}
  .bento>*,.bento>.wide,.bento>.full{grid-column:span 6}
  .bento>.tall{grid-row:auto}
  .nav-links.main{display:none}
}
@media(max-width:640px){
  .grid-2,.grid-3,.grid-4{grid-template-columns:1fr}
  .hide-sm{display:none}
}
`.trim();
}

/** Tiny scroll-reveal script injected into generated pages. */
export const REVEAL_SCRIPT = `<script>
(function(){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});})();
</script>`;
