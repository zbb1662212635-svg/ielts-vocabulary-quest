import { getDictationItems } from "./audioLoader";
import { getSafeTodayMission, normalizeMission } from "./missionLoader";
import { getReadingPassages, getIELTSReadingQuestions } from "./readingAssetLoader";
import { getScenarioReadingArticles } from "./scenarioReadingLoader";
import { getUsableVocabularyForDictation, getUsableVocabularyForLoadout } from "./vocabularyLoader";
import type {
  DictationItem,
  IELTSMission,
  IELTSReadingQuestion,
  IELTSTopicRoute,
  MissionListeningItem,
  MissionReadingPassage,
  MissionSkill,
  MissionVocabularyLoadoutItem,
  ReadingPassage,
  ReadingQuestion,
  ScenarioReadingArticle,
  VocabularyItem,
} from "./types";

export type MissionGenerationInput = {
  topicRoute?: IELTSTopicRoute;
  dailyMinutes: number;
  targetSkills?: MissionSkill[];
  weakErrorTypes?: string[];
  includeReview: boolean;
  includeScenarioReading: boolean;
};

export type MissionGenerationResult = {
  mission: IELTSMission;
  warnings: string[];
  usedFallbacks: string[];
};

export function generateTodayMission(input: MissionGenerationInput): MissionGenerationResult {
  const warnings: string[] = [];
  const usedFallbacks: string[] = [];
  const base = getSafeTodayMission();
  const topicRoute = input.topicRoute ?? base.topicRoute;
  const sizes = getMissionSizes(input.dailyMinutes, input.weakErrorTypes ?? []);

  const vocabulary = selectTopicFirst(getUsableVocabularyForLoadout(), topicRoute, sizes.vocabulary);
  if (!vocabulary.topicCount) usedFallbacks.push("vocabulary_topic_fallback");
  const loadout = vocabulary.items.map(toMissionVocabulary);

  const dictation = selectDictation(getDictationItems(), getUsableVocabularyForDictation(), topicRoute, sizes.dictation);
  if (!dictation.topicCount) usedFallbacks.push("dictation_topic_fallback");

  const reading = selectReading(getReadingPassages(), getIELTSReadingQuestions(), topicRoute, sizes.readingQuestions, base.readingTask);
  if (reading.usedFallback) usedFallbacks.push(reading.usedFallback);

  const scenario = input.includeScenarioReading
    ? selectScenarioReading(getScenarioReadingArticles(), topicRoute, base)
    : { mission: base, usedFallback: "scenario_reading_disabled" };
  if (scenario.usedFallback) usedFallbacks.push(scenario.usedFallback);

  if (!loadout.length) warnings.push("No usable vocabulary was found; sample mission vocabulary is being used.");
  if (!dictation.items.length) warnings.push("No usable dictation items were found; sample mission dictation is being used.");
  if (!reading.passage.questions.length) warnings.push("Reading task has limited checkable questions.");

  const mission = normalizeMission({
    ...base,
    topicRoute,
    targetSkills: input.targetSkills?.length ? input.targetSkills : base.targetSkills,
    estimatedMinutes: input.dailyMinutes || base.estimatedMinutes,
    vocabularyIds: loadout.map((item) => item.id),
    dictationItemIds: dictation.items.map((item) => item.id),
    readingArticleId: reading.passage.id,
    foreignPressArticleId: scenario.mission.foreignPressArticleId ?? base.foreignPressArticleId,
    vocabularyLoadout: loadout.length ? loadout : base.vocabularyLoadout,
    listeningScene: {
      ...base.listeningScene,
      items: dictation.items.length ? dictation.items : base.listeningScene.items,
    },
    readingTask: reading.passage,
    foreignPressExtension: scenario.mission.foreignPressExtension,
  });

  return { mission, warnings, usedFallbacks };
}

function getMissionSizes(minutes: number, weakErrorTypes: string[]) {
  const spellingHeavy = weakErrorTypes.some((type) => type.includes("spelling") || type.includes("plural"));
  const readingHeavy = weakErrorTypes.some((type) => type.includes("tfng") || type.includes("main_idea") || type.includes("synonym"));
  if (minutes <= 15) {
    return { vocabulary: 6, dictation: spellingHeavy ? 5 : 4, readingQuestions: readingHeavy ? 4 : 3 };
  }
  if (minutes >= 45) {
    return { vocabulary: 14, dictation: spellingHeavy ? 10 : 8, readingQuestions: readingHeavy ? 8 : 6 };
  }
  return { vocabulary: 10, dictation: spellingHeavy ? 8 : 6, readingQuestions: readingHeavy ? 7 : 5 };
}

function selectTopicFirst<T extends { topicTags: string[] }>(items: T[], topicRoute: IELTSTopicRoute, limit: number) {
  const topicItems = items.filter((item) => item.topicTags.includes(topicRoute));
  const fallbackItems = items.filter((item) => !item.topicTags.includes(topicRoute));
  return {
    items: [...topicItems, ...fallbackItems].slice(0, limit),
    topicCount: topicItems.length,
  };
}

