"use client";

import type { ReadingArticle, ReadingQuestion, ReadingVocabularyItem } from "./types";

const READING_PROGRESS_KEY = "ielts-vocabulary-quest:reading-progress";
const SAVED_WORDS_KEY = "ielts-vocabulary-quest:reading-saved-words";
const SOURCE_CONSENT_KEY = "ielts-vocabulary-quest:reading-source-consent";

export type ReadingProgress = {
  articleId: string;
  completedQuestionIds: string[];
  wrongQuestionIds: string[];
  savedWordIds: string[];
  completedAt?: string;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore localStorage failures.
  }
}

export function getReadingProgressMap(): Record<string, ReadingProgress> {
  return readJson<Record<string, ReadingProgress>>(READING_PROGRESS_KEY, {});
}

export function saveReadingProgress(article: ReadingArticle, wrongQuestions: ReadingQuestion[]): void {
  const current = getReadingProgressMap();
  current[article.id] = {
    articleId: article.id,
    completedQuestionIds: article.questions.map((question) => question.id),
    wrongQuestionIds: wrongQuestions.map((question) => question.id),
    savedWordIds: current[article.id]?.savedWordIds ?? [],
    completedAt: new Date().toISOString(),
  };
  writeJson(READING_PROGRESS_KEY, current);
}

export function getSavedReadingWords(): ReadingVocabularyItem[] {
  return readJson<ReadingVocabularyItem[]>(SAVED_WORDS_KEY, []);
}

export function saveReadingWord(word: ReadingVocabularyItem): void {
  const words = getSavedReadingWords();
  if (words.some((item) => item.id === word.id)) return;
  writeJson(SAVED_WORDS_KEY, [word, ...words].slice(0, 500));
}

export function getReadingSourceConsent(sourceId: string): boolean {
  const consent = readJson<Record<string, boolean>>(SOURCE_CONSENT_KEY, {});
  return Boolean(consent[sourceId]);
}

export function saveReadingSourceConsent(sourceId: string, value: boolean): void {
  const consent = readJson<Record<string, boolean>>(SOURCE_CONSENT_KEY, {});
  consent[sourceId] = value;
  writeJson(SOURCE_CONSENT_KEY, consent);
}
