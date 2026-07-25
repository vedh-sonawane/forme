import type { ApplicationBlueprint, DesignSystem } from "@/lib/design/schema";
import type { ProjectFile } from "./types";

// Static-ish project scaffold: package/config files, design tokens, root layout, db client.
// Dependency versions intentionally match FORME's own so `npm install` resolves fast
// from cache and the generated app builds on the exact stack we verify against.

export function scaffoldFiles(input: {
  appName: string;
  slug: string;
  bp: ApplicationBlueprint;
  system: DesignSystem;
  authRequired: boolean;
  navLinks: { href: string; label: string }[];
}): ProjectFile[] {
  const { appName, slug, bp, system, authRequired, navLinks } = input;
  const c = system.colors;
  const t = system.typography;

  const files: ProjectFile[] = [];

  files.push({
    path: "package.json",
    content: JSON.stringify(
      {
        name: slug,
        version: "0.1.0",
        private: true,
        scripts: {
          dev: "next dev",
          // `db push` during build creates the tables on the deployment target —
          // without it a hosted app builds fine but every query fails at runtime.
          build: "prisma generate && prisma db push && next build",
          start: "next start",
          "db:push": "prisma db push",
          "db:studio": "prisma studio",
          postinstall: "prisma generate",
        },
        // Exact pins: generated apps ship without a lockfile, and caret ranges let
        // react / react-dom drift to different patches (react-dom requires an exact
        // matching react), which breaks `npm install` with ERESOLVE.
        // Next is pinned to a PATCHED 15.x — Vercel refuses to build versions with
        // known CVEs ("Vulnerable version of Next.js detected").
        dependencies: {
          "@prisma/client": "6.19.3",
          next: "15.5.21",
          react: "19.2.8",
          "react-dom": "19.2.8",
        },
        devDependencies: {
          "@types/node": "^22.13.1",
          "@types/react": "^19.0.8",
          "@types/react-dom": "^19.0.3",
          autoprefixer: "^10.4.20",
          postcss: "^8.5.1",
          prisma: "6.19.3",
          tailwindcss: "^3.4.17",
          typescript: "^5.7.3",
        },
      },
      null,
      2
    ),
  });

  files.push({
    path: "tsconfig.json",
    content: JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./src/*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2
    ),
  });

  files.push({ path: "next.config.mjs", content: `/** @type {import('next').NextConfig} */\nconst nextConfig = {};\nexport default nextConfig;\n` });
  files.push({ path: "postcss.config.mjs", content: `const config = { plugins: { tailwindcss: {}, autoprefixer: {} } };\nexport default config;\n` });

  files.push({
    path: "tailwind.config.ts",
    content: `import type { Config } from "tailwindcss";

const withAlpha = (v: string) => \`color-mix(in srgb, var(\${v}) calc(<alpha-value> * 100%), transparent)\`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: withAlpha("--bg"),
        surface: withAlpha("--surface"),
        "surface-alt": withAlpha("--surface-alt"),
        border: withAlpha("--border"),
        muted: withAlpha("--text-muted"),
        fg: withAlpha("--text"),
        primary: withAlpha("--primary"),
        "primary-fg": withAlpha("--primary-text"),
        accent: withAlpha("--accent"),
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-heading)", "var(--font-body)", "sans-serif"],
      },
      borderRadius: { xl: "var(--r-md)", "2xl": "var(--r-lg)" },
    },
  },
  plugins: [],
};

export default config;
`,
  });

  files.push({
    path: ".gitignore",
    content: ["node_modules/", ".next/", "out/", "build/", "*.log", ".env", ".env*.local", "prisma/dev.db", "prisma/dev.db-journal", "next-env.d.ts", "*.tsbuildinfo", ".DS_Store", ""].join("\n"),
  });

  const envVars = Array.from(new Set(["DATABASE_URL", ...(authRequired ? ["AUTH_SECRET"] : []), ...(bp.env_vars ?? [])]));
  files.push({
    path: ".env.example",
    content:
      envVars
        .map((v) => {
          if (v === "DATABASE_URL") return `# SQLite for local dev. Swap to a Postgres URL for production.\nDATABASE_URL="file:./dev.db"`;
          if (v === "AUTH_SECRET") return `# Any long random string.\nAUTH_SECRET="change-me-to-a-long-random-string"`;
          return `${v}=""`;
        })
        .join("\n\n") + "\n",
  });

  const navJsx = navLinks.map((l) => `            <Link href=${JSON.stringify(l.href)} className="text-sm text-muted transition hover:text-fg">${l.label}</Link>`).join("\n");

  files.push({
    path: "src/lib/db.ts",
    content: `import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
`,
  });

  return files;
}

export function readmeFile(input: { appName: string; bp: ApplicationBlueprint; authRequired: boolean; entityRoutes: { label: string; href: string }[] }): ProjectFile {
  const { appName, bp, authRequired, entityRoutes } = input;
  return {
    path: "README.md",
    content: `# ${appName}

${bp.summary || ""}

Generated by **FORME** from the Application Blueprint — a real, runnable Next.js application.

## Run it

\`\`\`bash
npm install
cp .env.example .env      # SQLite by default; nothing else to configure
npm run db:push           # create the database
npm run dev               # http://localhost:3000
\`\`\`

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma** ORM — SQLite for local dev (swap the datasource for Postgres in production)
${authRequired ? "- **Authentication** — email + password, scrypt hashing, server-side sessions in an httpOnly cookie" : "- No authentication (this app doesn't require accounts)"}

## What's inside

- \`/\` — the marketing page generated by FORME (its design, verbatim)
${authRequired ? "- `/login`, `/register` — working authentication\n- `/dashboard` — authenticated home (protected)" : "- `/dashboard` — app home"}
${entityRoutes.map((e) => `- \`${e.href}\` — ${e.label} (list + create + delete, backed by the database)`).join("\n")}
- \`src/app/api/*\` — REST route handlers backed by Prisma

## Data model

${(bp.entities ?? []).map((e) => `- **${e.name}** — ${e.description || ""}`).join("\n")}

## Deployment

${bp.deployment || "Deploy to Vercel (or any Node host). Set DATABASE_URL to a managed Postgres URL and change the Prisma datasource provider to `postgresql`."}

## Environment variables

${(bp.env_vars ?? ["DATABASE_URL"]).map((v) => `- \`${v}\``).join("\n")}
`,
  };
}