function selectDictation(
  dictationItems: DictationItem[],
  vocabularyItems: VocabularyItem[],
  topicRoute: IELTSTopicRoute,
  limit: number,
): { items: MissionListeningItem[]; topicCount: number } {
  const topicDictation = dictationItems.filter((item) => item.topicTags.includes(topicRoute));
  const generalDictation = dictationItems.filter((item) => !item.topicTags.includes(topicRoute));
  const selected = [...topicDictation, ...generalDictation].slice(0, limit).map(toMissionListeningItem);
  if (selected.length) return { items: selected, topicCount: topicDictation.length };

  const vocabFallback = selectTopicFirst(vocabularyItems, topicRoute, limit);
  return {
    items: vocabFallback.items.map((item) => ({
      id: `vocab_dictation_${item.id}`,
      prompt: `Listen and type: ${item.word}`,
      answer: item.word,
      contextNote: item.chineseMeaning || "Vocabulary dictation fallback",
    })),
    topicCount: vocabFallback.topicCount,
  };
}

function selectReading(
  passages: ReadingPassage[],
  questions: IELTSReadingQuestion[],
  topicRoute: IELTSTopicRoute,
  questionLimit: number,
  fallback: MissionReadingPassage,
): { passage: MissionReadingPassage; usedFallback?: string } {
  const passage = passages.find((item) => item.topicTags.includes(topicRoute) && item.status === "ready") ?? passages.find((item) => item.status === "ready");
  if (!passage) return { passage: fallback, usedFallback: "sample_reading_fallback" };

  const linkedQuestions = questions
    .filter((item) => item.passageId === passage.id && item.correctAnswer && item.status === "ready")
    .slice(0, questionLimit)
    .map(toMissionReadingQuestion);

  if (!linkedQuestions.length) {
    return {
      passage: {
        id: passage.id,
        title: passage.title,
        text: passage.text || passage.paragraphs.map((paragraph) => paragraph.text).join("\n\n"),
        questions: fallback.questions,
      },
      usedFallback: "sample_reading_questions_fallback",
    };
  }

  return {
    passage: {
      id: passage.id,
      title: passage.title,
      text: passage.text || passage.paragraphs.map((paragraph) => paragraph.text).join("\n\n"),
      questions: linkedQuestions,
    },
  };
}

function selectScenarioReading(
  articles: ScenarioReadingArticle[],
  topicRoute: IELTSTopicRoute,
  base: IELTSMission,
): { mission: IELTSMission; usedFallback?: string } {
  const article = articles.find((item) => item.topicTags.includes(topicRoute) && item.status === "ready") ?? articles.find((item) => item.status === "ready");
  if (!article) return { mission: base, usedFallback: "sample_scenario_reading_fallback" };

  const excerpt = article.paragraphs.map((paragraph) => paragraph.text).join("\n\n").slice(0, 2600);
  return {
    mission: {
      ...base,
      foreignPressArticleId: article.id,
      foreignPressExtension: {
        ...base.foreignPressExtension,
        articleId: article.id,
        title: article.title,
        excerpt,
        authorViewpoint: article.backgroundNote ?? article.summary ?? base.foreignPressExtension.authorViewpoint,
      },
    },
    usedFallback: article.topicTags.includes(topicRoute) ? undefined : "scenario_topic_fallback",
  };
}

function toMissionVocabulary(item: VocabularyItem): MissionVocabularyLoadoutItem {
  return {
    id: item.id,
    word: item.word,
    chineseMeaning: item.chineseMeaning || "待补充释义",
    englishDefinition: item.englishDefinition || item.examples[0]?.sentence || "Use this word in the mission context.",
    exampleSentence: item.examples[0]?.sentence || `This mission uses the word "${item.word}" in an IELTS topic context.`,
    synonyms: item.synonyms ?? [],
    collocations: item.collocations ?? [],
    ieltsUsageNote: item.synonyms?.length
      ? `注意 ${item.word} 与 ${item.synonyms.slice(0, 3).join(", ")} 的同义替换。`
      : "在阅读中关注它出现的语境，在听力中注意拼写。",
    listeningRisk: item.listeningRisk?.spellingRisk ? "高危拼写词" : undefined,
  };
}

function toMissionListeningItem(item: DictationItem): MissionListeningItem {
  return {
    id: item.id,
    prompt: item.text,
    answer: item.answer,
    contextNote: item.chineseMeaning || `${item.itemType} dictation`,
    audioId: item.audioId,
    audioStart: item.audioStart,
    audioEnd: item.audioEnd,
  };
}

function toMissionReadingQuestion(item: IELTSReadingQuestion): ReadingQuestion {
  return {
    id: item.id,
    articleId: item.passageId ?? "reading",
    type: toReadingQuestionType(item),
    prompt: item.prompt,
    options: item.options,
    correctAnswer: item.correctAnswer ?? "",
    explanation: item.explanation || item.evidenceText || "Use the passage evidence to check this answer.",
    evidenceText: item.evidenceText,
    skillTags: item.skillTags,
    difficulty: item.difficulty,
  };
}

function toReadingQuestionType(item: IELTSReadingQuestion): ReadingQuestion["type"] {
  if (item.skillTags.includes("main_idea")) return "main_idea";
  if (item.skillTags.includes("synonym")) return "synonym";
  if (item.skillTags.includes("author_attitude")) return "author_attitude";
  if (item.questionType === "tfng" || item.questionType === "ynng") return "tfng";
  if (item.questionType === "sentence_completion") return "sentence_completion";
  return "multiple_choice";
}
