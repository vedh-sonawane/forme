# FORME — AI Design Intelligence & Website Generation

FORME analyzes high-quality websites and screenshots, extracts their **Design DNA** (the reusable *principles*, not a copy), and uses that intelligence to generate or redesign websites that look **intentionally designed** — then improves them through a real render → visual-critique → fix loop.

Built to solve the core failure of AI website builders: technically-working but generic, repetitive, poorly-designed output.

---

## What actually works (end-to-end, tested)

| Workflow | Status |
|---|---|
| **Analyze a URL** → SSRF-safe render → screenshot → structure → **Design DNA** | ✅ working |
| **Upload screenshots** → vision analysis → **Design DNA** | ✅ working |
| **Design DNA profiles** (structured, ~30 fields) + library | ✅ working |
| **Idea → Design Direction → Design System** (real tokens) | ✅ working |
| **Generate a real, responsive website** — **art-directed** per brand (a Creative Blueprint picks the visual language — editorial / brutalist / swiss / luxury / nature / technical / cinematic … **never a default look**) then directed as a sequence of distinct scenes with **brand-proportional atmosphere** and one **signature moment** | ✅ working |
| **Render in a real browser** (Playwright) + live sandboxed preview | ✅ working |
| **Visual Critic** → multi-dimensional structured critique + fixes | ✅ working |
| **Improvement loop** with **regression detection + revert + version history** | ✅ working |
| **Feedback → PreferenceSignals** (design intelligence dataset foundation) | ✅ working |
| Reference library, collections, project workspace | ✅ working |
| **Redesign workflow** (original → proposed direction → redesigned, side by side) | ✅ working |
| **Auth (multi-user)** — email + password, server-side sessions, per-user data scoping | ✅ working |
| **AI Editor** — edit the site in plain English ("emerald palette", "add pricing", "sticky nav"); edits in place and saves a new version | ✅ working |
| **Version restore** — append-only rollback to any past version | ✅ working |
| **Export site** — `.zip` with the runnable `index.html` + Design DNA / system / version history | ✅ working |
| **AI attribution** — every direction / blueprint / version / edit / critique shows which model made it (Gemini · Mistral · OpenRouter · Mock) | ✅ working |
| **Application Blueprint** — full-stack plan (entities, relationships, pages, API, auth + roles, env, deployment, testing) before any code | ✅ working |
| **Export app** — the blueprint becomes a **real, runnable Next.js + Prisma app**: schema, working auth, CRUD pages + REST API, dashboard, your design tokens, and the generated site served at `/` | ✅ **verified: npm install + prisma + next build + runtime CRUD** |
| **File explorer** — browse the generated app's source in-app (tree + line-numbered viewer) | ✅ working |
| **One-click deploy to Vercel** — production deploy, live URL, status polling, build logs | ✅ **verified live: deployed app signs up, signs in and writes to Postgres** |

> **Deploying needs a hosted database.** Set `VERCEL_TOKEN` and `DEPLOY_DATABASE_URL` (a Postgres URL — Neon / Vercel Postgres / Supabase all have free tiers). The deployed copy is generated with the Postgres provider and its tables are created during the build. SQLite can't persist on serverless hosts, so FORME refuses to deploy without one rather than shipping an app whose sign-up silently fails. The `.zip` export stays SQLite for zero-setup local runs.

Every AI stage falls back through a **provider chain** (Gemini → Mistral → OpenRouter → clearly-marked mock), so a quota stall never breaks the app — and the UI always shows which provider actually produced each artifact.

---

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma + SQLite** (Postgres-compatible schema)
- **Google Gemini** (`@google/genai`) — vision + reasoning, via a swappable provider abstraction
- **Playwright** (Chromium) — isolated browser rendering & screenshots
- Local-disk object storage (abstracted for S3/Supabase later)

