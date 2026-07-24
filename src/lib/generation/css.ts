import type { DesignSystem } from "@/lib/design/schema";

// Converts Design System tokens into a coherent CSS layer: :root variables, base
// utility/component classes, AND a cinematic "scene" vocabulary (backgrounds, spacing
// paces, dramatic type, depth decor) plus a screenshot-safe motion system. Both the LLM
// code generator and the deterministic scene renderer consume this, so the visual
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
    (f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700;800;900`
  );
  return `https://fonts.googleapis.com/css2?${parts.join("&")}&display=swap`;
}

export function fontLinkTag(system: DesignSystem): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${googleFontQuery(system)}">`;
}

// Compact SVG fractal-noise for a filmic grain overlay (no external asset).
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

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
body{background:var(--bg);color:var(--text);font-family:var(--font-body);font-weight:var(--w-body);font-size:var(--fs-body);line-height:var(--lh);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden}
h1,h2,h3,h4{font-family:var(--font-heading);font-weight:var(--w-head);line-height:1.06;letter-spacing:var(--tracking)}
a{color:inherit;text-decoration:none}
img,svg{max-width:100%;display:block}
p{color:var(--text-muted)}
.container,.container-wide,.container-narrow{width:100%;margin-inline:auto;padding-inline:clamp(1.2rem,4vw,2.2rem)}
.container{max-width:var(--container)}
.container-wide{max-width:min(1440px,94vw)}
.container-narrow{max-width:760px}
.section{padding-block:var(--section)}

/* ── Type ─────────────────────────────────────────────── */
.eyebrow,.kicker{display:inline-flex;align-items:center;gap:.55rem;font-family:var(--font-body);font-size:var(--fs-small);font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
.kicker::before{content:"";width:1.6rem;height:1px;background:currentColor;opacity:.6}
.display{font-size:var(--fs-display)}
.type-mega{font-family:var(--font-heading);font-weight:var(--w-head);line-height:.94;letter-spacing:-.035em;font-size:clamp(3rem,9vw,8rem)}
.type-display{font-family:var(--font-heading);font-weight:var(--w-head);line-height:1.0;letter-spacing:-.02em;font-size:clamp(2.4rem,6vw,5rem)}
.h1{font-size:var(--fs-h1)} .h2{font-size:var(--fs-h2)} .h3{font-size:var(--fs-h3)}
.lead{font-size:clamp(1.05rem,1.6vw,1.35rem);color:var(--text-muted);max-width:56ch;line-height:1.55}
.muted{color:var(--text-muted)}
.balance{text-wrap:balance}
.measure{max-width:62ch}
.stat-huge{font-family:var(--font-heading);font-weight:800;line-height:.95;font-size:clamp(3rem,8.5vw,7rem);letter-spacing:-.03em;background:linear-gradient(135deg,var(--text),color-mix(in srgb,var(--primary) 72%,var(--text)));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}

/* ── Buttons / chips ──────────────────────────────────── */
.btn{display:inline-flex;align-items:center;gap:.55rem;font-family:var(--font-body);font-weight:600;font-size:var(--fs-body);padding:.9rem 1.6rem;border-radius:var(--r-pill);border:1px solid transparent;cursor:pointer;transition:transform var(--dur) var(--ease),box-shadow var(--dur) var(--ease),background var(--dur) var(--ease),filter var(--dur) var(--ease)}
.btn-primary{background:var(--primary);color:var(--primary-text);box-shadow:var(--sh-md)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:var(--sh-lg);filter:brightness(1.05)}
.btn-ghost{background:transparent;color:var(--text);border-color:color-mix(in srgb,var(--text) 22%,transparent)}
.btn-ghost:hover{background:color-mix(in srgb,var(--text) 6%,transparent);transform:translateY(-2px)}
.tag{display:inline-flex;align-items:center;gap:.4rem;padding:.4rem .85rem;border-radius:var(--r-pill);background:color-mix(in srgb,var(--text) 6%,transparent);border:1px solid color-mix(in srgb,var(--text) 12%,transparent);font-size:var(--fs-small);color:var(--text-muted)}

/* ── Surfaces ─────────────────────────────────────────── */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:clamp(1.5rem,3vw,2.2rem);transition:transform var(--dur) var(--ease),box-shadow var(--dur) var(--ease),border-color var(--dur) var(--ease)}
.card:hover{transform:translateY(-5px);box-shadow:var(--sh-lg);border-color:color-mix(in srgb,var(--primary) 45%,var(--border))}
.glass{background:color-mix(in srgb,var(--surface) 55%,transparent);backdrop-filter:blur(16px) saturate(150%);-webkit-backdrop-filter:blur(16px) saturate(150%);border:1px solid color-mix(in srgb,var(--text) 10%,transparent);border-radius:var(--r-lg)}
.grid{display:grid;gap:clamp(1rem,2.4vw,1.7rem)}
.grid-2{grid-template-columns:repeat(2,1fr)}
.grid-3{grid-template-columns:repeat(3,1fr)}
.grid-4{grid-template-columns:repeat(4,1fr)}

