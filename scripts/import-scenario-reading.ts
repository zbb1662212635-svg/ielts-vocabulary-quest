import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  IELTSTopicRoute,
  ScenarioDifficultSentence,
  ScenarioReadingArticle,
  ScenarioReadingParagraph,
  ScenarioReadingPrompt,
  ScenarioVocabularyItem,
  UsefulExpression,
} from "../src/lib/types";
import type { LearningResource, ResourceIndex } from "../src/lib/resourceTypes";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const privateDir = path.join(projectRoot, "data", "private");
const resourceIndexPath = path.join(privateDir, "resources.index.json");
const defaultRoot = "C:/Users/zhangbinbin/Desktop/学英语";
const supportedExtensions = new Set([".txt", ".md", ".json", ".csv"]);

const outputs = {
  articles: path.join(privateDir, "scenario-articles.generated.json"),
  vocabulary: path.join(privateDir, "scenario-vocabulary.generated.json"),
  expressions: path.join(privateDir, "scenario-expressions.generated.json"),
  sentences: path.join(privateDir, "scenario-sentences.generated.json"),
  prompts: path.join(privateDir, "scenario-reading-prompts.generated.json"),
  report: path.join(privateDir, "scenario-reading.import-report.json"),
  needsReview: path.join(privateDir, "scenario-reading.needs-review.json"),
};

const args = parseArgs(process.argv.slice(2));
loadEnvLocal();

const generatedAt = new Date().toISOString();
const resourceRoot = normalizePath(process.env.LEARNING_RESOURCE_ROOT || defaultRoot);
const index = readResourceIndex();
const input = args.input ? normalizePath(args.input) : "";
const resources = input
  ? discoverFiles(input).map((file) => fileToResource(file, resourceRoot))
  : index.items.filter((item) => item.type === "foreign_magazine" || item.type === "user_note");

const articles: ScenarioReadingArticle[] = [];
const needsReview: Array<Record<string, unknown>> = [];
const unsupportedFiles: Array<{ path: string; reason: string }> = [];

for (const resource of resources) {
  if (!supportedExtensions.has(resource.extension)) {
    unsupportedFiles.push({ path: resource.relativePath, reason: "unsupported_for_scenario_v1" });
    continue;
  }
  try {
    const parsed = parseScenarioResource(resource);
    if (parsed) articles.push(parsed);
    else needsReview.push({ type: "empty_or_short_scenario_resource", path: resource.relativePath });
  } catch (error) {
    needsReview.push({ type: "scenario_parse_error", path: resource.relativePath, message: String(error) });
  }
}

const vocabulary = articles.flatMap((article) => article.keyVocabulary);
const expressions = articles.flatMap((article) => article.usefulExpressions);
const sentences = articles.flatMap((article) => article.difficultSentences);
const prompts = articles.flatMap((article) => article.readingPrompts);
const report = {
  generatedAt,
  resourceRoot,
  foreignReadingFilesDetected: resources.length,
  articlesExtracted: articles.length,
  readyScenarioArticles: articles.filter((item) => item.status === "ready").length,
  articlesNeedingReview: articles.filter((item) => item.status === "needs_review").length,
  keyVocabularyExtracted: vocabulary.length,
  usefulExpressionsExtracted: expressions.length,
  difficultSentencesExtracted: sentences.length,
  scenarioPromptsGenerated: prompts.length,
  unsupportedFiles,
  warnings: unsupportedFiles.length ? ["Some files were skipped because scenario reading v1 supports txt, md, json and csv only."] : [],
};

writeJson(outputs.articles, { generatedAt, totalItems: articles.length, items: articles });
writeJson(outputs.vocabulary, { generatedAt, totalItems: vocabulary.length, items: vocabulary });
writeJson(outputs.expressions, { generatedAt, totalItems: expressions.length, items: expressions });
writeJson(outputs.sentences, { generatedAt, totalItems: sentences.length, items: sentences });
writeJson(outputs.prompts, { generatedAt, totalItems: prompts.length, items: prompts });
writeJson(outputs.needsReview, { generatedAt, totalItems: needsReview.length, items: needsReview });
writeJson(outputs.report, report);

