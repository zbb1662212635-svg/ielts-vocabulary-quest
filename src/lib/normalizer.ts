import type { ErrorType } from "./types";

export function normalizeAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[，。！？；：]/g, "")
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ");
}

export function isAnswerCorrect(userAnswer: string, correctAnswer: string): boolean {
  return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
}

export function isPluralMistake(user: string, correct: string): boolean {
  return user + "s" === correct || user === correct + "s";
}

export function detectDictationError(userAnswer: string, correctAnswer: string): ErrorType | undefined {
  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);

  if (normalizedUser === normalizedCorrect) return undefined;
  if (isPluralMistake(normalizedUser, normalizedCorrect)) return "plural_error";
  return "spelling_error";
}
