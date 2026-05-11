import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IELTSQuestionType, IELTSReadingQuestion, IELTSTopicRoute, ReadingAnswerKey, ReadingPassage } from "../src/lib/types";
import type { LearningResource, ResourceIndex } from "../src/lib/resourceTypes";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultRoot = "C:/Users/zhangbinbin/Desktop/\u5b66\u82f1\u8bed";
const privateDir = path.join(projectRoot, "data", "private");
const resourceIndexPath = path.join(privateDir, "resources.index.json");

const passagesOutput = path.join(privateDir, "reading-passages.generated.json");
const questionsOutput = path.join(privateDir, "reading-questions.generated.json");
const answersOutput = path.join(privateDir, "reading-answer-keys.generated.json");
const reportOutput = path.join(privateDir, "reading.import-report.json");
const needsReviewOutput = path.join(privateDir, "reading.needs-review.json");

const supportedExtensions = new Set([".txt", ".md", ".json", ".csv", ".pdf"]);
const args = parseArgs(process.argv.slice(2));
loadEnvLocal();

const generatedAt = new Date().toISOString();
const resourceRoot = normalizePath(process.env.LEARNING_RESOURCE_ROOT || defaultRoot);
const resourceIndex = readResourceIndex();
const input = args.input ? normalizePath(args.input) : "";
const answersInput = args.answers ? normalizePath(args.answers) : path.join(resourceRoot, "answer-keys");

const readingResources = input
  ? discoverFiles(input).map((file) => fileToResource(file, resourceRoot))
  : resourceIndex.items.filter((item) => item.type === "ielts_past_paper" && isReadingResource(item));
const answerResources = fs.existsSync(answersInput) ? discoverFiles(answersInput).map((file) => fileToResource(file, resourceRoot)) : [];

const passages: ReadingPassage[] = [];
const questions: IELTSReadingQuestion[] = [];
const answerKeys: ReadingAnswerKey[] = [];
const needsReview: Array<Record<string, unknown>> = [];
const unsupportedFiles: Array<{ path: string; reason: string }> = [];
const warnings: string[] = [];

let readingFilesDetected = 0;
const answerKeyFilesDetected = answerResources.length;

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  for (const resource of readingResources) {
    readingFilesDetected += 1;
    if (!supportedExtensions.has(resource.extension)) {
      unsupportedFiles.push({ path: resource.absolutePath, reason: "unsupported_extension" });
      continue;
    }
    try {
      const parsed = await parseReadingResource(resource);
      passages.push(...parsed.passages);
      questions.push(...parsed.questions);
      needsReview.push(...parsed.needsReview);
    } catch (error) {
      needsReview.push({ type: "reading_parse_error", path: resource.relativePath, message: String(error) });
    }
  }

  for (const resource of answerResources) {
    try {
      answerKeys.push(...parseAnswerKeyResource(resource));
    } catch (error) {
      needsReview.push({ type: "answer_key_parse_error", path: resource.relativePath, message: String(error) });
    }
  }

  attachAnswers(questions, answerKeys);

  const readyQuestions = questions.filter((question) => question.correctAnswer && question.questionType !== "unknown");
  const questionsWithEvidence = questions.filter((question) => question.evidenceText);
  const questionsWithoutAnswers = questions.filter((question) => !question.correctAnswer);
  questionsWithoutAnswers.forEach((question) => {
    question.status = "needs_review";
    question.warnings = [...question.warnings, "answer_key_not_found"];
  });

  const report = {
    generatedAt,
    resourceRoot,
    readingFilesDetected,
    answerKeyFilesDetected,
    passagesGenerated: passages.length,
    questionsGenerated: questions.length,
    questionsWithAnswers: questions.filter((question) => question.correctAnswer).length,
    questionsWithEvidence: questionsWithEvidence.length,
    needsReview: needsReview.length + questions.filter((question) => question.status === "needs_review").length,
    unsupportedFiles,
    warnings: [...warnings, ...(answerKeyFilesDetected ? [] : ["No answer key folder detected. Question checking is limited without answer keys."])],
  };

  writeJson(passagesOutput, { generatedAt, totalItems: passages.length, items: passages });
  writeJson(questionsOutput, { generatedAt, totalItems: questions.length, readyItems: readyQuestions.length, items: questions });
  writeJson(answersOutput, { generatedAt, totalItems: answerKeys.length, items: answerKeys });
  writeJson(needsReviewOutput, { generatedAt, totalItems: report.needsReview, items: [...needsReview, ...questions.filter((question) => question.status === "needs_review")] });
  writeJson(reportOutput, report);

  console.log("\nReading import complete.\n");
  console.log(`Reading files detected: ${report.readingFilesDetected}`);
  console.log(`Answer key files detected: ${report.answerKeyFilesDetected}`);
  console.log(`Passages generated: ${report.passagesGenerated}`);
  console.log(`Questions generated: ${report.questionsGenerated}`);
  console.log(`Questions with answers: ${report.questionsWithAnswers}`);
  console.log(`Needs review: ${report.needsReview}`);
  console.log("\nOutput:");
  console.log(normalizePath(passagesOutput));
  console.log(normalizePath(questionsOutput));
  console.log(normalizePath(answersOutput));
  console.log(normalizePath(reportOutput));
  console.log(normalizePath(needsReviewOutput));
}

