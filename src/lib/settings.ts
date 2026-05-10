import type { AppSettings } from "./types";

export const SETTINGS_KEY = "ielts-vocabulary-quest:settings";

export const DEFAULT_SETTINGS: AppSettings = {
  studyGoal: {
    examType: "Academic",
    targetListeningBand: "7.0",
    targetReadingBand: "7.0",
    currentListeningBand: "6.0",
    currentReadingBand: "6.0",
    examDate: "",
    dailyStudyMinutes: 25,
    weakAreas: ["wrong_synonym", "spelling_error", "plural_error"],
  },
  dailyMission: {
    newWordsPerDay: 10,
    synonymBattlesPerDay: 8,
    dictationItemsPerDay: 6,
    reviewLimitPerDay: 10,
    difficultyLevel: "band7",
  },
  interestProfile: {
    preferredRoutes: ["travel_daily_services", "science_technology", "environment_nature", "cities_transport"],
    contentLevel: "B2_C1",
    explanationLanguage: "mixed",
    politicalContentStyle: "conceptual",
  },
  dictation: {
    accent: "en-GB",
    playbackSpeed: 1,
    allowReplay: true,
    showHintAfterMistakes: 2,
    strictPluralCheck: true,
    strictSpellingCheck: true,
  },
  review: {
    reviewPressure: "balanced",
    dailyReviewCap: 10,
    highRiskThreshold: 2,
    masteryHideThreshold: 85,
  },
  readingSources: {
    enableReadingLab: true,
    enableGithubCrawler: false,
    selectedSources: ["awesome_english_ebooks"],
    preferredMagazines: ["economist", "new_yorker", "atlantic", "wired"],
    preferredRoutes: ["society_ideas", "technology_civilization", "world_order_power"],
    defaultReadingLevel: "B2",
    dailyReadingMinutes: 20,
    maxArticlesPerSync: 10,
    maxFileSizeMB: 80,
    showChineseExplanation: true,
    highlightDifficultSentences: true,
    autoAddVocabularyToReview: true,
    autoGenerateQuestions: true,
  },
};

function mergeSettings(value: Partial<AppSettings>): AppSettings {
  return {
    studyGoal: { ...DEFAULT_SETTINGS.studyGoal, ...(value.studyGoal ?? {}) },
    dailyMission: { ...DEFAULT_SETTINGS.dailyMission, ...(value.dailyMission ?? {}) },
    interestProfile: { ...DEFAULT_SETTINGS.interestProfile, ...(value.interestProfile ?? {}) },
    dictation: { ...DEFAULT_SETTINGS.dictation, ...(value.dictation ?? {}) },
    review: { ...DEFAULT_SETTINGS.review, ...(value.review ?? {}) },
    readingSources: { ...DEFAULT_SETTINGS.readingSources, ...(value.readingSources ?? {}) },
  };
}

export function getAppSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? mergeSettings(JSON.parse(raw) as Partial<AppSettings>) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(mergeSettings(settings)));
  } catch {
    // Ignore localStorage quota or privacy-mode failures.
  }
}

export function resetAppSettings(): AppSettings {
  saveAppSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}
