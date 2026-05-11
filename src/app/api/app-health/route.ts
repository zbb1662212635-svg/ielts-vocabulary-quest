import { NextResponse } from "next/server";
import { getDictationItems } from "@/lib/audioLoader";
import { generateTodayMission } from "@/lib/missionEngine";
import { getIELTSReadingQuestions, getReadingPassages } from "@/lib/readingAssetLoader";
import { getScenarioReadingArticles } from "@/lib/scenarioReadingLoader";
import { getVocabularyItems } from "@/lib/vocabularyLoader";

export const dynamic = "force-dynamic";

type Check = {
  key: string;
  label: string;
  ok: boolean;
  count?: number;
  error?: string;
};

function countCheck<T>(key: string, label: string, getter: () => T[], minimum = 1): Check {
  try {
    const items = getter();
    return { key, label, ok: items.length >= minimum, count: items.length };
  } catch (error) {
    return { key, label, ok: false, count: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

export function GET() {
  const checks: Check[] = [
    countCheck("vocabulary", "Vocabulary items", getVocabularyItems),
    countCheck("dictation", "Dictation items", getDictationItems),
    countCheck("reading_passages", "Reading passages", getReadingPassages),
    countCheck("reading_questions", "Reading questions", getIELTSReadingQuestions),
    countCheck("scenario_readings", "Scenario reading articles", getScenarioReadingArticles),
  ];

  try {
    const result = generateTodayMission({ dailyMinutes: 25, includeReview: true, includeScenarioReading: true });
    checks.push({
      key: "mission",
      label: "Generated mission",
      ok: Boolean(result.mission?.stages?.length && result.mission?.vocabularyLoadout?.length),
      count: result.mission?.stages?.length ?? 0,
    });
  } catch (error) {
    checks.push({
      key: "mission",
      label: "Generated mission",
      ok: false,
      count: 0,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return NextResponse.json({
    ok: checks.every((check) => check.ok),
    generatedAt: new Date().toISOString(),
    checks,
    routes: [
      "/",
      "/mission",
      "/vocabulary",
      "/synonym-arena",
      "/dictation",
      "/listening/studio",
      "/reading/dossier",
      "/reading/passages",
      "/reading/questions",
      "/reading-lab",
      "/review",
      "/settings",
    ],
  });
}