function parseArgs(values: string[]) {
  const result: { input?: string; answers?: string } = {};
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] === "--input") result.input = values[++i];
    else if (values[i] === "--answers") result.answers = values[++i];
  }
  return result;
}

function loadEnvLocal() {
  const envPath = path.join(projectRoot, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [rawKey, ...rawValue] = trimmed.split("=");
    const key = rawKey.trim();
    const value = rawValue.join("=").trim().replace(/^"|"$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function readResourceIndex(): ResourceIndex {
  if (!fs.existsSync(resourceIndexPath)) return { metadata: { resourceRoot, scannedAt: "", count: 0, generatedBy: "missing" }, items: [] };
  return JSON.parse(fs.readFileSync(resourceIndexPath, "utf8")) as ResourceIndex;
}

function discoverFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) return discoverFiles(full);
    if (entry.isFile()) return [full];
    return [];
  });
}

function fileToResource(filePath: string, root: string): LearningResource {
  const stat = fs.statSync(filePath);
  const relativePath = normalizeSlashes(path.relative(root, filePath));
  return {
    id: stableId(relativePath),
    title: cleanTitle(path.basename(filePath, path.extname(filePath))),
    fileName: path.basename(filePath),
    extension: path.extname(filePath).toLowerCase(),
    type: "ielts_past_paper",
    fileKind: "document",
    absolutePath: normalizePath(filePath),
    relativePath,
    folder: "ielts-papers",
    sizeBytes: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    importedAt: generatedAt,
    topicTags: inferTopicTags(relativePath),
    skillTags: ["reading"],
    status: "raw",
    warnings: [],
  };
}

function isReadingResource(resource: LearningResource): boolean {
  const value = `${resource.relativePath} ${resource.fileName}`.toLowerCase();
  if (value.includes("口语") || value.includes("写作") || value.includes("听力")) return false;
  return resource.extension === ".pdf" || value.includes("reading") || value.includes("阅读") || value.includes("真题");
}

