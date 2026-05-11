import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSafeTodayMission } from "../src/lib/missionLoader";
import type { ContentGraph, ContentGraphEdge, ContentGraphNode, ContentGraphReport } from "../src/lib/contentGraphTypes";
import type {
  AudioTrack,
  DictationItem,
  IELTSMission,
  IELTSReadingQuestion,
  IELTSTopicRoute,
  ReadingPassage,
  ScenarioDifficultSentence,
  ScenarioReadingArticle,
  UsefulExpression,
  VocabularyItem,
} from "../src/lib/types";

type Payload<T> = { items?: T[] };

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const privateDir = path.join(projectRoot, "data", "private");
const generatedAt = new Date().toISOString();

const topicLabels: Record<IELTSTopicRoute, string> = {
  science_technology: "Science & Technology",
  art_culture: "Art & Culture",
  environment_nature: "Environment & Nature",
  education_learning: "Education & Learning",
  health_lifestyle: "Health & Lifestyle",
  work_business: "Work & Business",
  cities_transport: "Cities & Transport",
  media_communication: "Media & Communication",
  history_society: "History & Society",
  travel_daily_services: "Travel & Daily Services",
};

const outputs = {
  graph: path.join(privateDir, "content-graph.generated.json"),
  report: path.join(privateDir, "content-graph.report.json"),
  needsReview: path.join(privateDir, "content-graph.needs-review.json"),
};

const vocabulary = readItems<VocabularyItem>("vocabulary.generated.json");
const dictation = readItems<DictationItem>("dictation.generated.json");
const audioTracks = readItems<AudioTrack>("audio.index.json");
const readingPassages = readItems<ReadingPassage>("reading-passages.generated.json");
const readingQuestions = readItems<IELTSReadingQuestion>("reading-questions.generated.json");
const scenarioArticles = readItems<ScenarioReadingArticle>("scenario-articles.generated.json");
const scenarioExpressions = readItems<UsefulExpression>("scenario-expressions.generated.json");
const scenarioSentences = readItems<ScenarioDifficultSentence>("scenario-sentences.generated.json");
const mission = getSafeTodayMission();

const nodeMap = new Map<string, ContentGraphNode>();
const edges: ContentGraphEdge[] = [];
const needsReview: Array<Record<string, unknown>> = [];

Object.entries(topicLabels).forEach(([route, label]) => {
  addNode({
    id: topicId(route),
    type: "topic",
    title: label,
    topicTags: [route as IELTSTopicRoute],
    skillTags: [],
    status: "ready",
  });
});

addMission(mission);
vocabulary.forEach(addVocabulary);
dictation.forEach(addDictation);
audioTracks.forEach(addAudioTrack);
readingPassages.forEach(addReadingPassage);
readingQuestions.forEach(addReadingQuestion);
scenarioArticles.forEach(addScenarioArticle);
scenarioExpressions.forEach(addScenarioExpression);
scenarioSentences.forEach(addScenarioSentence);
linkVocabularyToContent();
linkScenarioToMission(mission);

const graph: ContentGraph = {
  generatedAt,
  nodes: [...nodeMap.values()],
  edges,
  stats: {
    totalNodes: nodeMap.size,
    totalEdges: edges.length,
    byNodeType: countBy([...nodeMap.values()], (node) => node.type),
    byTopic: countTopics([...nodeMap.values()]),
    bySkill: countSkills([...nodeMap.values()]),
  },
};

const readingPassagesWithoutQuestions = readingPassages.filter((passage) => !readingQuestions.some((question) => question.passageId === passage.id)).length;
const audioWithoutTranscript = audioTracks.filter((audio) => !audio.matchedTranscriptId).length;
const scenarioArticlesWithoutTopic = scenarioArticles.filter((article) => !article.topicTags.length).length;
const orphanVocabularyItems = vocabulary.filter((item) => !edges.some((edge) => edge.from === vocabId(item.id) || edge.to === vocabId(item.id))).length;
const missionsWithoutEnoughResources = mission.vocabularyLoadout.length < 4 || mission.listeningScene.items.length < 2 ? 1 : 0;
const warnings = [
  ...(readingPassagesWithoutQuestions ? [`${readingPassagesWithoutQuestions} reading passages have no linked questions.`] : []),
  ...(audioWithoutTranscript ? [`${audioWithoutTranscript} audio tracks have no matched transcript.`] : []),
  ...(scenarioArticlesWithoutTopic ? [`${scenarioArticlesWithoutTopic} scenario articles have no topic tags.`] : []),
  ...(missionsWithoutEnoughResources ? ["Today mission has limited linked resources."] : []),
];

const report: ContentGraphReport = {
  generatedAt,
  totalNodes: graph.stats.totalNodes,
  totalEdges: graph.stats.totalEdges,
  warnings,
  orphanVocabularyItems,
  readingPassagesWithoutQuestions,
  audioWithoutTranscript,
  scenarioArticlesWithoutTopic,
  missionsWithoutEnoughResources,
};