/* ── Scene backgrounds (create light/dark rhythm on any base theme) ── */
.scene{position:relative;overflow:hidden}
.scene-inner,.scene>.container,.scene>.container-wide,.scene>.container-narrow{position:relative;z-index:1}
.scene--base{background:var(--bg);color:var(--text)}
.scene--surface{background:var(--surface);color:var(--text)}
.scene--tint{background:color-mix(in srgb,var(--primary) 9%,var(--bg));color:var(--text)}
.scene--gradient{background:linear-gradient(155deg,color-mix(in srgb,var(--primary) 24%,var(--bg)),color-mix(in srgb,var(--accent) 18%,var(--bg)) 55%,var(--bg));color:var(--text)}
.scene--glow{background:var(--bg);color:var(--text)}
/* dramatic contrast flip: swap fg/bg for a bold alternate chapter */
.scene--contrast{background:var(--text);color:var(--bg)}
.scene--contrast p,.scene--contrast .muted,.scene--contrast .lead{color:color-mix(in srgb,var(--bg) 72%,var(--text))}
.scene--contrast .card{background:color-mix(in srgb,var(--bg) 8%,var(--text));border-color:color-mix(in srgb,var(--bg) 18%,var(--text))}
.scene--contrast .tag{background:color-mix(in srgb,var(--bg) 10%,var(--text));border-color:color-mix(in srgb,var(--bg) 20%,var(--text));color:color-mix(in srgb,var(--bg) 75%,var(--text))}
.scene--contrast .stat-huge{background:linear-gradient(135deg,var(--bg),color-mix(in srgb,var(--accent) 60%,var(--bg)));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}

/* ── Spacing paces (visual rhythm) ────────────────────── */
.pace--tight{padding-block:clamp(2rem,5vw,3.5rem)}
.pace--normal{padding-block:clamp(4rem,8vw,6.5rem)}
.pace--airy{padding-block:clamp(6rem,12vw,10rem)}
.pace--huge{padding-block:clamp(7.5rem,17vw,14rem)}

/* ── Depth / atmosphere decor ─────────────────────────── */
.orb{position:absolute;border-radius:50%;filter:blur(70px);opacity:.55;pointer-events:none;z-index:0}
.orb--primary{background:radial-gradient(circle,var(--primary),transparent 70%)}
.orb--accent{background:radial-gradient(circle,var(--accent),transparent 70%)}
.mesh{position:absolute;inset:-20%;pointer-events:none;z-index:0;background:
  radial-gradient(38% 38% at 18% 22%,color-mix(in srgb,var(--primary) 34%,transparent),transparent 70%),
  radial-gradient(36% 36% at 82% 28%,color-mix(in srgb,var(--accent) 28%,transparent),transparent 70%),
  radial-gradient(48% 48% at 60% 92%,color-mix(in srgb,var(--primary) 20%,transparent),transparent 72%);filter:blur(12px)}
.grain{position:absolute;inset:0;pointer-events:none;z-index:0;opacity:.05;mix-blend-mode:overlay;background-image:${GRAIN};background-size:200px 200px}
.shape{position:absolute;pointer-events:none;z-index:0;opacity:.5}
.hairline{height:1px;width:100%;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--text) 22%,transparent),transparent);border:0}

