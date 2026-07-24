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
| **Generate a real, responsive website** (real HTML/CSS, semantic, animated) | ✅ working |
| **Render in a real browser** (Playwright) + live sandboxed preview | ✅ working |
| **Visual Critic** → multi-dimensional structured critique + fixes | ✅ working |
| **Improvement loop** with **regression detection + revert + version history** | ✅ working |
| **Feedback → PreferenceSignals** (design intelligence dataset foundation) | ✅ working |
| Reference library, collections, project workspace | ✅ working |
| **Redesign workflow** (original → proposed direction → redesigned, side by side) | ✅ working |
| **Auth (multi-user)** — email + password, server-side sessions, per-user data scoping | ✅ working |

Every AI stage falls back to a **clearly-marked development provider** if the model errors or the free-tier quota is hit, so the app is never broken.

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
- **Specialized agents** (`src/lib/agents/`): Requirement Analyst · Reference Analyst · DNA Extractor/Synthesizer · Design Director · Design System Generator · Website Architect · Code Generator · Visual Critic · Improvement Agent.
- **Deterministic baseline renderer** (`src/lib/generation/baseline.ts`) — a guaranteed-valid, high-quality site that anchors the LLM output and serves as the fallback.
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