console.log("\nScenario reading import complete.\n");
console.log(`Foreign reading files detected: ${report.foreignReadingFilesDetected}`);
console.log(`Scenario articles extracted: ${report.articlesExtracted}`);
console.log(`Key vocabulary extracted: ${report.keyVocabularyExtracted}`);
console.log(`Useful expressions extracted: ${report.usefulExpressionsExtracted}`);
console.log(`Difficult sentences extracted: ${report.difficultSentencesExtracted}`);
console.log(`Scenario prompts generated: ${report.scenarioPromptsGenerated}`);
console.log("\nOutput:");
Object.values(outputs).forEach((file) => console.log(normalizePath(file)));

function parseScenarioResource(resource: LearningResource): ScenarioReadingArticle | null {
  if (resource.extension === ".json") {
    const raw = JSON.parse(fs.readFileSync(resource.absolutePath, "utf8")) as Partial<ScenarioReadingArticle>;
    if (raw.id && raw.title && raw.paragraphs?.length) return normalizeArticle(raw, resource);
  }

  const text = cleanText(fs.readFileSync(resource.absolutePath, "utf8"));
  if (countWords(text) < 120) return null;
  const title = inferTitle(text, resource);
  const articleId = `scenario_${stableId(resource.relativePath)}`;
  const paragraphs = splitParagraphs(text)
    .slice(0, 8)
    .map((paragraph, index): ScenarioReadingParagraph => ({
      id: `${articleId}_p${index + 1}`,
      articleId,
      index: index + 1,
      text: paragraph,
      gist: buildGist(paragraph),
      functionTag: inferFunctionTag(paragraph, index),
    }));
  const excerptText = paragraphs.map((item) => item.text).join(" ");
  const topicTags = inferTopicTags(`${resource.relativePath} ${title} ${excerptText}`);
  const vocabulary = extractVocabulary(articleId, paragraphs, topicTags);
  const expressions = extractExpressions(articleId, paragraphs);
  const difficultSentences = extractDifficultSentences(articleId, paragraphs);
  const prompts = buildPrompts(articleId, paragraphs, vocabulary, expressions);

  return {
    id: articleId,
    title,
    sourceName: resource.folder || "Local scenario reading",
    sourceType: resource.type === "foreign_magazine" ? "magazine" : resource.type === "user_note" ? "user_note" : "foreign_reading",
    sourceResourceId: resource.id,
    sourceFileName: resource.fileName,
    sourcePath: resource.relativePath,
    importedAt: generatedAt,
    topicTags,
    scenarioTags: inferScenarioTags(`${resource.relativePath} ${title} ${excerptText}`),
    missionUseCases: [],
    skillTags: [
      "contextual_reading",
      "vocabulary_in_context",
      "difficult_sentence",
      "background_knowledge",
      "expression_collection",
    ],
    level: estimateLevel(excerptText),
    wordCount: countWords(excerptText),
    estimatedMinutes: Math.max(5, Math.ceil(countWords(excerptText) / 120)),
    summary: buildSummary(paragraphs),
    backgroundNote: "Use this as authentic context for an IELTS topic mission, not as an exam-style question set.",
    paragraphs,
    keyVocabulary: vocabulary,
    usefulExpressions: expressions,
    difficultSentences,
    readingPrompts: prompts,
    status: paragraphs.length ? "ready" : "needs_review",
    warnings: paragraphs.length ? [] : ["no_paragraphs_extracted"],
  };
}