/* ── Mock device / visual panels ──────────────────────── */
.panel{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--surface-alt);box-shadow:var(--sh-lg);overflow:hidden}
.panel-bar{display:flex;gap:.45rem;padding:.75rem .95rem;border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--text) 4%,var(--surface))}
.panel-dot{width:10px;height:10px;border-radius:50%;background:color-mix(in srgb,var(--text) 18%,transparent)}
.gradient-field{border-radius:var(--r-lg);background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 55%,var(--bg)),color-mix(in srgb,var(--accent) 45%,var(--bg)));position:relative;overflow:hidden}
.gradient-field::after{content:"";position:absolute;inset:0;background:${GRAIN};background-size:180px 180px;opacity:.12;mix-blend-mode:overlay}

/* ── Marquee ──────────────────────────────────────────── */
.marquee{display:flex;overflow:hidden;gap:0;-webkit-mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent);mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent)}
.marquee__track{display:flex;align-items:center;gap:clamp(2rem,5vw,4rem);flex:0 0 auto;padding-right:clamp(2rem,5vw,4rem);white-space:nowrap;animation:marquee 28s linear infinite;will-change:transform}
.marquee__item{font-family:var(--font-heading);font-weight:700;font-size:clamp(1.4rem,3vw,2.4rem);color:color-mix(in srgb,var(--text) 55%,transparent)}
@keyframes marquee{to{transform:translateX(-50%)}}

/* ── Scroll progress ──────────────────────────────────── */
.scroll-progress{position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,var(--primary),var(--accent));z-index:100;transition:width .08s linear}

/* ── Motion (screenshot-safe: everything resets on .in) ── */
.reveal{opacity:0;transform:translateY(30px);transition:opacity .85s var(--ease),transform .85s var(--ease),filter .85s var(--ease),clip-path .95s var(--ease);will-change:opacity,transform}
.reveal.rv-left{transform:translateX(-46px)}
.reveal.rv-right{transform:translateX(46px)}
.reveal.rv-scale{transform:scale(.9)}
.reveal.rv-blur{filter:blur(18px)}
.reveal.rv-mask{clip-path:inset(0 100% 0 0);transform:none}
.reveal.in{opacity:1;transform:none;filter:none;clip-path:inset(0 0 0 0)}
.stagger>.reveal:nth-child(1){transition-delay:.04s}
.stagger>.reveal:nth-child(2){transition-delay:.12s}
.stagger>.reveal:nth-child(3){transition-delay:.2s}
.stagger>.reveal:nth-child(4){transition-delay:.28s}
.stagger>.reveal:nth-child(5){transition-delay:.36s}
.stagger>.reveal:nth-child(6){transition-delay:.44s}

