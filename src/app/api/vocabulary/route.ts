import { NextResponse } from "next/server";
import { getVocabularyItems, getVocabularySource } from "@/lib/vocabularyLoader";

export async function GET() {
  const items = getVocabularyItems();
  const source = getVocabularySource();
  return NextResponse.json({
    source,
    metadata: {
      count: items.length,
      source,
    },
    items,
  });
}
