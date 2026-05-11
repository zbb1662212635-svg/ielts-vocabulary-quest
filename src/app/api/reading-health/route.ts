import { NextResponse } from "next/server";
import {
  getIELTSReadingQuestions,
  getReadingAssetSource,
  getReadingImportReport,
  getReadingPassages,
} from "@/lib/readingAssetLoader";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const passages = getReadingPassages();
    const questions = getIELTSReadingQuestions();
    const report = getReadingImportReport();
    const source = getReadingAssetSource();
    const readyQuestions = questions.filter((question) => question.status === "ready").length;
    const questionsWithAnswers = questions.filter((question) => Boolean(question.correctAnswer)).length;
    const questionsWithEvidence = questions.filter((question) => Boolean(question.evidenceText)).length;
    const questionsNeedingReview = questions.filter((question) => question.status === "needs_review").length;

    return NextResponse.json({
      imported: source === "private",
      source,
      sampleFallbackActive: source === "sample",
      passages: passages.length,
      questions: questions.length,
      readyQuestions,
      questionsWithAnswers,
      questionsWithEvidence,
      questionsNeedingReview,
      needsReview: questionsNeedingReview + passages.filter((passage) => passage.status === "needs_review").length,
      lastImportedAt: typeof report?.generatedAt === "string" ? report.generatedAt : null,
    });
  } catch (error) {
    console.warn("Reading health failed.", error);
    return NextResponse.json({
      imported: false,
      source: "sample_fallback",
      sampleFallbackActive: true,
      passages: 0,
      questions: 0,
      readyQuestions: 0,
      questionsWithAnswers: 0,
      questionsWithEvidence: 0,
      questionsNeedingReview: 0,
      needsReview: 0,
      lastImportedAt: null,
      error: "reading_health_failed",
    });
  }
}
