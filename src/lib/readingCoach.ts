import type { ReadingQuestion } from "./types";

export function getReadingCoachFeedback(question: ReadingQuestion, isCorrect: boolean): string {
  if (isCorrect) {
    return "答对了。你不是只看懂了句子，而是抓住了 IELTS Reading 需要的定位证据。继续留意题干和原文之间的同义替换关系。";
  }

  if (question.type === "main_idea" || question.type === "paragraph_function") {
    return "这题的问题通常不是细节没看懂，而是没有抓住段落功能。IELTS 主旨题问的是这一段在论证中做什么，不是某个例子本身。";
  }

  if (question.type === "synonym") {
    return "这是典型 paraphrase 问题。你需要把题干词和原文表达连成一组，之后定位时优先寻找这种同义替换。";
  }

  if (question.type === "tfng") {
    return "TFNG 的关键不是判断句子听起来是否合理，而是看原文有没有明确支持。主题相关但没有直接证据时，往往是 Not Given。";
  }

  if (question.type === "author_attitude") {
    return "作者态度题要看评价词和转折词。although、however、critics argue 这类信号通常决定作者立场。";
  }

  return "这题要回到原文证据。IELTS Reading 不鼓励凭印象答题，必须用 evidenceText 定位。";
}

export function readingErrorType(question: ReadingQuestion) {
  if (question.type === "main_idea" || question.type === "paragraph_function") return "main_idea_error";
  if (question.type === "synonym") return "wrong_synonym";
  if (question.type === "tfng") return "tfng_error";
  if (question.type === "author_attitude") return "author_attitude_error";
  return "context_misread";
}
