import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAudioImportReport, getAudioTracks, getDictationItems, getTranscripts } from "@/lib/audioLoader";

export function GET() {
  const report = getAudioImportReport();
  const needsReviewPath = path.join(process.cwd(), "data", "private", "audio.needs-review.json");
  let needsReview = 0;
  if (fs.existsSync(needsReviewPath)) {
    try {
      const payload = JSON.parse(fs.readFileSync(needsReviewPath, "utf8")) as { totalItems?: number; items?: unknown[] };
      needsReview = payload.totalItems ?? payload.items?.length ?? 0;
    } catch {
      needsReview = 0;
    }
  }

  const audio = getAudioTracks();
  const transcripts = getTranscripts();
  const dictation = getDictationItems();

  return NextResponse.json({
    imported: Boolean(report),
    report,
    audioTracks: audio.length,
    transcripts: transcripts.length,
    matchedPairs: audio.filter((item) => item.matchedTranscriptId).length,
    unmatchedAudio: audio.filter((item) => !item.matchedTranscriptId).length,
    unmatchedTranscripts: transcripts.filter((item) => !item.matchedAudioId).length,
    dictationItems: dictation.length,
    needsReview,
    lastImportedAt: report?.generatedAt ?? null,
  });
}
