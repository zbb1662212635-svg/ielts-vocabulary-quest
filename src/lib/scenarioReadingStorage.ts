"use client";

import type { ScenarioDifficultSentence, ScenarioVocabularyItem, UsefulExpression } from "./types";

const SAVED_SCENARIO_WORDS_KEY = "ielts-vocabulary-quest:scenario-saved-words";
const SAVED_EXPRESSIONS_KEY = "ielts-vocabulary-quest:scenario-saved-expressions";
const SAVED_SENTENCES_KEY = "ielts-vocabulary-quest:scenario-saved-sentences";
const TAKEAWAYS_KEY = "ielts-vocabulary-quest:scenario-takeaways";

export type ScenarioTakeaway = {
  id: string;
  articleId: string;
  missionId?: string;
  text: string;
  createdAt: string;
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
    // Ignore localStorage quota/private-mode failures.
  }
}

export function getSavedScenarioWords(): ScenarioVocabularyItem[] {
  return readJson<ScenarioVocabularyItem[]>(SAVED_SCENARIO_WORDS_KEY, []);
}

export function saveScenarioWord(word: ScenarioVocabularyItem): void {
  const current = getSavedScenarioWords();
  if (current.some((item) => item.id === word.id)) return;
  writeJson(SAVED_SCENARIO_WORDS_KEY, [word, ...current].slice(0, 500));
}

export function getSavedExpressions(): UsefulExpression[] {
  return readJson<UsefulExpression[]>(SAVED_EXPRESSIONS_KEY, []);
}

export function saveExpression(expression: UsefulExpression): void {
  const current = getSavedExpressions();
  if (current.some((item) => item.id === expression.id)) return;
  writeJson(SAVED_EXPRESSIONS_KEY, [expression, ...current].slice(0, 500));
}

export function getSavedScenarioSentences(): ScenarioDifficultSentence[] {
  return readJson<ScenarioDifficultSentence[]>(SAVED_SENTENCES_KEY, []);
}

export function saveScenarioSentence(sentence: ScenarioDifficultSentence): void {
  const current = getSavedScenarioSentences();
  if (current.some((item) => item.id === sentence.id)) return;
  writeJson(SAVED_SENTENCES_KEY, [sentence, ...current].slice(0, 300));
}

export function getScenarioTakeaways(): ScenarioTakeaway[] {
  return readJson<ScenarioTakeaway[]>(TAKEAWAYS_KEY, []);
}

export function saveScenarioTakeaway(takeaway: Omit<ScenarioTakeaway, "id" | "createdAt">): void {
  const current = getScenarioTakeaways();
  writeJson(TAKEAWAYS_KEY, [
    {
      ...takeaway,
      id: `takeaway_${Date.now()}`,
      createdAt: new Date().toISOString(),
    },
    ...current,
  ].slice(0, 300));
}
