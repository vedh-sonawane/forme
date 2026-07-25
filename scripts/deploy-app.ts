/** Deploy a project's generated application. Usage: npx tsx scripts/deploy-app.ts <nameFragment> */
import { db } from "../src/lib/db";
import { deployProject, refreshDeployments, listDeployments, deploymentVerification } from "../src/lib/services/deploy";

async function main() {
  const fragment = process.argv[2];
  if (!fragment) throw new Error("usage: deploy-app.ts <projectNameFragment>");

  const project = await db.project.findFirst({ where: { name: { contains: fragment } }, orderBy: { updatedAt: "desc" } });
  if (!project) throw new Error(`no project matching "${fragment}"`);
  console.log(`deploying ${project.name} (${project.id})`);

  const res = await deployProject(project.id);
  if ("error" in res) throw new Error(res.error);
  console.log(JSON.stringify(res));

  // Poll until Vercel finishes building AND the post-deploy health check has run.
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 10_000));
    await refreshDeployments(project.id);
    const [latest] = await listDeployments(project.id);
    console.log(`  [${i}] ${latest?.status}${latest?.error ? " — " + latest.error : ""}`);
    if (latest && !["queued", "building", "verifying"].includes(latest.status)) {
      const verification = deploymentVerification(latest.meta);
      for (const c of verification?.checks ?? []) {
        console.log(`    ${c.ok ? "ok  " : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
      }
      console.log(JSON.stringify({ status: latest.status, url: latest.url, error: latest.error }));
      if (latest.status !== "ready") process.exitCode = 1;
      break;
    }
  }
  await db.$disconnect();
}

main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
