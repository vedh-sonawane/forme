import type { DesignSystem } from "@/lib/design/schema";

// Convert Design System tokens into a coherent CSS layer: :root variables +
// a small set of reusable, well-designed utility/component classes. Both the LLM
// code generator and the deterministic baseline renderer consume this so the visual
// language stays consistent regardless of which path produced the HTML.

function googleFontQuery(system: DesignSystem): string {
  const families = new Set<string>();
  for (const f of [system.typography.fontHeading, system.typography.fontBody]) {
    const first = f.split(",")[0].replace(/["']/g, "").trim();
    // Only request plausible Google Fonts (skip generic/system stacks).
    if (first && !/system-ui|sans-serif|serif|monospace|ui-|-apple/i.test(first)) {
      families.add(first);
    }
  }
  if (families.size === 0) families.add("Inter");
  const parts = Array.from(families).map(
    (f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700;800`
  );
  return `https://fonts.googleapis.com/css2?${parts.join("&")}&display=swap`;
}

export function fontLinkTag(system: DesignSystem): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${googleFontQuery(system)}">`;
}

export function systemToCss(s: DesignSystem): string {
  const c = s.colors;
  const t = s.typography;
  return `
:root{
  --bg:${c.bg};--surface:${c.surface};--surface-alt:${c.surfaceAlt};
  --text:${c.text};--text-muted:${c.textMuted};--border:${c.border};
  --primary:${c.primary};--primary-text:${c.primaryText};--accent:${c.accent};
  --font-heading:${t.fontHeading};--font-body:${t.fontBody};
  --w-head:${t.weightHeading};--w-body:${t.weightBody};
  --fs-display:${t.scale.display};--fs-h1:${t.scale.h1};--fs-h2:${t.scale.h2};--fs-h3:${t.scale.h3};--fs-body:${t.scale.body};--fs-small:${t.scale.small};
  --tracking:${t.tracking};--lh:${t.lineHeight};
  --section:${s.spacing.section};--container:${s.spacing.container};--unit:${s.spacing.unit}px;
  --r-sm:${s.radius.sm};--r-md:${s.radius.md};--r-lg:${s.radius.lg};--r-pill:${s.radius.pill};
  --sh-sm:${s.shadow.sm};--sh-md:${s.shadow.md};--sh-lg:${s.shadow.lg};
  --ease:${s.motion.easing};--dur:${s.motion.durationMs}ms;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:var(--font-body);font-weight:var(--w-body);font-size:var(--fs-body);line-height:var(--lh);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
h1,h2,h3,h4{font-family:var(--font-heading);font-weight:var(--w-head);line-height:1.08;letter-spacing:var(--tracking)}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
p{color:var(--text-muted)}
.container{width:100%;max-width:var(--container);margin-inline:auto;padding-inline:clamp(1.2rem,4vw,2rem)}
.section{padding-block:var(--section)}
.eyebrow{display:inline-block;font-family:var(--font-body);font-size:var(--fs-small);font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.display{font-size:var(--fs-display)}
.h1{font-size:var(--fs-h1)} .h2{font-size:var(--fs-h2)} .h3{font-size:var(--fs-h3)}
.lead{font-size:calc(var(--fs-body) * 1.15);color:var(--text-muted);max-width:56ch}
.muted{color:var(--text-muted)}
.btn{display:inline-flex;align-items:center;gap:.5rem;font-family:var(--font-body);font-weight:600;font-size:var(--fs-body);padding:.85rem 1.5rem;border-radius:var(--r-pill);border:1px solid transparent;cursor:pointer;transition:transform var(--dur) var(--ease),box-shadow var(--dur) var(--ease),background var(--dur) var(--ease)}
.btn:hover{transform:translateY(-2px)}
.btn-primary{background:var(--primary);color:var(--primary-text);box-shadow:var(--sh-md)}
.btn-primary:hover{box-shadow:var(--sh-lg)}
.btn-ghost{background:transparent;color:var(--text);border-color:var(--border)}
.btn-ghost:hover{background:var(--surface)}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:clamp(1.4rem,3vw,2rem);box-shadow:var(--sh-sm);transition:transform var(--dur) var(--ease),box-shadow var(--dur) var(--ease),border-color var(--dur) var(--ease)}
.card:hover{transform:translateY(-4px);box-shadow:var(--sh-md);border-color:color-mix(in srgb,var(--primary) 40%,var(--border))}
.grid{display:grid;gap:clamp(1rem,2.5vw,1.6rem)}
.grid-3{grid-template-columns:repeat(3,1fr)}
.grid-2{grid-template-columns:repeat(2,1fr)}
.badge{display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .75rem;border-radius:var(--r-pill);background:var(--surface);border:1px solid var(--border);font-size:var(--fs-small);color:var(--text-muted)}
.nav{position:sticky;top:0;z-index:50;backdrop-filter:saturate(160%) blur(12px);background:color-mix(in srgb,var(--bg) 82%,transparent);border-bottom:1px solid var(--border)}
.nav-inner{display:flex;align-items:center;justify-content:space-between;height:68px}
.nav-links{display:flex;gap:1.6rem;align-items:center}
.nav-links a{color:var(--text-muted);font-size:var(--fs-small);font-weight:500;transition:color var(--dur) var(--ease)}
.nav-links a:hover{color:var(--text)}
.brand{font-family:var(--font-heading);font-weight:800;font-size:1.25rem;letter-spacing:-.02em;display:flex;align-items:center;gap:.55rem}
.brand-mark{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,var(--primary),var(--accent))}
.hero{position:relative;overflow:hidden}
.hero-glow{position:absolute;inset:-20% -10% auto -10%;height:520px;background:radial-gradient(60% 60% at 30% 20%,color-mix(in srgb,var(--primary) 30%,transparent),transparent 70%),radial-gradient(50% 50% at 80% 10%,color-mix(in srgb,var(--accent) 24%,transparent),transparent 70%);filter:blur(20px);pointer-events:none;z-index:0}
.hero-inner{position:relative;z-index:1}
.metric-num{font-family:var(--font-heading);font-weight:800;font-size:clamp(2.2rem,4vw,3.2rem);background:linear-gradient(135deg,var(--text),color-mix(in srgb,var(--primary) 70%,var(--text)));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.mock{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--surface-alt);box-shadow:var(--sh-lg);overflow:hidden}
.mock-bar{display:flex;gap:.4rem;padding:.7rem .9rem;border-bottom:1px solid var(--border);background:var(--surface)}
.mock-dot{width:10px;height:10px;border-radius:50%;background:var(--border)}
.logos{display:flex;flex-wrap:wrap;gap:2rem 3rem;align-items:center;opacity:.7}
.logo-item{font-family:var(--font-heading);font-weight:700;font-size:1.1rem;color:var(--text-muted)}
.price{font-family:var(--font-heading);font-weight:800;font-size:clamp(2rem,3.5vw,2.6rem)}
.check{color:var(--accent);flex:0 0 auto}
.cta-band{background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 14%,var(--surface)),var(--surface));border:1px solid var(--border);border-radius:var(--r-lg)}
.footer{border-top:1px solid var(--border);color:var(--text-muted)}
.reveal{opacity:0;transform:translateY(18px);transition:opacity .7s var(--ease),transform .7s var(--ease)}
.reveal.in{opacity:1;transform:none}
@media(max-width:900px){.grid-3{grid-template-columns:1fr}.grid-2{grid-template-columns:1fr}.nav-links{display:none}.nav-links.cta-only{display:flex}}
`.trim();
}

/** Tiny scroll-reveal script injected into generated pages. */
export const REVEAL_SCRIPT = `<script>
(function(){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});
document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});})();
</script>`;
