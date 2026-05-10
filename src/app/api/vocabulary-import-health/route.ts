import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getVocabularyItems, getUsableVocabularyForDictation, getUsableVocabularyForMeaningQuiz, getUsableVocabularyForSynonyms } from "@/lib/vocabularyLoader";

export function GET() {
  const reportPath = path.join(process.cwd(), "data", "private", "vocabulary.import-report.json");
  const generatedPath = path.join(process.cwd(), "data", "private", "vocabulary.generated.json");
  const needsReviewPath = path.join(process.cwd(), "data", "private", "vocabulary.needs-review.json");
  const items = getVocabularyItems();
  const report = readJson(reportPath);
  const needsReview = readJson(needsReviewPath);

  return NextResponse.json({
    imported: fs.existsSync(generatedPath),
    report,
    totalVocabularyItems: items.length,
    usableForLoadout: items.filter((item) => item.word).length,
    usableForMeaningQuiz: getUsableVocabularyForMeaningQuiz().length,
    usableForDictation: getUsableVocabularyForDictation().length,
    usableForSynonymArena: getUsableVocabularyForSynonyms().length,
    needsReviewCount: Array.isArray(needsReview?.items) ? needsReview.items.length : report?.totalNeedsReview ?? 0,
    duplicateCount: report?.totalDuplicatesMerged ?? 0,
    lastImportedAt: report?.generatedAt ?? null,
  });
}

function readJson(filePath: string) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}
