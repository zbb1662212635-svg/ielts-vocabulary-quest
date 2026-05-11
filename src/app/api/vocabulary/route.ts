import { NextResponse } from "next/server";
import sampleVocabulary from "@/data/vocabulary.sample.json";
import { getVocabularyItems, getVocabularySource } from "@/lib/vocabularyLoader";
import type { VocabularyItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const sampleItems = sampleVocabulary as VocabularyItem[];

export async function GET() {
  try {
    const items = getVocabularyItems();
    const source = getVocabularySource();
    return NextResponse.json({
      source,
      metadata: { count: items.length, source, generatedAt: new Date().toISOString() },
      items: items.length ? items : sampleItems,
    });
  } catch (error) {
    console.warn("Vocabulary API failed; returning sample vocabulary.", error);
    return NextResponse.json({
      source: "sample_fallback",
      metadata: { count: sampleItems.length, source: "sample", note: "API fallback returned bundled sample vocabulary." },
      items: sampleItems,
    });
  }
}
