import { NextResponse } from "next/server";
import { getScenarioReadingArticles, getScenarioReadingImportReport } from "@/lib/scenarioReadingLoader";

export function GET() {
  const report = getScenarioReadingImportReport();
  const articles = getScenarioReadingArticles();
  return NextResponse.json({
    source: report ? "private" : "sample",
    metadata: {
      count: articles.length,
      generatedAt: report?.generatedAt,
    },
    articles,
  });
}