/* ── Responsive ───────────────────────────────────────── */
@media(max-width:960px){.grid-2,.grid-3,.grid-4{grid-template-columns:1fr}.split{grid-template-columns:1fr!important}}
@media(prefers-reduced-motion:reduce){
  .reveal{opacity:1!important;transform:none!important;filter:none!important;clip-path:none!important;transition:none!important}
  .marquee__track{animation:none}
  html{scroll-behavior:auto}
}
`.trim();
}

/** Motion runtime injected into every generated page. Screenshot-safe: the reveal
 *  failsafe (browser.ts) forces `.in` + finalizes counters before capture. */
export const MOTION_SCRIPT = `<script>
(function(){
  var reduce=false;try{reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;}catch(_){}
  // Scroll reveals
  try{
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}})},{threshold:.12,rootMargin:'0px 0px -8% 0px'});
    document.querySelectorAll('.reveal').forEach(function(el){io.observe(el);});
  }catch(_){document.querySelectorAll('.reveal').forEach(function(el){el.classList.add('in');});}
  // Count-up numbers
  document.querySelectorAll('[data-countup]').forEach(function(el){
    var raw=el.getAttribute('data-countup');var target=parseFloat(raw)||0;var suf=el.getAttribute('data-suffix')||'';var pre=el.getAttribute('data-prefix')||'';var dec=((raw.split('.')[1]||'').length);
    if(reduce){el.textContent=pre+target.toFixed(dec)+suf;return;}
    var done=false;try{var io2=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting&&!done){done=true;var t0=null;function step(ts){if(!t0)t0=ts;var p=Math.min(1,(ts-t0)/1400);var v=target*(1-Math.pow(1-p,3));el.textContent=pre+v.toFixed(dec)+suf;if(p<1)requestAnimationFrame(step);}requestAnimationFrame(step);}});},{threshold:.4});io2.observe(el);}catch(_){el.textContent=pre+target.toFixed(dec)+suf;}
  });
  if(reduce)return;
  var parE=[].slice.call(document.querySelectorAll('[data-parallax]'));
  var prog=document.querySelector('.scroll-progress');
  function onScroll(){var y=window.pageYOffset||0;for(var i=0;i<parE.length;i++){var s=parseFloat(parE[i].getAttribute('data-parallax'))||0.2;parE[i].style.transform='translate3d(0,'+(y*s*-0.12)+'px,0)';}if(prog){var h=document.documentElement.scrollHeight-window.innerHeight;prog.style.width=(h>0?(y/h*100):0)+'%';}}
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
  try{
    if(matchMedia('(pointer:fine)').matches){
      var mouseE=[].slice.call(document.querySelectorAll('[data-mouse-parallax]'));
      if(mouseE.length){window.addEventListener('mousemove',function(e){var cx=e.clientX/window.innerWidth-0.5,cy=e.clientY/window.innerHeight-0.5;for(var i=0;i<mouseE.length;i++){var d=parseFloat(mouseE[i].getAttribute('data-mouse-parallax'))||18;mouseE[i].style.transform='translate3d('+(cx*d)+'px,'+(cy*d)+'px,0)';}});}
      document.querySelectorAll('[data-tilt]').forEach(function(el){el.style.transition='transform .2s var(--ease)';el.addEventListener('mousemove',function(e){var r=el.getBoundingClientRect();var px=(e.clientX-r.left)/r.width-0.5,py=(e.clientY-r.top)/r.height-0.5;el.style.transform='perspective(900px) rotateY('+(px*9)+'deg) rotateX('+(-py*9)+'deg)';});el.addEventListener('mouseleave',function(){el.style.transform='';});});
    }
  }catch(_){}
})();
</script>`;

// Concise reference given to the LLM so it uses the real class/attribute vocabulary.
export const CLASS_GUIDE = `LAYOUT: .container / .container-wide / .container-narrow, .section, .grid + .grid-2/3/4, .split (2-col grid you define), .card, .glass, .panel + .panel-bar + .panel-dot (device mock), .gradient-field (CSS image stand-in).
SCENE BACKGROUNDS (put on the <section>, alternate them): .scene + one of .scene--base / .scene--surface / .scene--tint / .scene--gradient / .scene--glow / .scene--contrast (bold light/dark flip). Wrap content so it sits above decor (decor is z-index:0, content auto z-index:1 via .scene-inner or .container).
SPACING RHYTHM (vary hard): .pace--tight / .pace--normal / .pace--airy / .pace--huge.
TYPE: .kicker (tiny label), .type-mega (giant), .type-display, .display/.h1/.h2/.h3, .lead, .stat-huge (oversized gradient number), .balance, .measure.
DEPTH DECOR (absolutely-positioned inside a .scene): .mesh, .grain, .orb.orb--primary/.orb--accent (blurred glow, set width/height/top/left inline), .shape, .hairline.
MOTION (no custom JS — the runtime is injected): add .reveal (+ optional .rv-left/.rv-right/.rv-scale/.rv-blur/.rv-mask) to anything that should animate in; wrap groups in .stagger for cascade. Decorative layers: data-parallax="0.3" (scroll), data-mouse-parallax="20", data-tilt. Numbers: <span data-countup="99.9" data-suffix="%">99.9%</span>. Add one <div class="scroll-progress"></div> and one .marquee>.marquee__track for a moving band.
BUTTONS: .btn.btn-primary / .btn.btn-ghost, .tag.`;
