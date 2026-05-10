import fs from "node:fs";
import path from "node:path";
import type { AudioTrack, DictationItem, Transcript } from "./types";

type ListPayload<T> = {
  generatedAt?: string;
  totalItems?: number;
  items?: T[];
};

export function getAudioTracks(): AudioTrack[] {
  return readPrivateList<AudioTrack>("audio.index.json");
}

export function getTranscripts(): Transcript[] {
  return readPrivateList<Transcript>("transcripts.index.json");
}

export function getDictationItems(): DictationItem[] {
  const items = readPrivateList<DictationItem>("dictation.generated.json");
  if (items.length) return items;
  return [
    {
      id: "sample_dictation_accommodation",
      text: "accommodation",
      answer: "accommodation",
      chineseMeaning: "住宿",
      topicTags: ["travel_daily_services"],
      skillTags: ["listening", "dictation", "spelling"],
      difficulty: 3,
      itemType: "word",
      source: "sample",
      commonMistakes: ["acommodation", "accomodation"],
      status: "ready",
      warnings: [],
    },
  ];
}

export function getAudioImportReport() {
  const reportPath = path.join(process.cwd(), "data", "private", "audio.import-report.json");
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