function normalizeArticle(raw: Partial<ScenarioReadingArticle>, resource: LearningResource): ScenarioReadingArticle {
  const id = raw.id ?? `scenario_${stableId(resource.relativePath)}`;
  return {
    id,
    title: raw.title ?? resource.title,
    subtitle: raw.subtitle,
    author: raw.author,
    sourceName: raw.sourceName ?? resource.folder,
    sourceType: raw.sourceType ?? "foreign_reading",
    sourceResourceId: raw.sourceResourceId ?? resource.id,
    sourceFileName: raw.sourceFileName ?? resource.fileName,
    sourcePath: raw.sourcePath ?? resource.relativePath,
    importedAt: raw.importedAt ?? generatedAt,
    topicTags: raw.topicTags?.length ? raw.topicTags : inferTopicTags(resource.relativePath),
    scenarioTags: raw.scenarioTags ?? [],
    missionUseCases: raw.missionUseCases ?? [],
    skillTags: raw.skillTags ?? ["contextual_reading", "vocabulary_in_context"],
    level: raw.level ?? "B2",
    wordCount: raw.wordCount ?? countWords(raw.paragraphs?.map((item) => item.text).join(" ") ?? ""),
    estimatedMinutes: raw.estimatedMinutes ?? 8,
    summary: raw.summary,
    backgroundNote: raw.backgroundNote,
    paragraphs: raw.paragraphs ?? [],
    keyVocabulary: raw.keyVocabulary ?? [],
    usefulExpressions: raw.usefulExpressions ?? [],
    difficultSentences: raw.difficultSentences ?? [],
    readingPrompts: raw.readingPrompts ?? [],
    status: raw.status ?? "ready",
    warnings: raw.warnings ?? [],
  };
}

function extractVocabulary(articleId: string, paragraphs: ScenarioReadingParagraph[], topicTags: IELTSTopicRoute[]): ScenarioVocabularyItem[] {
  const candidates = new Map<string, { word: string; sentence: string; paragraphId: string }>();
  for (const paragraph of paragraphs) {
    for (const sentence of splitSentences(paragraph.text)) {
      for (const word of sentence.match(/\b[A-Za-z][A-Za-z-]{6,}\b/g) ?? []) {
        const normalized = word.toLowerCase();
        if (commonWords.has(normalized) || candidates.has(normalized)) continue;
        candidates.set(normalized, { word, sentence, paragraphId: paragraph.id });
      }
    }
  }
  return [...candidates.values()].slice(0, 12).map((item, index) => ({
    id: `${articleId}_v${index + 1}`,
    articleId,
    paragraphId: item.paragraphId,
    word: item.word,
    sourceSentence: item.sentence,
    topicTags,
    addToVocabularyQuest: true,
  }));
}

function extractExpressions(articleId: string, paragraphs: ScenarioReadingParagraph[]): UsefulExpression[] {
  const patterns = [
    /\bcome under pressure\b/i,
    /\bplay a role in\b/i,
    /\bas a result of\b/i,
    /\bin response to\b/i,
    /\bin the long term\b/i,
    /\bnot only\b[^.]{5,80}\bbut also\b[^.]{5,80}/i,
  ];
  const results: UsefulExpression[] = [];
  for (const paragraph of paragraphs) {
    for (const sentence of splitSentences(paragraph.text)) {
      for (const pattern of patterns) {
        const match = sentence.match(pattern);
        if (!match) continue;
        results.push({
          id: `${articleId}_e${results.length + 1}`,
          articleId,
          paragraphId: paragraph.id,
          expression: match[0],
          sourceSentence: sentence,
          usageNote: "Save this as a reusable expression for IELTS topic writing and reading awareness.",
          tags: ["scenario", "expression"],
        });
      }
    }
  }
  if (results.length) return results.slice(0, 8);
  return paragraphs.slice(0, 3).map((paragraph, index) => {
    const sentence = splitSentences(paragraph.text)[0] ?? paragraph.text;
    return {
      id: `${articleId}_e${index + 1}`,
      articleId,
      paragraphId: paragraph.id,
      expression: sentence.split(/\s+/).slice(0, 5).join(" "),
      sourceSentence: sentence,
      usageNote: "A useful opening phrase from the source sentence.",
      tags: ["source phrase"],
    };
  });
}