### Architecture highlights
- **Provider abstraction** (`src/lib/ai/`): `GeminiProvider` + `MockProvider`, a `structured()` helper (JSON + zod validation + repair-retry + graceful fallback), and **full AI-call logging** (`AiCall`: model, prompt version, tokens, latency, errors).
- **Versioned prompt registry** (`src/lib/prompts/registry.ts`) — named, versioned, injection-guarded prompts (`visual-critique-v1`, …).
- **Specialized agents** (`src/lib/agents/`): Requirement Analyst · Reference Analyst · DNA Extractor/Synthesizer · Design Director · Design System Generator · Website Architect · **Scene Director** · Code Generator · Visual Critic · Improvement Agent.
- **Art-directed pipeline**: idea → **Creative Blueprint** (art direction chosen for THIS brand — *not* defaulted to cinematic — plus emotional arc, motion language, `atmosphere` level, and one **signature moment**) → design system → **scene plan** (each scene carries composition, visual style, density, emotion, background, spacing pace & motion) → code generation. The generator adopts the art direction and keeps **atmosphere proportional** — a swiss/editorial brand gets zero glow/grain/orbs; a nature/luxury brand gets layered depth. No two briefs share a look.
- **Scene-based renderer** (`src/lib/generation/baseline.ts`) — a library of distinct scene renderers with a rich visual + **motion runtime** (`css.ts`: scene backgrounds, glow/mesh/grain depth, dramatic type, reveal variants, parallax, count-up, tilt, marquee — all screenshot-safe), all **gated by the brand's atmosphere**. It renders the blueprint deterministically as the fallback, so even the no-key path is art-directed and varied.
- **Security** (`src/lib/security/url-guard.ts`): SSRF guard (blocks localhost/private/link-local/metadata IPs, DNS-resolve check, redirect re-validation), untrusted content treated as data (never instructions), sandboxed iframes + CSP on served artifacts.

---

## Run it

```bash
# 1. Install deps (already done if node_modules exists)
npm install

# 2. Install the Chromium browser for rendering
npm run playwright:install

# 3. Create the database
npm run db:push

# 4. Configure env — copy and edit
#    cp .env.example .env   (a .env is already present)
#    Add a FREE Gemini key from https://aistudio.google.com/apikey
#    GEMINI_API_KEY="..."     (leave empty to run on the mock provider)

# 5. Start
npm run dev
# → http://localhost:3000
```

### First run
Open **http://localhost:3000** → **create an account** (email + password) → create a project → paste your idea → **Generate website**. It will produce a design direction, a design system, a real website, render it, and critique it. Use **Run improvement iteration** to evolve it; check **Versions** for history + scores.

> The **first account you register claims any pre-auth workspace data**, so an existing single-user database migrates to your new account automatically. Every account after that gets its own isolated workspace. Sign out from the user menu at the bottom of the sidebar.

Add references under **References** (URL or screenshot) to steer the design with real Design DNA.

---

## Environment variables

| Var | Purpose |
|---|---|
| `DATABASE_URL` | SQLite path (default `file:./dev.db`) |
| `AI_PROVIDER` | `gemini` or `mock` |
| `GEMINI_API_KEY` | Free key from Google AI Studio. Empty → auto-fallback to mock |
| `GEMINI_MODEL_PRO` | Vision+reasoning model (default `gemini-2.5-flash` — the strongest **free-tier-usable** model; `gemini-2.5-pro` is quota-blocked on free) |
| `GEMINI_MODEL_FLASH` | Fast-pass model |
| `STORAGE_DIR` | Where screenshots/renders are saved |
| `DISABLE_PLAYWRIGHT` | `1` to skip browser rendering (URL analysis degrades gracefully) |

> **Free-tier note:** Gemini's free tier rate-limits (HTTP 429) under rapid bursts. FORME retries with backoff and, if still limited, uses the clearly-marked fallback so nothing breaks. Spaced-out real usage gets real AI.

---

## Data model (15 tables)

`User · Project · Reference · ProjectReference · Collection · CollectionReference · WebsiteAnalysis · ScreenshotAnalysis · DesignDNAProfile · DesignDirection · DesignSystem · GeneratedWebsite · WebsiteVersion · Critique · ImprovementIteration · UserFeedback · PreferenceSignal · AiCall`

Designed so a future ranking / RL / preference-optimization system attaches to `PreferenceSignal` + `UserFeedback` + `Critique` without schema churn.

## Useful scripts
```bash
npm run db:studio   # browse the database
npm run build       # production build (prisma generate + next build)
```
