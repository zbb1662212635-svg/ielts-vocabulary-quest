"use client";

import type { AppSettings, ReviewItem, TrainingAttempt, UserProgress } from "./types";
import { addDays } from "./scheduler";

const PROGRESS_KEY = "ielts-vocabulary-quest:progress";
const REVIEW_KEY = "ielts-vocabulary-quest:review";
const ATTEMPTS_KEY = "ielts-vocabulary-quest:attempts";
const KNOWLEDGE_ROUTE_KEY = "ielts-vocabulary-quest:knowledge-route";
const KNOWLEDGE_COMPLETED_KEY = "ielts-vocabulary-quest:knowledge-completed";

export type LearningDataBackup = {
  exportedAt: string;
  version: 1;
  userSettings: AppSettings;
  progress: Record<string, UserProgress>;
  mistakes: TrainingAttempt[];
  reviewQueue: ReviewItem[];
  missionHistory: {
    selectedKnowledgeRoute?: string;
    completedKnowledgeMissions: string[];
  };
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
    // localStorage can fail in private browsing or quota-limited contexts.
  }
}

export function getProgressMap(): Record<string, UserProgress> {
  return readJson<Record<string, UserProgress>>(PROGRESS_KEY, {});
}

export function saveProgressMap(progress: Record<string, UserProgress>): void {
  writeJson(PROGRESS_KEY, progress);
}

export function getReviewItems(): ReviewItem[] {
  return readJson<ReviewItem[]>(REVIEW_KEY, []);
}

export function saveReviewItems(items: ReviewItem[]): void {
  writeJson(REVIEW_KEY, items);
}

export function getAttempts(): TrainingAttempt[] {
  return readJson<TrainingAttempt[]>(ATTEMPTS_KEY, []);
}

export function saveAttempts(attempts: TrainingAttempt[]): void {
  writeJson(ATTEMPTS_KEY, attempts);
}

export function saveAttempt(attempt: TrainingAttempt): void {
  const attempts = [attempt, ...getAttempts()].slice(0, 300);
  writeJson(ATTEMPTS_KEY, attempts);
}

export function upsertReviewItem(wordId: string, errorType: ReviewItem["errorType"]): void {
  const items = getReviewItems();
  const existing = items.find((item) => item.wordId === wordId && item.errorType === errorType);
  if (existing) {
    existing.dueAt = new Date().toISOString();
    existing.lastResult = "again";
    saveReviewItems(items);
    return;
  }

  saveReviewItems([
    {
      id: `review_${wordId}_${errorType}_${Date.now()}`,
      wordId,
      errorType,
      dueAt: new Date().toISOString(),
      intervalDays: 0,
      ease: 2.5,
    },
    ...items,
  ]);
}

export function markReviewResult(
  reviewId: string,
  result: "again" | "hard" | "good" | "easy",
  nextIntervalDays: number,
): void {
  const items = getReviewItems().map((item) =>
    item.id === reviewId
      ? {
          ...item,
          intervalDays: nextIntervalDays,
          dueAt: addDays(nextIntervalDays),
          lastResult: result,
        }
      : item,
  );
  saveReviewItems(items);
}

export function getSelectedKnowledgeRoute(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage.getItem(KNOWLEDGE_ROUTE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveSelectedKnowledgeRoute(routeId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KNOWLEDGE_ROUTE_KEY, routeId);
  } catch {
    // Ignore storage failures.
  }
}

export function getCompletedKnowledgeMissions(): string[] {
  return readJson<string[]>(KNOWLEDGE_COMPLETED_KEY, []);
}

export function markKnowledgeMissionComplete(missionId: string): void {
  const completed = new Set(getCompletedKnowledgeMissions());
  completed.add(missionId);
  writeJson(KNOWLEDGE_COMPLETED_KEY, [...completed]);
}

export function exportLearningData(userSettings: AppSettings): LearningDataBackup {
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    userSettings,
    progress: getProgressMap(),
    mistakes: getAttempts(),
    reviewQueue: getReviewItems(),
    missionHistory: {
      selectedKnowledgeRoute: getSelectedKnowledgeRoute(),
      completedKnowledgeMissions: getCompletedKnowledgeMissions(),
    },
  };
}

export function importLearningData(payload: LearningDataBackup): AppSettings | undefined {
  if (!payload || payload.version !== 1) return undefined;
  saveProgressMap(payload.progress ?? {});
  saveAttempts(payload.mistakes ?? []);
  saveReviewItems(payload.reviewQueue ?? []);
  if (payload.missionHistory?.selectedKnowledgeRoute) {
    saveSelectedKnowledgeRoute(payload.missionHistory.selectedKnowledgeRoute);
  }
  writeJson(KNOWLEDGE_COMPLETED_KEY, payload.missionHistory?.completedKnowledgeMissions ?? []);
  return payload.userSettings;
}

export function resetLearningData(): void {
  if (typeof window === "undefined") return;
  [
    PROGRESS_KEY,
    REVIEW_KEY,
    ATTEMPTS_KEY,
    KNOWLEDGE_ROUTE_KEY,
    KNOWLEDGE_COMPLETED_KEY,
  ].forEach((key) => window.localStorage.removeItem(key));
}
