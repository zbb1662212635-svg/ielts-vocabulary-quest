import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getIELTSReadingQuestions, getReadingImportReport, getReadingPassages } from "@/lib/readingAssetLoader";

export function GET() {
  const report = getReadingImportReport();
  const needsReviewPath = path.join(process.cwd(), "data", "private", "reading.needs-review.json");
  let needsReview = 0;
  if (fs.existsSync(needsReviewPath)) {
    try {
      const payload = JSON.parse(fs.readFileSync(needsReviewPath, "utf8")) as { totalItems?: number; items?: unknown[] };
      needsReview = payload.totalItems ?? payload.items?.length ?? 0;
    } catch {
      needsReview = 0;
    }
  }

  const passages = getReadingPassages();
  const questions = getIELTSReadingQuestions();

  return NextResponse.json({
    imported: Boolean(report),
    report,
    passages: passages.length,
    questions: questions.length,
    readyQuestions: questions.filter((item) => item.status === "ready").length,
    questionsWithAnswers: questions.filter((item) => item.correctAnswer).length,
    questionsWithEvidence: questions.filter((item) => item.evidenceText).length,
    questionsNeedingReview: questions.filter((item) => item.status === "needs_review").length,
    needsReview,
    lastImportedAt: report?.generatedAt ?? null,
  });
}