async function parseReadingResource(resource: LearningResource) {
  const text = await extractText(resource);
  const needsReview: Array<Record<string, unknown>> = [];
  if (text.length < 500) {
    needsReview.push({ type: "low_text_extraction_confidence", path: resource.relativePath });
    return { passages: [], questions: [], needsReview };
  }
  const title = inferTitle(text, resource);
  const paragraphs = splitParagraphs(text).slice(0, 12);
  const passageText = paragraphs.map((item) => item.text).join("\n\n");
  const passage: ReadingPassage = {
    id: `passage_${resource.id}`,
    title,
    sourceResourceId: resource.id,
    sourceFileName: resource.fileName,
    sourcePath: resource.relativePath,
    text: passageText,
    paragraphs: paragraphs.map((item, index) => ({ id: `passage_${resource.id}_p${index + 1}`, index, label: item.label, text: item.text })),
    topicTags: inferTopicTags(`${title} ${resource.relativePath} ${passageText.slice(0, 800)}`),
    skillTags: ["reading", "vocabulary"],
    level: estimateLevel(passageText),
    wordCount: countWords(passageText),
    questions: [],
    status: paragraphs.length ? "ready" : "needs_review",
    warnings: resource.extension === ".pdf" ? ["pdf_layout_may_need_review"] : [],
  };
  const parsedQuestions = extractQuestions(text, passage);
  passage.questions = parsedQuestions.map((question) => question.id);
  if (!parsedQuestions.length) {
    needsReview.push({ type: "question_layout_uncertain", path: resource.relativePath, passageId: passage.id });
  }
  return { passages: [passage], questions: parsedQuestions, needsReview };
}

async function extractText(resource: LearningResource): Promise<string> {
  if (resource.extension === ".txt" || resource.extension === ".md" || resource.extension === ".csv" || resource.extension === ".json") {
    return fs.readFileSync(resource.absolutePath, "utf8");
  }
  if (resource.extension === ".pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: fs.readFileSync(resource.absolutePath) });
    try {
      const result = await parser.getText({ first: 1, last: 80 });
      return cleanExtractedText(result.text ?? "");
    } finally {
      await parser.destroy();
    }
  }
  return "";
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "")
    .replace(/^\s*\d+\s*$/gm, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitParagraphs(text: string): Array<{ label?: string; text: string }> {
  const raw = text.split(/\n\s*\n/).map((item) => item.trim()).filter((item) => countWords(item) >= 40);
  return raw.map((item, index) => {
    const match = item.match(/^([A-H])[\.)]\s+([\s\S]+)/);
    return { label: match?.[1] ?? String.fromCharCode(65 + index), text: match?.[2]?.trim() ?? item };
  });
}

function extractQuestions(text: string, passage: ReadingPassage): IELTSReadingQuestion[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const questions: IELTSReadingQuestion[] = [];
  for (const line of lines) {
    const match = line.match(/^(\d{1,2})[\.)]\s+(.{12,220})$/);
    if (!match) continue;
    const questionNumber = Number(match[1]);
    const prompt = match[2].trim();
    const questionType = detectQuestionType(prompt);
    questions.push({
      id: `rq_${passage.id}_${questionNumber}`,
      passageId: passage.id,
      sourceResourceId: passage.sourceResourceId,
      sourceFileName: passage.sourceFileName,
      questionNumber,
      questionType,
      prompt,
      topicTags: passage.topicTags,
      skillTags: skillTagsForQuestion(questionType),
      difficulty: questionType === "unknown" ? 3 : 2,
      status: "needs_review",
      warnings: [questionType === "unknown" ? "unknown_question_type" : "answer_key_not_found"],
    });
  }
  return questions.slice(0, 40);
}

function parseAnswerKeyResource(resource: LearningResource): ReadingAnswerKey[] {
  if (!supportedExtensions.has(resource.extension) || resource.extension === ".pdf") return [];
  const text = fs.readFileSync(resource.absolutePath, "utf8");
  const answers = [...text.matchAll(/(\d{1,2})[\.)\s]+([A-Za-z][A-Za-z\s/-]{0,40}|TRUE|FALSE|NOT GIVEN|YES|NO)/gi)].map((match) => ({
    questionNumber: Number(match[1]),
    answer: match[2].trim(),
  }));
  if (!answers.length) return [];
  return [
    {
      id: `answers_${resource.id}`,
      sourceResourceId: resource.id,
      sourceFileName: resource.fileName,
      answers,
      status: "ready",
      warnings: [],
    },
  ];
}

