import type { ErrorType } from "./types";

export function getTutorFeedback(params: {
  mode: "synonym_arena" | "dictation" | "review";
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  errorType?: ErrorType;
  targetWord?: string;
}): string {
  const target = params.targetWord ? ` ${params.targetWord}` : "";

  if (params.isCorrect) {
    return "很好。你不是只记住了意思，而是在建立考试里的快速反应。下一步把这个词放回真实句子里再识别一次。";
  }

  if (params.errorType === "wrong_synonym") {
    return `这不是单纯“不认识词”，而是 paraphrase 关系还没建立。IELTS Reading 里题干可能写${target || "一个词"}，原文换成 ${params.correctAnswer}。请把这组替换练到能秒反应。`;
  }

  if (params.errorType === "plural_error") {
    return `你已经听懂核心词了，但 IELTS Listening 填空里单复数可能直接决定对错。再看一次答案结尾：${params.correctAnswer}。`;
  }

  if (params.errorType === "spelling_error") {
    return `这是 Listening 高危拼写错误。考试接受的是正确拼写，不是大致发音。请记住 ${params.correctAnswer}，不是 ${params.userAnswer || "刚才的写法"}。`;
  }

  return `还不够准确。正确答案是 ${params.correctAnswer}。这类错误会影响你在 IELTS 听读中的快速、精确识别。`;
}
