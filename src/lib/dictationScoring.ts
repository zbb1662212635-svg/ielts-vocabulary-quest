import type { ErrorType } from "./types";

export type DictationScore = {
  isCorrect: boolean;
  normalizedUser: string;
  normalizedCorrect: string;
  errorType?: ErrorType;
};

export function normalizeDictationAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[，。！？；：]/g, "")
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ");
}

export function scoreDictationAnswer(userAnswer: string, correctAnswer: string): DictationScore {
  const normalizedUser = normalizeDictationAnswer(userAnswer);
  const normalizedCorrect = normalizeDictationAnswer(correctAnswer);
  if (normalizedUser === normalizedCorrect) {
    return { isCorrect: true, normalizedUser, normalizedCorrect };
  }

  return {
    isCorrect: false,
    normalizedUser,
    normalizedCorrect,
    errorType: detectDictationErrorType(normalizedUser, normalizedCorrect),
  };
}

export function detectDictationErrorType(user: string, correct: string): ErrorType {
  if (user + "s" === correct || user === correct + "s") return "plural_error";
  if (user.replace(/\s+/g, "") === correct.replace(/\s+/g, "")) return "spacing_error";
  if (user.replace(/-/g, " ") === correct.replace(/-/g, " ")) return "hyphen_error";
  if (sameWordsDifferentOrder(user, correct)) return "word_order_error";
  if (!user) return "listening_not_recognized";
  return "spelling_error";
}

function sameWordsDifferentOrder(user: string, correct: string): boolean {
  const userWords = user.split(" ").filter(Boolean).sort().join(" ");
  const correctWords = correct.split(" ").filter(Boolean).sort().join(" ");
  return userWords === correctWords && user !== correct;
}
