import fs from "node:fs";
import path from "node:path";
import { getSampleIELTSReadingQuestions, getSampleReadingAnswerKeys, getSampleReadingPassages } from "./sampleReadingAssets";
import type { IELTSReadingQuestion, ReadingAnswerKey, ReadingPassage } from "./types";

type ListPayload<T> = { generatedAt?: string; totalItems?: number; items?: T[] };

function privateFilePath(fileName: string) {
  return path.join(process.cwd(), "data", "private", fileName);
}

function readPrivateList<T>(fileName: string): T[] {
  const filePath = privateFilePath(fileName);
  if (!fs.existsSync(filePath)) return [];
  try {
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8")) as ListPayload<T>;
    return Array.isArray(payload.items) ? payload.items : [];
  } catch (error) {
    console.warn(`Failed to read private reading asset ${fileName}.`, error);
    return [];
  }
}

export function getReadingPassages(): ReadingPassage[] {
  const privateItems = readPrivateList<ReadingPassage>("reading-passages.generated.json");
  return privateItems.length ? privateItems : getSampleReadingPassages();
}

export function getIELTSReadingQuestions(): IELTSReadingQuestion[] {
  const privateItems = readPrivateList<IELTSReadingQuestion>("reading-questions.generated.json");
  return privateItems.length ? privateItems : getSampleIELTSReadingQuestions();
}

export function getReadingAnswerKeys(): ReadingAnswerKey[] {
  const privateItems = readPrivateList<ReadingAnswerKey>("reading-answer-keys.generated.json");
  return privateItems.length ? privateItems : getSampleReadingAnswerKeys();
}

export function getReadingAssetSource(): "private" | "sample" {
  return readPrivateList<ReadingPassage>("reading-passages.generated.json").length ? "private" : "sample";
}

export function getReadingImportReport() {
  const reportPath = privateFilePath("reading.import-report.json");
  if (!fs.existsSync(reportPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(reportPath, "utf8")) as Record<string, unknown>;
  } catch (error) {
    console.warn("Failed to read reading import report.", error);
    return null;
  }
}