writeJson(outputs.graph, graph);
writeJson(outputs.report, report);
writeJson(outputs.needsReview, { generatedAt, totalItems: needsReview.length, items: needsReview });

console.log("\nContent graph built.\n");
console.log(`Nodes: ${graph.stats.totalNodes}`);
console.log(`Edges: ${graph.stats.totalEdges}`);
console.log(`Warnings: ${warnings.length}`);
console.log("\nOutput:");
Object.values(outputs).forEach((file) => console.log(normalizePath(file)));

function addMission(item: IELTSMission) {
  const id = missionId(item.id);
  addNode({
    id,
    type: "mission",
    title: item.title,
    topicTags: [item.topicRoute],
    skillTags: item.targetSkills,
    status: "ready",
    metadata: { estimatedMinutes: item.estimatedMinutes, role: item.role },
  });
  linkTopics(id, [item.topicRoute]);
  item.targetSkills.forEach((skill) => linkSkill(id, skill));
}

function addVocabulary(item: VocabularyItem) {
  const id = vocabId(item.id);
  const topics = normalizeTopics(item.topicTags);
  addNode({
    id,
    type: "vocabulary_item",
    title: item.word,
    topicTags: topics,
    skillTags: item.skillTags,
    sourceId: item.sourceResourceId,
    status: item.word ? "ready" : "needs_review",
    metadata: {
      meaning: item.chineseMeaning,
      synonyms: item.synonyms,
      sourceFileName: item.sourceFileName,
    },
  });
  linkTopics(id, topics);
  item.skillTags.forEach((skill) => linkSkill(id, skill));
  item.synonyms.slice(0, 8).forEach((synonym) => {
    const synonymId = `vocab_synonym:${stableId(synonym)}`;
    addNode({
      id: synonymId,
      type: "vocabulary_item",
      title: synonym,
      topicTags: topics,
      skillTags: item.skillTags,
      status: "ready",
      metadata: { generatedFrom: item.word },
    });
    addEdge(id, synonymId, "synonym_of", 0.7);
  });
}

function addDictation(item: DictationItem) {
  const id = dictationId(item.id);
  addNode({
    id,
    type: "dictation_item",
    title: item.answer,
    topicTags: item.topicTags,
    skillTags: item.skillTags,
    status: item.status === "ready" ? "ready" : "needs_review",
    metadata: { itemType: item.itemType, source: item.source },
  });
  linkTopics(id, item.topicTags);
  item.skillTags.forEach((skill) => linkSkill(id, skill));
  if (item.audioId) addEdge(id, audioId(item.audioId), "audio_for", 0.9);
}

function addAudioTrack(item: AudioTrack) {
  const id = audioId(item.id);
  addNode({
    id,
    type: "audio_track",
    title: item.title,
    topicTags: item.topicTags,
    skillTags: item.skillTags,
    status: item.status === "needs_review" ? "needs_review" : "ready",
    sourceId: item.sourceResourceId,
    metadata: { fileName: item.fileName, matchedTranscriptId: item.matchedTranscriptId },
  });
  linkTopics(id, item.topicTags);
}

function addReadingPassage(item: ReadingPassage) {
  const id = passageId(item.id);
  addNode({
    id,
    type: "reading_passage",
    title: item.title,
    topicTags: item.topicTags,
    skillTags: item.skillTags,
    sourceId: item.sourceResourceId,
    status: item.status,
    metadata: { wordCount: item.wordCount, sourceFileName: item.sourceFileName },
  });
  linkTopics(id, item.topicTags);
}

function addReadingQuestion(item: IELTSReadingQuestion) {
  const id = questionId(item.id);
  addNode({
    id,
    type: "reading_question",
    title: item.prompt.slice(0, 90),
    topicTags: item.topicTags,
    skillTags: item.skillTags,
    sourceId: item.sourceResourceId,
    status: item.status,
    metadata: { questionType: item.questionType, questionNumber: item.questionNumber },
  });
  linkTopics(id, item.topicTags);
  item.skillTags.forEach((skill) => linkSkill(id, skill));
  if (item.passageId) addEdge(id, passageId(item.passageId), "tests", 0.9);
}

function addScenarioArticle(item: ScenarioReadingArticle) {
  const id = scenarioId(item.id);
  addNode({
    id,
    type: "scenario_article",
    title: item.title,
    topicTags: item.topicTags,
    skillTags: item.skillTags,
    sourceId: item.sourceResourceId,
    status: item.status,
    metadata: { sourceName: item.sourceName, wordCount: item.wordCount },
  });
  linkTopics(id, item.topicTags);
  item.skillTags.forEach((skill) => linkSkill(id, skill));
}

function addScenarioExpression(item: UsefulExpression) {
  const id = expressionId(item.id);
  addNode({
    id,
    type: "scenario_expression",
    title: item.expression,
    topicTags: [],
    skillTags: ["expression_collection"],
    status: "ready",
    metadata: { sourceSentence: item.sourceSentence },
  });
  addEdge(id, scenarioId(item.articleId), "appears_in", 0.8);
}

