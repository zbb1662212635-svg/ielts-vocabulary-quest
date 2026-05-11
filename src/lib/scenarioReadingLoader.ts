import fs from "node:fs";
import path from "node:path";
import { sampleScenarioReadings } from "@/data/scenario-readings.sample";
import type {
  ScenarioDifficultSentence,
  ScenarioReadingArticle,
  ScenarioReadingPrompt,
  ScenarioVocabularyItem,
  UsefulExpression,
} from "./types";

type ListPayload<T> = {
  generatedAt?: string;
  totalItems?: number;
  items?: T[];
};

type ScenarioReport = {
  generatedAt: string;
  resourceRoot: string;
  foreignReadingFilesDetected: number;
  articlesExtracted: number;
  readyScenarioArticles: number;
  articlesNeedingReview: number;
  keyVocabularyExtracted: number;
  usefulExpressionsExtracted: number;
  difficultSentencesExtracted: number;
  scenarioPromptsGenerated: number;
  unsupportedFiles: unknown[];
  warnings: string[];
};

export function getScenarioReadingArticles(): ScenarioReadingArticle[] {
  const privateItems = readPrivateList<ScenarioReadingArticle>("scenario-articles.generated.json");
  return privateItems.length ? privateItems : sampleScenarioReadings;
}

export function getScenarioVocabulary(): ScenarioVocabularyItem[] {
  return readPrivateList<ScenarioVocabularyItem>("scenario-vocabulary.generated.json");
}

export function getScenarioExpressions(): UsefulExpression[] {
  return readPrivateList<UsefulExpression>("scenario-expressions.generated.json");
}

export function getScenarioSentences(): ScenarioDifficultSentence[] {
  return readPrivateList<ScenarioDifficultSentence>("scenario-sentences.generated.json");
}

export function getScenarioPrompts(): ScenarioReadingPrompt[] {
  return readPrivateList<ScenarioReadingPrompt>("scenario-reading-prompts.generated.json");
}

export function getScenarioReadingImportReport(): ScenarioReport | null {
  const reportPath = path.join(process.cwd(), "data", "private", "scenario-reading.import-report.json");
  if (!fs.existsSync(reportPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(reportPath, "utf8")) as ScenarioReport;
  } catch {
    return null;
  }
}

function readPrivateList<T>(fileName: string): T[] {
  const filePath = path.join(process.cwd(), "data", "private", fileName);
  if (!fs.existsSync(filePath)) return [];
  try {
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8")) as ListPayload<T>;
    return Array.isArray(payload.items) ? payload.items : [];
  } catch {
    return [];
  }
}
