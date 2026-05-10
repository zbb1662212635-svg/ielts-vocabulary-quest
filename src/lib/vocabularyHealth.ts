import type { ReviewItem, VocabularyItem } from "./types";

export type NormalizedVocabularyItem = VocabularyItem;

export type VocabularyHealth = {
  total: number;
  wordEncounterUsable: number;
  synonymUsable: number;
  dictationUsable: number;
  reviewDue: number;
  invalidCount: number;
  invalidReasons: { reason: string; count: number }[];
  sampleInvalidEntries: { id?: string; word?: string; reasons: string[] }[];
};

export function normalizeVocabularyItem(item: Partial<VocabularyItem>): NormalizedVocabularyItem {
  const word = String(item.word ?? "").trim();
  const chineseMeaning = String(item.chineseMeaning ?? "").trim();

  return {
    id: item.id || `word_${word.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    word,
    normalizedWord: item.normalizedWord || word.toLowerCase().trim().replace(/\s+/g, " "),
    partOfSpeech: Array.isArray(item.partOfSpeech) ? item.partOfSpeech : [],
    chineseMeaning,
    englishDefinition: item.englishDefinition ?? "",
    cefrLevel: item.cefrLevel,
    topicTags: Array.isArray(item.topicTags) ? item.topicTags : ["general_academic"],
    skillTags: Array.isArray(item.skillTags) && item.skillTags.length ? item.skillTags : ["reading"],
    sourceLayers:
      Array.isArray(item.sourceLayers) && item.sourceLayers.length
        ? item.sourceLayers
        : ["private_vocabulary"],
    examples: Array.isArray(item.examples) ? item.examples : [],
    synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
    antonyms: Array.isArray(item.antonyms) ? item.antonyms : [],
    collocations: Array.isArray(item.collocations) ? item.collocations : [],
    wordFamily: Array.isArray(item.wordFamily) ? item.wordFamily : [],
    commonMistakes: Array.isArray(item.commonMistakes) ? item.commonMistakes : [],
    listeningRisk: item.listeningRisk ?? {
      spellingRisk: word.length >= 9,
      homophoneRisk: false,
      weakFormRisk: false,
      pluralRisk: false,
      commonWrongSpellings: [],
    },
    sourceResourceId: item.sourceResourceId,
    sourceFileName: item.sourceFileName,
    sourcePath: item.sourcePath,
    importWarnings: Array.isArray(item.importWarnings) ? item.importWarnings : [],
  };
}

export function normalizeVocabulary(items: Partial<VocabularyItem>[]): NormalizedVocabularyItem[] {
  return items.map(normalizeVocabularyItem);
}

export function isWordEncounterUsable(item: VocabularyItem): boolean {
  return Boolean(item.word?.trim() && item.chineseMeaning?.trim());
}

export function isSynonymUsable(item: VocabularyItem): boolean {
  return Boolean(item.word?.trim() && item.synonyms?.length);
}

export function isDictationUsable(item: VocabularyItem): boolean {
  return Boolean(
    item.word?.trim() &&
      (item.listeningRisk?.spellingRisk ||
        item.skillTags?.includes("listening") ||
        item.sourceLayers?.includes("listening_survival")),
  );
}

export function getInvalidReasons(item: VocabularyItem): string[] {
  const reasons: string[] = [];
  if (!item.word?.trim()) reasons.push("缺少英文单词");
  if (!item.chineseMeaning?.trim()) reasons.push("缺少中文释义");
  return reasons;
}

export function analyzeVocabularyHealth(
  rawItems: Partial<VocabularyItem>[],
  reviewItems: ReviewItem[] = [],
): VocabularyHealth {
  const items = normalizeVocabulary(rawItems);
  const invalid = items
    .map((item) => ({ item, reasons: getInvalidReasons(item) }))
    .filter((entry) => entry.reasons.length > 0);

  const reasonCounts = new Map<string, number>();
  invalid.forEach((entry) => {
    entry.reasons.forEach((reason) => {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    });
  });

  const now = Date.now();

  return {
    total: items.length,
    wordEncounterUsable: items.filter(isWordEncounterUsable).length,
    synonymUsable: items.filter(isSynonymUsable).length,
    dictationUsable: items.filter(isDictationUsable).length,
    reviewDue: reviewItems.filter((item) => new Date(item.dueAt).getTime() <= now).length,
    invalidCount: invalid.length,
    invalidReasons: [...reasonCounts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    sampleInvalidEntries: invalid.slice(0, 6).map((entry) => ({
      id: entry.item.id,
      word: entry.item.word,
      reasons: entry.reasons,
    })),
  };
}
