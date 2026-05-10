import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sampleVocabulary from "@/data/vocabulary.sample.json";
import type { VocabularyItem } from "@/lib/types";
import { normalizeVocabulary } from "@/lib/vocabularyHealth";

type PrivatePayload = {
  metadata?: {
    count?: number;
    source?: string;
    note?: string;
  };
  items?: VocabularyItem[];
};

export async function GET() {
  const requestedSource = process.env.VOCAB_SOURCE === "private" ? "private" : "sample";
  const privatePath = join(process.cwd(), "data", "private", "vocabulary.generated.json");

  if (requestedSource === "private" && existsSync(privatePath)) {
    const payload = JSON.parse(readFileSync(privatePath, "utf8")) as PrivatePayload;
    const items = normalizeVocabulary(payload.items ?? []);
    return NextResponse.json({
      source: "private",
      metadata: { ...(payload.metadata ?? {}), count: items.length },
      items,
    });
  }

  const items = normalizeVocabulary(sampleVocabulary as VocabularyItem[]);
  return NextResponse.json({
    source: requestedSource === "private" ? "sample_fallback" : "sample",
    metadata: {
      count: items.length,
      source: "sample",
    },
    items,
  });
}
