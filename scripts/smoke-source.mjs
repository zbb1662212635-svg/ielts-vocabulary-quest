import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "src/app/page.tsx",
  "src/app/mission/page.tsx",
  "src/app/vocabulary/page.tsx",
  "src/app/synonym-arena/page.tsx",
  "src/app/dictation/page.tsx",
  "src/app/listening/studio/page.tsx",
  "src/app/reading/dossier/page.tsx",
  "src/app/reading/passages/page.tsx",
  "src/app/reading/questions/page.tsx",
  "src/app/reading-lab/page.tsx",
  "src/app/review/page.tsx",
  "src/app/settings/page.tsx",
  "src/app/learning-check/page.tsx",
  "src/app/api/app-health/route.ts",
  "src/lib/sampleReadingAssets.ts",
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error("Missing required files:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
for (const script of ["build", "lint", "smoke:source", "smoke:http", "verify"]) {
  if (!pkg.scripts?.[script]) {
    console.error(`Missing package script: ${script}`);
    process.exit(1);
  }
}

console.log("Source smoke check passed.");
