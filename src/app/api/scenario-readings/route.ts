import { NextResponse } from "next/server";
import { sampleScenarioReadings } from "@/data/scenario-readings.sample";
import { getScenarioReadingArticles } from "@/lib/scenarioReadingLoader";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const articles = getScenarioReadingArticles();
    const source = articles.length && articles !== sampleScenarioReadings ? "private" : "sample";
    return NextResponse.json({
      source,
      metadata: { count: articles.length, generatedAt: new Date().toISOString() },
      articles: articles.length ? articles : sampleScenarioReadings,
    });
  } catch (error) {
    console.warn("Scenario readings API failed; returning sample scenario readings.", error);
    return NextResponse.json({
      source: "sample_fallback",
      metadata: { count: sampleScenarioReadings.length, note: "API fallback returned bundled scenario readings." },
      articles: sampleScenarioReadings,
    });
  }
}
