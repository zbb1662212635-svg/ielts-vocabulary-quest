import fs from "node:fs";
import path from "node:path";
import type { IELTSReadingQuestion, ReadingAnswerKey, ReadingPassage } from "./types";

type ListPayload<T> = {
  generatedAt?: string;
  totalItems?: number;
  items?: T[];
};

export function getReadingPassages(): ReadingPassage[] {
  return readPrivateList<ReadingPassage>("reading-passages.generated.json");
}

export function getIELTSReadingQuestions(): IELTSReadingQuestion[] {
  return readPrivateList<IELTSReadingQuestion>("reading-questions.generated.json");
}

export function getReadingAnswerKeys(): ReadingAnswerKey[] {
  return readPrivateList<ReadingAnswerKey>("reading-answer-keys.generated.json");
}

export function getReadingImportReport() {
  const reportPath = path.join(process.cwd(), "data", "private", "reading.import-report.json");
  if (!fs.existsSync(reportPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(reportPath, "utf8")) as Record<string, unknown>;
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