function extractDifficultSentences(articleId: string, paragraphs: ScenarioReadingParagraph[]): ScenarioDifficultSentence[] {
  return paragraphs
    .flatMap((paragraph) => splitSentences(paragraph.text).map((sentence) => ({ paragraph, sentence, words: countWords(sentence) })))
    .filter((item) => item.words >= 18)
    .sort((a, b) => b.words - a.words)
    .slice(0, 4)
    .map((item, index) => ({
      id: `${articleId}_s${index + 1}`,
      articleId,
      paragraphId: item.paragraph.id,
      sentence: item.sentence,
      structureNote: "Long sentence selected for structure awareness; identify the main clause before reading details.",
      chineseExplanation: "请先抓主干，再处理原因、转折、定语从句或补充信息。",
      targetGrammar: inferGrammarTags(item.sentence),
      difficulty: item.words > 32 ? 4 : item.words > 24 ? 3 : 2,
    }));
}

function buildPrompts(
  articleId: string,
  paragraphs: ScenarioReadingParagraph[],
  vocabulary: ScenarioVocabularyItem[],
  expressions: UsefulExpression[],
): ScenarioReadingPrompt[] {
  const firstParagraphId = paragraphs[0]?.id;
  return [
    {
      id: `${articleId}_prompt_gist`,
      articleId,
      paragraphId: firstParagraphId,
      type: "gist",
      prompt: "用一句话说，这段真实材料主要在讲什么？",
      suggestedAnswer: paragraphs[0]?.gist,
      isReflective: true,
    },
    {
      id: `${articleId}_prompt_connection`,
      articleId,
      type: "connection_to_mission",
      prompt: "这段内容和今天的 IELTS 场景任务有什么关系？",
      suggestedAnswer: "It gives real-world context for the mission topic.",
      isReflective: true,
    },
    {
      id: `${articleId}_prompt_vocab`,
      articleId,
      type: "vocabulary_notice",
      prompt: "选出一个最值得加入词汇装备的词，并说明原因。",
      suggestedAnswer: vocabulary[0]?.word,
      isReflective: true,
    },
    {
      id: `${articleId}_prompt_expression`,
      articleId,
      type: "expression_notice",
      prompt: "找出一个可以用于描述趋势、问题或影响的表达。",
      suggestedAnswer: expressions[0]?.expression,
      isReflective: true,
    },
  ];
}

function readResourceIndex(): ResourceIndex {
  if (!fs.existsSync(resourceIndexPath)) {
    return { metadata: { resourceRoot, scannedAt: "", count: 0, generatedBy: "missing" }, items: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(resourceIndexPath, "utf8")) as ResourceIndex;
  } catch {
    return { metadata: { resourceRoot, scannedAt: "", count: 0, generatedBy: "invalid" }, items: [] };
  }
}

function discoverFiles(folder: string): string[] {
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(folder, entry.name);
    return entry.isDirectory() ? discoverFiles(absolute) : [absolute];
  });
}

function fileToResource(filePath: string, root: string): LearningResource {
  const stats = fs.statSync(filePath);
  const relativePath = path.relative(root, filePath).replace(/\\/g, "/");
  const extension = path.extname(filePath).toLowerCase();
  const folder = relativePath.split("/")[0] || "external";
  return {
    id: stableId(relativePath),
    title: cleanTitle(path.basename(filePath, extension)),
    fileName: path.basename(filePath),
    extension,
    type: folder.includes("magazine") ? "foreign_magazine" : "user_note",
    fileKind: extension === ".json" || extension === ".csv" ? "structured_data" : "text",
    absolutePath: normalizePath(filePath),
    relativePath,
    folder,
    sizeBytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
    importedAt: generatedAt,
    topicTags: [],
    skillTags: ["reading"],
    status: "indexed",
    warnings: [],
  };
}

function loadEnvLocal() {
  const envPath = path.join(projectRoot, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
}

function parseArgs(values: string[]) {
  const result: { input?: string } = {};
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] === "--input" && values[i + 1]) {
      result.input = values[i + 1];
      i += 1;
    }
  }
  return result;
}

function cleanText(text: string): string {
  return text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((item) => item.trim()).filter((item) => countWords(item) >= 35);
}

