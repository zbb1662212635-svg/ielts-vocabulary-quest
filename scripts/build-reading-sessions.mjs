import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const privateDataRoot = join(process.cwd(), "data", "private");
const generatedPath = join(privateDataRoot, "readings.generated.json");
mkdirSync(privateDataRoot, { recursive: true });

if (!existsSync(generatedPath)) {
  writeFileSync(
    generatedPath,
    JSON.stringify(
      {
        metadata: {
          source: "empty",
          generatedAt: new Date().toISOString(),
          count: 0,
          note: "Run npm run crawl:readings first, or use sample readings in the app.",
        },
        articles: [],
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(`[OK] Created empty private readings file: ${generatedPath}`);
  process.exit(0);
}

const payload = JSON.parse(readFileSync(generatedPath, "utf8"));
const articles = Array.isArray(payload.articles) ? payload.articles : [];
const normalized = articles
  .filter((article) => article.id && article.title && Array.isArray(article.paragraphs))
  .map((article) => ({
    ...article,
    readingStatus: article.readingStatus ?? "not_started",
    importedAt: article.importedAt ?? new Date().toISOString(),
    questions: Array.isArray(article.questions) ? article.questions.filter((question) => question.evidenceText) : [],
  }));

writeFileSync(
  generatedPath,
  JSON.stringify(
    {
      metadata: {
        ...(payload.metadata ?? {}),
        generatedAt: new Date().toISOString(),
        count: normalized.length,
      },
      articles: normalized,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log(`[OK] Reading sessions normalized: ${normalized.length}`);
console.log(`Output: ${generatedPath}`);
