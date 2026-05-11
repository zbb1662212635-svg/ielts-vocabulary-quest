const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";

const endpoints = [
  "/api/app-health",
  "/api/vocabulary",
  "/api/dictation",
  "/api/reading-assets",
  "/api/readings",
  "/api/scenario-readings",
  "/api/today-mission",
  "/",
  "/mission",
  "/vocabulary",
  "/dictation",
  "/reading/dossier",
  "/learning-check",
];

let failed = 0;
for (const endpoint of endpoints) {
  const url = `${baseUrl}${endpoint}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      failed += 1;
      console.error(`${endpoint} -> HTTP ${response.status}`);
    } else {
      console.log(`${endpoint} -> OK`);
    }
  } catch (error) {
    failed += 1;
    console.error(`${endpoint} -> ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) {
  console.error(`${failed} smoke checks failed. Start the app first with: npm run dev`);
  process.exit(1);
}

console.log("HTTP smoke check passed.");
