import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  getScenarioExpressions,
  getScenarioPrompts,
  getScenarioReadingArticles,
  getScenarioReadingImportReport,
  getScenarioSentences,
  getScenarioVocabulary,
} from "@/lib/scenarioReadingLoader";

export function GET() {
  const report = getScenarioReadingImportReport();
  const articles = getScenarioReadingArticles();
  const needsReviewPath = path.join(process.cwd(), "data", "private", "scenario-reading.needs-review.json");
  let needsReview = 0;
  if (fs.existsSync(needsReviewPath)) {
    try {
      const payload = JSON.parse(fs.readFileSync(needsReviewPath, "utf8")) as { totalItems?: number; items?: unknown[] };
      needsReview = payload.totalItems ?? payload.items?.length ?? 0;
    } catch {
      needsReview = 0;
    }
  }

  return NextResponse.json({
    imported: Boolean(report),
    report,
    articles: articles.length,
    readyArticles: articles.filter((item) => item.status === "ready").length,
    articlesNeedingReview: articles.filter((item) => item.status === "needs_review").length,
    keyVocabulary: getScenarioVocabulary().length || articles.reduce((sum, item) => sum + item.keyVocabulary.length, 0),
    usefulExpressions: getScenarioExpressions().length || articles.reduce((sum, item) => sum + item.usefulExpressions.length, 0),
    difficultSentences: getScenarioSentences().length || articles.reduce((sum, item) => sum + item.difficultSentences.length, 0),
    scenarioPrompts: getScenarioPrompts().length || articles.reduce((sum, item) => sum + item.readingPrompts.length, 0),
    needsReview,
    lastImportedAt: report?.generatedAt ?? null,
  });
}
