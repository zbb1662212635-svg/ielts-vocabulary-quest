import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sampleReadings from "@/data/readings.sample.json";
import type { ReadingArticle } from "@/lib/types";

type PrivateReadingsPayload = {
  metadata?: {
    count?: number;
    source?: string;
    generatedAt?: string;
  };
  articles?: ReadingArticle[];
};

export async function GET() {
  const usePrivateReadings = process.env.NEXT_PUBLIC_USE_PRIVATE_READINGS === "true";
  const privatePath = join(process.cwd(), "data", "private", "readings.generated.json");

  if (usePrivateReadings && existsSync(privatePath)) {
    const payload = JSON.parse(readFileSync(privatePath, "utf8")) as PrivateReadingsPayload;
    const articles = payload.articles ?? [];
    return NextResponse.json({
      source: "private",
      metadata: { ...(payload.metadata ?? {}), count: articles.length },
      articles,
    });
  }

  const articles = sampleReadings as ReadingArticle[];
  return NextResponse.json({
    source: usePrivateReadings ? "sample_fallback" : "sample",
    metadata: { count: articles.length, source: "sample" },
    articles,
  });
}