function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]/g)?.map((item) => item.trim()) ?? [text.trim()];
}

function buildGist(paragraph: string): string {
  return splitSentences(paragraph)[0]?.replace(/\s+/g, " ").slice(0, 180) ?? "";
}

function inferFunctionTag(paragraph: string, index: number): ScenarioReadingParagraph["functionTag"] {
  const text = paragraph.toLowerCase();
  if (index === 0) return "background";
  if (/\bhowever|yet|although|but\b/.test(text)) return "contrast";
  if (/\bfor example|for instance\b/.test(text)) return "example";
  if (/\btherefore|as a result|this means\b/.test(text)) return "conclusion";
  if (/\bproblem|pressure|risk|shortage\b/.test(text)) return "problem";
  return "claim";
}

function inferTitle(text: string, resource: LearningResource): string {
  return text.split(/\r?\n/).map((item) => item.trim()).find((item) => item.length >= 6 && item.length <= 100) ?? resource.title;
}

function inferTopicTags(text: string): IELTSTopicRoute[] {
  const lower = text.toLowerCase();
  const rules: Array<[IELTSTopicRoute, string[]]> = [
    ["science_technology", ["science", "technology", "ai", "space", "energy", "research", "data"]],
    ["art_culture", ["art", "museum", "exhibition", "music", "film", "culture", "heritage"]],
    ["environment_nature", ["environment", "climate", "pollution", "species", "habitat", "conservation"]],
    ["education_learning", ["education", "student", "university", "school", "learning", "course"]],
    ["health_lifestyle", ["health", "sleep", "stress", "diet", "exercise", "hospital"]],
    ["work_business", ["work", "business", "market", "company", "advertising", "consumer"]],
    ["cities_transport", ["city", "urban", "transport", "traffic", "housing", "infrastructure"]],
    ["media_communication", ["media", "news", "communication", "internet", "language"]],
    ["history_society", ["history", "society", "community", "population", "tradition"]],
    ["travel_daily_services", ["hotel", "accommodation", "reservation", "tour", "ticket", "library"]],
  ];
  const tags = rules.filter(([, keys]) => keys.some((key) => lower.includes(key))).map(([route]) => route);
  return tags.length ? tags : ["education_learning"];
}

function inferScenarioTags(text: string): string[] {
  const lower = text.toLowerCase();
  return ["accommodation", "housing", "conservation", "museum", "transport", "health", "university", "technology"].filter((tag) =>
    lower.includes(tag),
  );
}

function inferGrammarTags(sentence: string): string[] {
  const tags: string[] = [];
  if (/\bwhich|that|who\b/.test(sentence)) tags.push("relative clause");
  if (/\balthough|while|whereas|however\b/i.test(sentence)) tags.push("contrast");
  if (/\bbecause|therefore|as a result\b/i.test(sentence)) tags.push("cause and effect");
  return tags.length ? tags : ["long sentence"];
}

function buildSummary(paragraphs: ScenarioReadingParagraph[]): string {
  return paragraphs.slice(0, 2).map((item) => item.gist).filter(Boolean).join(" ");
}

function estimateLevel(text: string): "B1" | "B2" | "C1" {
  const words = countWords(text);
  const sentenceCount = Math.max(1, splitSentences(text).length);
  const average = words / sentenceCount;
  if (average > 26) return "C1";
  if (average < 18) return "B1";
  return "B2";
}

function countWords(value: string): number {
  return (value.match(/\b[A-Za-z][A-Za-z'-]*\b/g) ?? []).length;
}

function cleanTitle(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled scenario reading";
}

function stableId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "scenario";
}

function normalizePath(value: string): string {
  return path.resolve(value.replace(/^"|"$/g, "")).replace(/\\/g, "/");
}

function writeJson(filePath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

const commonWords = new Set([
  "because",
  "between",
  "without",
  "through",
  "people",
  "students",
  "different",
  "important",
  "another",
  "however",
  "therefore",
  "example",
  "usually",
]);