function attachAnswers(questions: IELTSReadingQuestion[], answerKeys: ReadingAnswerKey[]) {
  if (!answerKeys.length) return;
  const allAnswers = answerKeys.flatMap((key) => key.answers);
  for (const question of questions) {
    const answer = allAnswers.find((item) => item.questionNumber === question.questionNumber);
    if (!answer) continue;
    question.correctAnswer = answer.answer;
    question.acceptableAnswers = answer.alternativeAnswers;
    question.status = question.questionType === "unknown" ? "needs_review" : "ready";
    question.warnings = question.warnings.filter((warning) => warning !== "answer_key_not_found");
  }
}

function detectQuestionType(value: string): IELTSQuestionType {
  const text = value.toLowerCase();
  if (text.includes("true") && text.includes("false") && text.includes("not given")) return "tfng";
  if (text.includes("yes") && text.includes("no") && text.includes("not given")) return "ynng";
  if (text.includes("choose the correct letter")) return "multiple_choice";
  if (text.includes("complete the sentence")) return "sentence_completion";
  if (text.includes("complete the summary")) return "summary_completion";
  if (text.includes("match each heading")) return "matching_headings";
  if (text.includes("which paragraph contains")) return "matching_information";
  if (text.includes("match the following features")) return "matching_features";
  if (text.includes("complete the table")) return "table_completion";
  if (text.includes("label the diagram")) return "diagram_labeling";
  return "unknown";
}

function skillTagsForQuestion(type: IELTSQuestionType): IELTSReadingQuestion["skillTags"] {
  if (type === "tfng" || type === "ynng") return ["tfng", "reading"];
  if (type === "matching_headings") return ["main_idea", "reading"];
  if (type === "sentence_completion" || type === "summary_completion") return ["sentence_completion", "reading"];
  if (type === "matching_information") return ["detail_location", "reading"];
  return ["reading"];
}

function inferTitle(text: string, resource: LearningResource): string {
  const line = text.split(/\r?\n/).map((item) => item.trim()).find((item) => item.length >= 8 && item.length <= 90 && !/^\d+$/.test(item));
  return line ?? resource.title;
}

function inferTopicTags(value: string): IELTSTopicRoute[] {
  const text = value.toLowerCase();
  const rules: Array<[IELTSTopicRoute, string[]]> = [
    ["science_technology", ["science", "technology", "research", "energy", "computer", "glass"]],
    ["art_culture", ["art", "museum", "music", "culture", "film"]],
    ["environment_nature", ["environment", "climate", "pollution", "species", "animal"]],
    ["education_learning", ["student", "school", "education", "university"]],
    ["health_lifestyle", ["health", "sleep", "stress", "hospital"]],
    ["work_business", ["business", "market", "company", "work"]],
    ["cities_transport", ["city", "transport", "traffic", "urban"]],
    ["media_communication", ["media", "news", "communication", "language"]],
    ["history_society", ["history", "society", "archaeology", "population"]],
    ["travel_daily_services", ["hotel", "tour", "ticket", "accommodation"]],
  ];
  const tags = rules.filter(([, keys]) => keys.some((key) => text.includes(key))).map(([route]) => route);
  return tags.length ? tags : ["education_learning"];
}

function estimateLevel(text: string): ReadingPassage["level"] {
  const words = countWords(text);
  const sentenceCount = Math.max(1, (text.match(/[.!?]/g) ?? []).length);
  const avg = words / sentenceCount;
  if (avg > 26) return "C1";
  if (avg < 18) return "B1";
  return "B2";
}

function countWords(value: string): number {
  return (value.match(/\b[A-Za-z][A-Za-z'-]*\b/g) ?? []).length;
}

function cleanTitle(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled reading";
}

function stableId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "reading";
}

function normalizePath(value: string): string {
  return path.resolve(value.replace(/^"|"$/g, "")).replace(/\\/g, "/");
}

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, "/");
}

function writeJson(filePath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}