function addScenarioSentence(item: ScenarioDifficultSentence) {
  const id = sentenceId(item.id);
  addNode({
    id,
    type: "difficult_sentence",
    title: item.sentence.slice(0, 100),
    topicTags: [],
    skillTags: ["difficult_sentence"],
    status: "ready",
    metadata: { difficulty: item.difficulty, targetGrammar: item.targetGrammar },
  });
  addEdge(id, scenarioId(item.articleId), "appears_in", 0.8);
}

function linkVocabularyToContent() {
  const searchableContent = [
    ...dictation.map((item) => ({ id: dictationId(item.id), text: `${item.text} ${item.answer}`, relation: "appears_in" as const })),
    ...readingPassages.map((item) => ({ id: passageId(item.id), text: `${item.title} ${item.text}`, relation: "appears_in" as const })),
    ...scenarioArticles.map((item) => ({
      id: scenarioId(item.id),
      text: `${item.title} ${item.summary ?? ""} ${item.paragraphs.map((paragraph) => paragraph.text).join(" ")}`,
      relation: "appears_in" as const,
    })),
  ];

  for (const item of vocabulary.slice(0, 2500)) {
    if (!item.word || item.word.length < 4) continue;
    const word = item.word.toLowerCase();
    const sourceId = vocabId(item.id);
    let links = 0;
    for (const target of searchableContent) {
      if (links >= 4) break;
      if (target.text.toLowerCase().includes(word)) {
        addEdge(sourceId, target.id, target.relation, 0.55);
        links += 1;
      }
    }
  }
}

function linkScenarioToMission(item: IELTSMission) {
  const missionNodeId = missionId(item.id);
  scenarioArticles
    .filter((article) => article.topicTags.includes(item.topicRoute))
    .slice(0, 12)
    .forEach((article) => addEdge(scenarioId(article.id), missionNodeId, "same_scenario_as", 0.7));
  vocabulary
    .filter((word) => normalizeTopics(word.topicTags).includes(item.topicRoute))
    .slice(0, 24)
    .forEach((word) => addEdge(vocabId(word.id), missionNodeId, "used_in_mission", 0.45));
}

function addNode(node: ContentGraphNode) {
  if (!nodeMap.has(node.id)) nodeMap.set(node.id, node);
}

function addEdge(from: string, to: string, relation: ContentGraphEdge["relation"], weight: number, metadata?: Record<string, unknown>) {
  if (!nodeMap.has(from) || !nodeMap.has(to)) {
    needsReview.push({ type: "missing_edge_endpoint", from, to, relation });
    return;
  }
  const id = `${from}->${relation}->${to}`;
  if (edges.some((edge) => edge.id === id)) return;
  edges.push({ id, from, to, relation, weight, metadata });
}

function linkTopics(id: string, topics: IELTSTopicRoute[]) {
  topics.forEach((topic) => addEdge(id, topicId(topic), "belongs_to_topic", 1));
}

function linkSkill(id: string, skill: string) {
  const skillNodeId = `skill:${stableId(skill)}`;
  addNode({ id: skillNodeId, type: "skill", title: skill, topicTags: [], skillTags: [skill], status: "ready" });
  addEdge(id, skillNodeId, "supports_skill", 0.8);
}

function normalizeTopics(values: string[]): IELTSTopicRoute[] {
  return values.filter((value): value is IELTSTopicRoute => value in topicLabels);
}

function readItems<T>(fileName: string): T[] {
  const filePath = path.join(privateDir, fileName);
  if (!fs.existsSync(filePath)) return [];
  try {
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8")) as Payload<T>;
    return Array.isArray(payload.items) ? payload.items : [];
  } catch {
    return [];
  }
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const value = key(item);
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function countTopics(nodes: ContentGraphNode[]): Record<string, number> {
  return nodes.reduce<Record<string, number>>((acc, node) => {
    node.topicTags.forEach((topic) => {
      acc[topic] = (acc[topic] ?? 0) + 1;
    });
    return acc;
  }, {});
}

function countSkills(nodes: ContentGraphNode[]): Record<string, number> {
  return nodes.reduce<Record<string, number>>((acc, node) => {
    node.skillTags.forEach((skill) => {
      acc[skill] = (acc[skill] ?? 0) + 1;
    });
    return acc;
  }, {});
}

function stableId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";
}

function topicId(value: string) {
  return `topic:${value}`;
}

function vocabId(value: string) {
  return `vocabulary:${value}`;
}

function dictationId(value: string) {
  return `dictation:${value}`;
}

function audioId(value: string) {
  return `audio:${value}`;
}

function passageId(value: string) {
  return `reading_passage:${value}`;
}

function questionId(value: string) {
  return `reading_question:${value}`;
}

function scenarioId(value: string) {
  return `scenario_article:${value}`;
}

function expressionId(value: string) {
  return `scenario_expression:${value}`;
}

function sentenceId(value: string) {
  return `difficult_sentence:${value}`;
}

function missionId(value: string) {
  return `mission:${value}`;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function writeJson(filePath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}
