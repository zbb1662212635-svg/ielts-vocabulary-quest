import sampleReadings from "@/data/readings.sample.json";
import type {
  IELTSQuestionType,
  IELTSReadingQuestion,
  IELTSTopicRoute,
  ReadingAnswerKey,
  ReadingArticle,
  ReadingPassage,
  ReadingQuestion,
} from "./types";

const articles = sampleReadings as unknown as ReadingArticle[];

const interestRouteMap: Record<ReadingArticle["interestRoute"], IELTSTopicRoute> = {
  society_ideas: "history_society",
  technology_civilization: "science_technology",
  world_order_power: "history_society",
  economics_globalization: "work_business",
  science_environment: "environment_nature",
  general: "education_learning",
};

const keywordTopicMap: Record<string, IELTSTopicRoute> = {
  technology: "science_technology",
  science: "science_technology",
  history: "history_society",
  society: "history_society",
  knowledge: "education_learning",
  education: "education_learning",
  politics: "history_society",
  diplomacy: "history_society",
  security: "history_society",
  urbanization: "cities_transport",
  migration: "cities_transport",
  inequality: "history_society",
  environment: "environment_nature",
  ecology: "environment_nature",
  business: "work_business",
  economy: "work_business",
};

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function mapTopicTags(article: ReadingArticle): IELTSTopicRoute[] {
  const fromInterestRoute = interestRouteMap[article.interestRoute] ?? "education_learning";
  const fromKeywords = (article.topicTags ?? [])
    .map((tag) => keywordTopicMap[String(tag).toLowerCase()])
    .filter(Boolean) as IELTSTopicRoute[];
  return unique([fromInterestRoute, ...fromKeywords]);
}

function articleText(article: ReadingArticle): string {
  if (article.paragraphs?.length) {
    return article.paragraphs.map((paragraph) => paragraph.text).join("\n\n");
  }
  return article.summary || article.title;
}

function mapQuestionType(type: ReadingQuestion["type"]): IELTSQuestionType {
  if (type === "tfng") return "tfng";
  if (type === "sentence_completion") return "sentence_completion";
  if (type === "multiple_choice" || type === "author_attitude" || type === "main_idea" || type === "synonym") {
    return "multiple_choice";
  }
  return "matching";
}

function mapSkillTags(question: ReadingQuestion): IELTSReadingQuestion["skillTags"] {
  const raw = [question.type, ...(question.skillTags ?? [])].map((tag) => String(tag).toLowerCase());
  const tags: IELTSReadingQuestion["skillTags"] = [];

  if (raw.some((tag) => tag.includes("main"))) tags.push("main_idea");
  if (raw.some((tag) => tag.includes("synonym") || tag.includes("paraphrase"))) tags.push("synonym");
  if (raw.some((tag) => tag.includes("tfng"))) tags.push("tfng");
  if (raw.some((tag) => tag.includes("sentence"))) tags.push("sentence_completion");
  if (raw.some((tag) => tag.includes("attitude") || tag.includes("author"))) tags.push("author_attitude");
  if (!tags.length) tags.push("detail_location");
  tags.push("reading");

  return unique(tags) as IELTSReadingQuestion["skillTags"];
}

function fallbackOptions(question: ReadingQuestion): string[] | undefined {
  if (question.options?.length) return question.options;
  if (question.type === "tfng") return ["True", "False", "Not Given"];
  return question.correctAnswer ? [question.correctAnswer] : undefined;
}

export function getSampleReadingPassages(): ReadingPassage[] {
  return articles.map((article) => ({
    id: article.id,
    title: article.title,
    sourceResourceId: article.sourceFileId,
    sourceFileName: article.publication ?? "Sample Reading Lab",
    sourcePath: article.sourcePath,
    text: articleText(article),
    paragraphs: (article.paragraphs ?? []).map((paragraph, index) => ({
      id: paragraph.id,
      index: typeof paragraph.index === "number" ? paragraph.index : index + 1,
      label: String.fromCharCode(65 + index),
      text: paragraph.text,
      mainIdea: paragraph.mainIdea,
    })),
    topicTags: mapTopicTags(article),
    skillTags: ["reading", "vocabulary", "review"],
    level: article.level ?? "B2",
    wordCount: article.wordCount ?? articleText(article).split(/\s+/).filter(Boolean).length,
    questions: (article.questions ?? []).map((question) => question.id),
    status: "ready",
    warnings: [],
  }));
}

export function getSampleIELTSReadingQuestions(): IELTSReadingQuestion[] {
  return articles.flatMap((article) =>
    (article.questions ?? []).map((question, index) => ({
      id: question.id,
      passageId: article.id,
      sourceResourceId: article.sourceFileId,
      sourceFileName: article.title,
      questionNumber: index + 1,
      questionType: mapQuestionType(question.type),
      prompt: question.prompt,
      options: fallbackOptions(question),
      correctAnswer: question.correctAnswer,
      acceptableAnswers: question.correctAnswer ? [question.correctAnswer] : undefined,
      evidenceText: question.evidenceText,
      evidenceParagraphId: question.paragraphId,
      explanation: question.explanation,
      topicTags: mapTopicTags(article),
      skillTags: mapSkillTags(question),
      difficulty: question.difficulty ?? 2,
      status: question.correctAnswer ? "ready" : "needs_review",
      warnings: question.correctAnswer ? [] : ["Sample question has no answer key."],
    })),
  );
}

export function getSampleReadingAnswerKeys(): ReadingAnswerKey[] {
  return articles.map((article) => ({
    id: `sample_answer_key_${article.id}`,
    sourceResourceId: article.sourceFileId,
    sourceFileName: article.title,
    passageId: article.id,
    answers: (article.questions ?? [])
      .map((question, index) => ({
        questionNumber: index + 1,
        answer: question.correctAnswer,
        alternativeAnswers: question.correctAnswer ? [question.correctAnswer] : undefined,
      }))
      .filter((item) => Boolean(item.answer)),
    status: "ready",
    warnings: [],
  }));
}
