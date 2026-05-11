import { NextResponse } from "next/server";
import {
  getIELTSReadingQuestions,
  getReadingAnswerKeys,
  getReadingAssetSource,
  getReadingPassages,
} from "@/lib/readingAssetLoader";
import { getSampleIELTSReadingQuestions, getSampleReadingAnswerKeys, getSampleReadingPassages } from "@/lib/sampleReadingAssets";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const passages = getReadingPassages();
    const questions = getIELTSReadingQuestions();
    const answerKeys = getReadingAnswerKeys();
    const source = getReadingAssetSource();

    return NextResponse.json({
      source,
      metadata: {
        passages: passages.length,
        questions: questions.length,
        answerKeys: answerKeys.length,
        generatedAt: new Date().toISOString(),
      },
      passages,
      questions,
      answerKeys,
    });
  } catch (error) {
    console.warn("Reading assets API failed; returning sample assets.", error);
    const passages = getSampleReadingPassages();
    const questions = getSampleIELTSReadingQuestions();
    const answerKeys = getSampleReadingAnswerKeys();
    return NextResponse.json({
      source: "sample_fallback",
      metadata: {
        passages: passages.length,
        questions: questions.length,
        answerKeys: answerKeys.length,
        note: "API fallback returned bundled sample reading assets.",
        generatedAt: new Date().toISOString(),
      },
      passages,
      questions,
      answerKeys,
    });
  }
}
