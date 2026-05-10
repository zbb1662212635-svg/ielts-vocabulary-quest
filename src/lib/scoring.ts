import type { ErrorType, SkillMetric, TrainingAttempt, UserProgress } from "./types";

export function updateMastery(current: number, isCorrect: boolean): number {
  if (isCorrect) return Math.min(100, current + 8);
  return Math.max(0, current - 12);
}

export function createDefaultProgress(wordId: string): UserProgress {
  return {
    wordId,
    seenCount: 0,
    correctCount: 0,
    wrongCount: 0,
    mastery: 0,
    errorTypes: [],
    trainingHistory: [],
  };
}

export function applyAttempt(
  progress: UserProgress | undefined,
  attempt: TrainingAttempt,
  errorType?: ErrorType,
): UserProgress {
  const base = progress ?? createDefaultProgress(attempt.wordId);
  const errorTypes = errorType
    ? Array.from(new Set([...base.errorTypes, errorType]))
    : base.errorTypes;

  return {
    ...base,
    seenCount: base.seenCount + 1,
    correctCount: base.correctCount + (attempt.isCorrect ? 1 : 0),
    wrongCount: base.wrongCount + (attempt.isCorrect ? 0 : 1),
    mastery: updateMastery(base.mastery, attempt.isCorrect),
    lastSeenAt: attempt.createdAt,
    errorTypes,
    trainingHistory: [attempt, ...base.trainingHistory].slice(0, 40),
  };
}

export function percent(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

export function buildSkillMetrics(attempts: TrainingAttempt[]): SkillMetric[] {
  const metric = (mode: TrainingAttempt["mode"], label: string, helper: string) => {
    const scoped = attempts.filter((attempt) => attempt.mode === mode);
    return {
      label,
      value: percent(scoped.filter((attempt) => attempt.isCorrect).length, scoped.length),
      helper: scoped.length ? `${scoped.length} attempts logged` : helper,
    };
  };

  return [
    metric("synonym_arena", "Reading 同义替换识别", "完成第一轮任务后解锁"),
    metric("dictation", "Listening 拼写准确率", "完成第一轮听写后解锁"),
    metric("context_puzzle", "语境理解", "后续版本加入语境题"),
    metric("review", "错词复盘留存率", "完成错词复盘后解锁"),
  ];
}
