import type { ErrorType, IELTSQuestionType } from "./types";

export function normalizeReadingAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[，。！？；：]/g, "")
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ");
}

export function isReadingAnswerCorrect(userAnswer: string, correctAnswer: string, questionType: IELTSQuestionType, options: string[] = []): boolean {
  const user = normalizeReadingAnswer(userAnswer);
  const correct = normalizeReadingAnswer(correctAnswer);
  if (questionType === "tfng") return normalizeTfng(user) === normalizeTfng(correct);
  if (questionType === "ynng") return normalizeYnng(user) === normalizeYnng(correct);
  if (questionType === "multiple_choice") {
    if (user === correct) return true;
    const optionIndex = options.findIndex((option) => normalizeReadingAnswer(option) === correct);
    if (optionIndex >= 0) return user === String.fromCharCode(97 + optionIndex);
  }
  return user === correct;
}

export function readingErrorTypeForQuestion(questionType: IELTSQuestionType): ErrorType {
  if (questionType === "tfng" || questionType === "ynng") return "tfng_error";
  if (questionType === "matching_headings") return "main_idea_error";
  if (questionType === "matching_information" || questionType === "short_answer") return "detail_location_error";
  if (questionType === "sentence_completion" || questionType === "summary_completion") return "sentence_completion_error";
  return "context_misread";
}

function normalizeTfng(value: string): string {
  if (value === "t") return "true";
  if (value === "f") return "false";
  if (value === "ng" || value === "notgiven") return "not given";
  return value;
}

function normalizeYnng(value: string): string {
  if (value === "y") return "yes";
  if (value === "n") return "no";
  if (value === "ng" || value === "notgiven") return "not given";
  return value;
}
