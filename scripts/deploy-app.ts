/** Deploy a project's generated application. Usage: npx tsx scripts/deploy-app.ts <nameFragment> */
import { db } from "../src/lib/db";
import { deployProject, refreshDeployments, listDeployments } from "../src/lib/services/deploy";

async function main() {
  const fragment = process.argv[2];
  if (!fragment) throw new Error("usage: deploy-app.ts <projectNameFragment>");

  const project = await db.project.findFirst({ where: { name: { contains: fragment } }, orderBy: { updatedAt: "desc" } });
  if (!project) throw new Error(`no project matching "${fragment}"`);
  console.log(`deploying ${project.name} (${project.id})`);

  const res = await deployProject(project.id);
  if ("error" in res) throw new Error(res.error);
  console.log(JSON.stringify(res));

  // Poll until Vercel finishes building.
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 10_000));
    await refreshDeployments(project.id);
    const [latest] = await listDeployments(project.id);
    console.log(`  [${i}] ${latest?.status}${latest?.error ? " — " + latest.error : ""}`);
    if (latest && !["queued", "building"].includes(latest.status)) {
      console.log(JSON.stringify({ status: latest.status, url: latest.url, error: latest.error }));
      break;
    }
  }
  await db.$disconnect();
}

main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
