import { NextResponse } from "next/server";
import { getIELTSReadingQuestions, getReadingAnswerKeys, getReadingPassages } from "@/lib/readingAssetLoader";

export function GET() {
  return NextResponse.json({
    passages: getReadingPassages(),
    questions: getIELTSReadingQuestions(),
    answerKeys: getReadingAnswerKeys(),
  });
}
