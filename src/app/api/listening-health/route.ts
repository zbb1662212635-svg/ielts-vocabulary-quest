import { NextResponse } from "next/server";
import { getAudioImportReport, getAudioTracks, getDictationItems, getTranscripts } from "@/lib/audioLoader";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const audioTracks = getAudioTracks();
    const transcripts = getTranscripts();
    const dictationItems = getDictationItems();
    const report = getAudioImportReport();
    const matchedPairs = audioTracks.filter((track) => Boolean(track.matchedTranscriptId)).length;
    const needsReview = dictationItems.filter((item) => item.status === "needs_review").length;

    return NextResponse.json({
      imported: audioTracks.length > 0 || transcripts.length > 0,
      audioTracks: audioTracks.length,
      transcripts: transcripts.length,
      matchedPairs,
      unmatchedAudio: Math.max(audioTracks.length - matchedPairs, 0),
      unmatchedTranscripts: transcripts.filter((transcript) => !transcript.matchedAudioId).length,
      dictationItems: dictationItems.length,
      needsReview,
      sampleFallbackActive: dictationItems.some((item) => item.source === "sample"),
      lastImportedAt: typeof report?.generatedAt === "string" ? report.generatedAt : null,
    });
  } catch (error) {
    console.warn("Listening health failed.", error);
    return NextResponse.json({
      imported: false,
      audioTracks: 0,
      transcripts: 0,
      matchedPairs: 0,
      unmatchedAudio: 0,
      unmatchedTranscripts: 0,
      dictationItems: 0,
      needsReview: 0,
      sampleFallbackActive: true,
      lastImportedAt: null,
      error: "listening_health_failed",
    });
  }
}
