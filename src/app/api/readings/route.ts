import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import sampleReadings from "@/data/readings.sample.json";
import type { ReadingArticle } from "@/lib/types";

export const dynamic = "force-dynamic";

const sampleArticles = sampleReadings as ReadingArticle[];
const privateFile = path.join(process.cwd(), "data", "private", "reading-articles.generated.json");

function readPrivateArticles(): ReadingArticle[] {
  if (!fs.existsSync(privateFile)) return [];
  const payload = JSON.parse(fs.readFileSync(privateFile, "utf8"));
  const articles = Array.isArray(payload?.articles)
    ? payload.articles
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];
  return articles.filter(Boolean) as ReadingArticle[];
}

export function GET() {
  try {
    const privateArticles = readPrivateArticles();
    const articles = privateArticles.length ? privateArticles : sampleArticles;
    const source = privateArticles.length ? "private" : "sample";
    return NextResponse.json({
      source,
      metadata: { count: articles.length, source, generatedAt: new Date().toISOString() },
      articles,
    });
  } catch (error) {
    console.warn("Readings API failed; returning sample readings.", error);
    return NextResponse.json({
      source: "sample_fallback",
      metadata: { count: sampleArticles.length, source: "sample", note: "API fallback returned bundled sample readings." },
      articles: sampleArticles,
    });
  }
}
