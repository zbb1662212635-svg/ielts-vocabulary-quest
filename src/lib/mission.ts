import vocabulary from "@/data/vocabulary.sample.json";
import synonyms from "@/data/synonyms.sample.json";
import listening from "@/data/listening-survival.sample.json";
import { DEFAULT_SETTINGS } from "./settings";
import type { AppSettings, DailyMission, UserProgress, VocabularyItem } from "./types";
import { isDictationUsable, isWordEncounterUsable } from "./vocabularyHealth";

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function generateDailyMission(
  progress: Record<string, UserProgress>,
  reviewWordIds: string[] = [],
  vocabularyItems: VocabularyItem[] = vocabulary as VocabularyItem[],
  settings: AppSettings = DEFAULT_SETTINGS,
): DailyMission {
  const missionSettings = settings.dailyMission;
  const minutes = settings.studyGoal.dailyStudyMinutes;
  const wordEncounterWords = vocabularyItems.filter(isWordEncounterUsable);
  const newWordIds = wordEncounterWords
    .filter((item) => !progress[item.id] || progress[item.id].mastery < 40)
    .slice(0, missionSettings.newWordsPerDay)
    .map((item) => item.id);
  const fallbackNewWordIds = wordEncounterWords
    .slice(0, missionSettings.newWordsPerDay)
    .map((item) => item.id);
  const privateDictationIds = vocabularyItems
    .filter(isDictationUsable)
    .slice(0, missionSettings.dictationItemsPerDay)
    .map((item) => item.id);

  return {
    id: `mission_${todayKey()}`,
    date: todayKey(),
    title: `${minutes} 分钟雅思听读词汇任务`,
    estimatedMinutes: minutes,
    newWordIds: newWordIds.length ? newWordIds : fallbackNewWordIds,
    synonymPairIds: synonyms.slice(0, missionSettings.synonymBattlesPerDay).map((item) => item.id),
    dictationWordIds: privateDictationIds.length
      ? privateDictationIds
      : listening.slice(0, missionSettings.dictationItemsPerDay).map((item) => item.id),
    reviewWordIds: reviewWordIds.slice(0, missionSettings.reviewLimitPerDay),
    completed: false,
  };
}
