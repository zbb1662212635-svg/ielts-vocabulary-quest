import fs from "node:fs";
import path from "node:path";
import sampleVocabulary from "@/data/vocabulary.sample.json";
import type { VocabularyItem } from "./types";
import { isDictationUsable, isSynonymUsable, isWordEncounterUsable, normalizeVocabulary } from "./vocabularyHealth";

type VocabularyPayload = {
  generatedAt?: string;
  source?: string;
  totalItems?: number;
  metadata?: Record<string, unknown>;
  items?: Partial<VocabularyItem>[];
};

const emergencyVocabulary: Partial<VocabularyItem>[] = [
  {
    id: "emergency_accommodation",
    word: "accommodation",
    chineseMeaning: "住宿",
    partOfSpeech: ["noun"],
    topicTags: ["travel_daily_services"],
    skillTags: ["reading", "listening"],
    sourceLayers: ["private_vocabulary"],
    examples: [],
    synonyms: ["housing"],
    collocations: ["student accommodation"],
    wordFamily: ["accommodation"],
    listeningRisk: {
      spellingRisk: true,
      pluralRisk: false,
      homophoneRisk: false,
      weakFormRisk: false,
      commonWrongSpellings: ["acommodation", "accomodation"],
    },
  },
  {
    id: "emergency_environment",
    word: "environment",
    chineseMeaning: "环境",
    partOfSpeech: ["noun"],
    topicTags: ["environment_nature"],
    skillTags: ["reading", "listening"],
    sourceLayers: ["private_vocabulary"],
    examples: [],
    synonyms: ["surroundings"],
    collocations: ["protect the environment"],
    wordFamily: ["environmental"],
    listeningRisk: {
      spellingRisk: true,
      pluralRisk: false,
      homophoneRisk: false,
      weakFormRisk: false,
      commonWrongSpellings: ["enviroment"],
    },
  },
];

export function getVocabularyItems(): VocabularyItem[] {
  const privateItems = loadPrivateVocabulary();
  if (privateItems.length) return privateItems;

  const sampleItems = normalizeVocabulary(sampleVocabulary as Partial<VocabularyItem>[]);
  if (sampleItems.length) return sampleItems;

  return normalizeVocabulary(emergencyVocabulary);
}

export function getUsableVocabularyForLoadout(): VocabularyItem[] {
  return getVocabularyItems().filter((item) => Boolean(item.word));
}

export function getUsableVocabularyForMeaningQuiz(): VocabularyItem[] {
  return getVocabularyItems().filter(isWordEncounterUsable);
}

export function getUsableVocabularyForDictation(): VocabularyItem[] {
  const items = getVocabularyItems();
  const preferred = items.filter(isDictationUsable);
  return preferred.length ? preferred : items.filter((item) => Boolean(item.word));
}

export function getUsableVocabularyForSynonyms(): VocabularyItem[] {
  return getVocabularyItems().filter(isSynonymUsable);
}

export function getVocabularySource(): "private" | "sample" | "emergency" {
  if (loadPrivateVocabulary().length) return "private";
  if ((sampleVocabulary as VocabularyItem[]).length) return "sample";
  return "emergency";
}

function loadPrivateVocabulary(): VocabularyItem[] {
  if (process.env.NEXT_PUBLIC_USE_PRIVATE_RESOURCES !== "true" && process.env.VOCAB_SOURCE !== "private") return [];
  const filePath = path.join(process.cwd(), "data", "private", "vocabulary.generated.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8")) as VocabularyPayload;
    return normalizeVocabulary(payload.items ?? []);
  } catch {
    return [];
  }
}
