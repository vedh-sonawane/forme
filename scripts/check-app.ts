/**
 * Health check for a generated FORME application — the same check the deploy flow runs
 * automatically, exposed for ad-hoc use against a local build or any live URL.
 *
 *   npm run check:app -- http://localhost:3000
 *   npm run check:app -- https://your-app.vercel.app
 *
 * Exits non-zero if any check fails.
 */
import { db } from "../src/lib/db";
import { verifyDeployedApp, summarize, type HealthcheckAccount } from "../src/lib/verify/deployment";

/**
 * Reuse the account the deploy flow recorded for this URL. Inventing a second password
 * for the same address would just fail to sign in — the account already exists.
 */
async function accountFor(url: string): Promise<HealthcheckAccount> {
  const host = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const rows = await db.deployment
    .findMany({ where: { url: { contains: host } }, orderBy: { createdAt: "desc" }, take: 20 })
    .catch(() => []);
  for (const d of rows) {
    try {
      const stored = JSON.parse(d.meta || "{}")?.healthcheck;
      if (stored?.email && stored?.password) return stored as HealthcheckAccount;
    } catch {
      /* unreadable meta — fall through */
    }
  }
  // No recorded account (a local build, or a URL FORME didn't deploy): derive one from
  // the hostname, ignoring the port — the same app served on :3000 and :3001 shares a
  // database, so a port-sensitive password could never sign in to it.
  const name = host.replace(/:\d+$/, "");
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  return { email: "forme-healthcheck@example.com", password: "fmchk-" + Math.abs(h).toString(36) };
}

async function main() {
  const url = process.argv[2];
  if (!url) throw new Error("usage: check:app -- <url>");

  console.log(`\nChecking ${url}\n`);
  const report = await verifyDeployedApp(url, await accountFor(url));

  if (report.skipped) {
    console.log(`Skipped: ${report.skipped}\n`);
    process.exit(0);
  }
  for (const c of report.checks) {
    const tag = c.ok ? "  ok  " : c.severity === "warning" ? " warn " : " FAIL ";
    console.log(`${tag} ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  }
  console.log(`\n${summarize(report)}\n`);
  await db.$disconnect().catch(() => {});
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
