/**
 * Materialise a project's generated application to a directory, exactly as export/deploy
 * would. Usage: npx tsx scripts/build-app.ts <projectNameFragment> <outDir> [--redesign]
 */
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { dirname, join } from "path";
import { db } from "../src/lib/db";
import { buildProjectApp } from "../src/lib/services/export";

const [fragment, outDir] = process.argv.slice(2);
const redesign = process.argv.includes("--redesign");
if (!fragment || !outDir) throw new Error("usage: build-app.ts <projectNameFragment> <outDir> [--redesign]");

async function main() {
const project = await db.project.findFirst({
  where: { name: { contains: fragment } },
  orderBy: { updatedAt: "desc" },
});
if (!project) throw new Error(`no project matching "${fragment}"`);
console.error(`project: ${project.name} (${project.id})  cachedDesign=${project.appDesign ? "yes" : "no"}`);

const built = await buildProjectApp(project.id, { redesign });
if ("error" in built) throw new Error(built.error);

rmSync(join(outDir, "src"), { recursive: true, force: true });
for (const f of built.files) {
  const p = join(outDir, f.path);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, f.content);
}
console.error(`wrote ${built.files.length} files to ${outDir}`);
console.log(JSON.stringify({ id: project.id, name: project.name, slug: built.slug, files: built.files.length }));
await db.$disconnect();
}

main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
