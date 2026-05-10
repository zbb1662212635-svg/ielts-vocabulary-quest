import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import type { LearningResource, ResourceIndex } from "../src/lib/resourceTypes";
import type { IELTSTopicRoute, VocabularyItem } from "../src/lib/types";

type ImportReport = {
  generatedAt: string;
  scannedResources: number;
  parsedFiles: number;
  skippedFiles: number;
  unsupportedFiles: Array<{ path: string; reason: string }>;
  totalRawEntries: number;
  totalNormalizedEntries: number;
  totalDuplicatesMerged: number;
  totalNeedsReview: number;
  topWarnings: Array<{ warning: string; count: number }>;
  usable: {
    loadout: number;
    meaningQuiz: number;
    dictation: number;
    synonymArena: number;
  };
};

type RawEntry = Partial<VocabularyItem> & {
  sourceResourceId?: string;
  sourceFileName?: string;
  sourcePath?: string;
};

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultRoot = "C:/Users/zhangbinbin/Desktop/\u5b66\u82f1\u8bed";
const privateDir = path.join(projectRoot, "data", "private");
const outputPath = path.join(privateDir, "vocabulary.generated.json");
const needsReviewPath = path.join(privateDir, "vocabulary.needs-review.json");
const reportPath = path.join(privateDir, "vocabulary.import-report.json");
const resourceIndexPath = path.join(privateDir, "resources.index.json");

const supportedExtensions = new Set([".csv", ".json", ".txt", ".md", ".xls", ".xlsx"]);
const unsupportedInV1 = new Set([".pdf", ".epub", ".mobi", ".azw3"]);

const args = parseArgs(process.argv.slice(2));
loadEnvLocal();

const generatedAt = new Date().toISOString();
const resourceRoot = normalizePath(process.env.LEARNING_RESOURCE_ROOT || defaultRoot);
const inputPath = normalizePath(args.input || path.join(resourceRoot, "vocabulary-books"));
const resourceIndex = readResourceIndex();
const indexedVocabularyResources = resourceIndex.items.filter((item) => item.type === "ielts_vocabulary");
const inputResources = indexedVocabularyResources.length ? indexedVocabularyResources : discoverFallbackResources(inputPath);

const rawEntries: RawEntry[] = [];
const needsReview: Array<Record<string, unknown>> = [];
const unsupportedFiles: ImportReport["unsupportedFiles"] = [];
let parsedFiles = 0;
let skippedFiles = 0;

for (const resource of inputResources) {
  const extension = resource.extension.toLowerCase();
  try {
    if (supportedExtensions.has(extension)) {
      const parsed = parseResource(resource);
      rawEntries.push(...parsed);
      parsedFiles += 1;
    } else if (unsupportedInV1.has(extension)) {
      unsupportedFiles.push({ path: resource.absolutePath, reason: "unsupported_for_v1" });
      needsReview.push({ ...resource, reason: "unsupported_for_v1" });
      skippedFiles += 1;
    } else {
      unsupportedFiles.push({ path: resource.absolutePath, reason: "unsupported_extension" });
      needsReview.push({ ...resource, reason: "unsupported_extension" });
      skippedFiles += 1;
    }
  } catch (error) {
    needsReview.push({ ...resource, reason: "parse_error", message: String(error) });
    skippedFiles += 1;
  }
}

const normalized = rawEntries.map(normalizeEntry).filter(Boolean) as VocabularyItem[];
const suspiciousItems = normalized.filter((item) => (item.importWarnings ?? []).includes("suspicious_word"));
const validItems = normalized.filter((item) => !(item.importWarnings ?? []).includes("suspicious_word"));
const deduped = dedupeVocabulary(validItems);
const suspicious = [...needsReview, ...suspiciousItems];
const report = buildReport({
  generatedAt,
  scannedResources: inputResources.length,
  parsedFiles,
  skippedFiles,
  unsupportedFiles,
  totalRawEntries: rawEntries.length,
  totalNormalizedEntries: deduped.items.length,
  totalDuplicatesMerged: deduped.duplicatesMerged,
  totalNeedsReview: suspicious.length,
  items: deduped.items,
});

writeJson(outputPath, {
  generatedAt,
  source: "private_vocabulary_import",
  totalItems: deduped.items.length,
  items: deduped.items,
});
writeJson(needsReviewPath, {
  generatedAt,
  totalItems: suspicious.length,
  items: suspicious,
});
writeJson(reportPath, report);

console.log("\nVocabulary import complete.\n");
console.log(`Resources scanned: ${inputResources.length}`);
console.log(`Parsed files: ${parsedFiles}`);
console.log(`Unsupported files: ${unsupportedFiles.length}`);
console.log(`Raw entries: ${rawEntries.length}`);
console.log(`Normalized vocabulary: ${deduped.items.length}`);
console.log(`Duplicates merged: ${deduped.duplicatesMerged}`);
console.log(`Needs review: ${suspicious.length}`);
console.log("\nOutput:");
console.log(normalizePath(outputPath));
console.log(normalizePath(needsReviewPath));
console.log(normalizePath(reportPath));

function parseArgs(values: string[]) {
  const result: { input?: string } = {};
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] === "--input") result.input = values[++i];
  }
  return result;
}

function loadEnvLocal() {
  const envPath = path.join(projectRoot, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [rawKey, ...rawValue] = trimmed.split("=");
    const key = rawKey.trim();
    const value = rawValue.join("=").trim().replace(/^"|"$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function readResourceIndex(): ResourceIndex {
  if (!fs.existsSync(resourceIndexPath)) {
    return { metadata: { resourceRoot, scannedAt: "", count: 0, generatedBy: "missing" }, items: [] };
  }
  return JSON.parse(fs.readFileSync(resourceIndexPath, "utf8")) as ResourceIndex;
}

function discoverFallbackResources(input: string): LearningResource[] {
  if (!fs.existsSync(input)) return [];
  const files = walk(input);
  return files.map((filePath) => {
    const stat = fs.statSync(filePath);
    return {
      id: stableId(path.relative(input, filePath)),
      title: cleanTitle(path.basename(filePath, path.extname(filePath))),
      fileName: path.basename(filePath),
      extension: path.extname(filePath).toLowerCase(),
      type: "ielts_vocabulary",
      fileKind: "unknown",
      absolutePath: normalizePath(filePath),
      relativePath: normalizeSlashes(path.relative(resourceRoot, filePath)),
      folder: "vocabulary-books",
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      importedAt: generatedAt,
      topicTags: [],
      skillTags: ["vocabulary"],
      status: "raw",
      warnings: [],
    };
  });
}

function walk(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile()) return [fullPath];
    return [];
  });
}

function parseResource(resource: LearningResource): RawEntry[] {
  const extension = resource.extension.toLowerCase();
  if (extension === ".xls" || extension === ".xlsx") return parseWorkbook(resource);
  if (extension === ".csv") return parseDelimitedText(resource, ",");
  if (extension === ".txt" || extension === ".md") return parsePlainText(resource);
  if (extension === ".json") return parseJson(resource);
  return [];
}

function parseWorkbook(resource: LearningResource): RawEntry[] {
  const workbook = XLSX.readFile(resource.absolutePath);
  const rows = workbook.SheetNames.flatMap((sheetName) =>
    XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[sheetName], { header: 1, raw: false, defval: "" }),
  );
  return rows.flatMap((row) => parseRow(row, resource));
}

function parseDelimitedText(resource: LearningResource, delimiter: string): RawEntry[] {
  const rows = fs
    .readFileSync(resource.absolutePath, "utf8")
    .split(/\r?\n/)
    .map((line) => splitDelimitedLine(line, delimiter));
  const header = rows[0]?.map((cell) => normalizeHeader(cell)) ?? [];
  const hasHeader = header.some((cell) => ["word", "chinesemeaning", "meaning", "translation"].includes(cell));
  return (hasHeader ? rows.slice(1) : rows).flatMap((row) => (hasHeader ? parseHeaderRow(header, row, resource) : parseRow(row, resource)));
}

function parsePlainText(resource: LearningResource): RawEntry[] {
  const lines = fs.readFileSync(resource.absolutePath, "utf8").split(/\r?\n/);
  const entries: RawEntry[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const single = parseVocabularyLine(line, resource);
    if (single) {
      entries.push(single);
      continue;
    }
    const next = lines[i + 1]?.trim() ?? "";
    if (/^[A-Za-z][A-Za-z'’\-\s]{1,60}$/.test(line) && next) {
      const merged = parseVocabularyLine(`${line} ${next}`, resource);
      if (merged) {
        entries.push(merged);
        i += 1;
      }
    }
  }
  return entries;
}

function parseJson(resource: LearningResource): RawEntry[] {
  const payload = JSON.parse(fs.readFileSync(resource.absolutePath, "utf8"));
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload.items) ? payload.items : [];
  return rows.map((row: Record<string, unknown>) => ({
    word: stringValue(row.word),
    chineseMeaning: stringValue(row.chineseMeaning ?? row.meaning ?? row.translation),
    englishDefinition: stringValue(row.englishDefinition ?? row.definition),
    partOfSpeech: splitList(row.partOfSpeech ?? row.pos),
    examples: stringValue(row.example)
      ? [{ sentence: stringValue(row.example), source: resource.fileName, context: "reading", targetWord: stringValue(row.word) }]
      : [],
    synonyms: splitList(row.synonyms),
    collocations: splitList(row.collocations),
    wordFamily: splitList(row.wordFamily),
    skillTags: splitList(row.skillTags) as VocabularyItem["skillTags"],
    topicTags: splitList(row.topicTags ?? row.topic) as VocabularyItem["topicTags"],
    commonMistakes: splitList(row.commonMistakes),
    sourceResourceId: resource.id,
    sourceFileName: resource.fileName,
    sourcePath: resource.relativePath,
  }));
}

function parseHeaderRow(header: string[], row: string[], resource: LearningResource): RawEntry[] {
  const data = Object.fromEntries(header.map((key, index) => [key, row[index] ?? ""]));
  return [
    {
      word: data.word,
      chineseMeaning: data.chinesemeaning || data.meaning || data.translation,
      englishDefinition: data.englishdefinition || data.definition,
      partOfSpeech: splitList(data.partofspeech || data.pos),
      synonyms: splitList(data.synonyms),
      collocations: splitList(data.collocations),
      wordFamily: splitList(data.wordfamily),
      topicTags: splitList(data.topic || data.topictags) as VocabularyItem["topicTags"],
      skillTags: splitList(data.skilltags) as VocabularyItem["skillTags"],
      commonMistakes: splitList(data.commonmistakes),
      sourceResourceId: resource.id,
      sourceFileName: resource.fileName,
      sourcePath: resource.relativePath,
    },
  ];
}

function parseRow(row: string[], resource: LearningResource): RawEntry[] {
  const cells = row.map((cell) => String(cell ?? "").trim()).filter(Boolean);
  if (cells.length < 2) return [];
  const withoutIndex = /^\d+$/.test(cells[0]) ? cells.slice(1) : cells;
  const word = withoutIndex[0] ?? "";
  const rest = withoutIndex.slice(1).join(" ");
  const parsed = parseMeaningAndPos(rest);
  if (!word || !parsed.meaning) return [];
  return [
    {
      word,
      partOfSpeech: parsed.partOfSpeech,
      chineseMeaning: parsed.meaning,
      sourceResourceId: resource.id,
      sourceFileName: resource.fileName,
      sourcePath: resource.relativePath,
    },
  ];
}

function parseVocabularyLine(line: string, resource: LearningResource): RawEntry | null {
  const pipeParts = line.split("|").map((part) => part.trim()).filter(Boolean);
  if (pipeParts.length >= 3) {
    return {
      word: pipeParts[0],
      partOfSpeech: splitList(pipeParts[1]),
      chineseMeaning: pipeParts[2],
      synonyms: pipeParts[3] ? splitList(pipeParts[3]) : [],
      sourceResourceId: resource.id,
      sourceFileName: resource.fileName,
      sourcePath: resource.relativePath,
    };
  }

  const colon = line.match(/^([A-Za-z][A-Za-z'’\-\s]{1,60})[:：]\s*(.+)$/);
  if (colon) {
    return {
      word: colon[1].trim(),
      chineseMeaning: colon[2].trim(),
      sourceResourceId: resource.id,
      sourceFileName: resource.fileName,
      sourcePath: resource.relativePath,
    };
  }

  const inline = line.match(/^([A-Za-z][A-Za-z'’\-]{1,60})\s+(.+)$/);
  if (!inline) return null;
  const parsed = parseMeaningAndPos(inline[2]);
  if (!parsed.meaning) return null;
  return {
    word: inline[1],
    partOfSpeech: parsed.partOfSpeech,
    chineseMeaning: parsed.meaning,
    sourceResourceId: resource.id,
    sourceFileName: resource.fileName,
    sourcePath: resource.relativePath,
  };
}

function normalizeEntry(entry: RawEntry): VocabularyItem | null {
  const word = stringValue(entry.word).trim();
  const normalizedWord = normalizeWord(word);
  const warnings: string[] = [];
  if (!word) return null;
  if (word.length > 60 || !/^[A-Za-z][A-Za-z'’\-\s]*$/.test(word)) warnings.push("suspicious_word");
  const topicTags = dedupe([...(entry.topicTags ?? []), ...inferTopicTags(`${entry.sourcePath ?? ""} ${word} ${entry.chineseMeaning ?? ""}`)]);
  const skillTags = dedupe([...(entry.skillTags?.length ? entry.skillTags : ["reading"]), ...(isListeningRiskWord(word) ? ["listening"] : [])]) as VocabularyItem["skillTags"];
  return {
    id: `private_${stableId(normalizedWord)}`,
    word,
    normalizedWord,
    chineseMeaning: stringValue(entry.chineseMeaning),
    englishDefinition: stringValue(entry.englishDefinition),
    partOfSpeech: entry.partOfSpeech ?? [],
    examples: entry.examples ?? [],
    synonyms: entry.synonyms ?? [],
    antonyms: entry.antonyms ?? [],
    collocations: entry.collocations ?? [],
    wordFamily: entry.wordFamily?.length ? entry.wordFamily : [word],
    commonMistakes: dedupe([...(entry.commonMistakes ?? []), ...commonWrongSpellings(word)]),
    topicTags,
    skillTags,
    sourceLayers: dedupe([...(entry.sourceLayers ?? []), "private_vocabulary"]) as VocabularyItem["sourceLayers"],
    listeningRisk: {
      spellingRisk: isListeningRiskWord(word),
      pluralRisk: entry.partOfSpeech?.some((pos) => pos.toLowerCase().startsWith("n")) ?? false,
      homophoneRisk: false,
      weakFormRisk: false,
      commonWrongSpellings: commonWrongSpellings(word),
    },
    sourceResourceId: entry.sourceResourceId,
    sourceFileName: entry.sourceFileName,
    sourcePath: entry.sourcePath,
    importWarnings: warnings,
  };
}

function dedupeVocabulary(items: VocabularyItem[]) {
  const merged = new Map<string, VocabularyItem>();
  let duplicatesMerged = 0;
  for (const item of items) {
    const key = item.normalizedWord ?? normalizeWord(item.word);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      continue;
    }
    duplicatesMerged += 1;
    merged.set(key, {
      ...existing,
      chineseMeaning: mergeText(existing.chineseMeaning, item.chineseMeaning),
      englishDefinition: mergeText(existing.englishDefinition ?? "", item.englishDefinition ?? ""),
      partOfSpeech: dedupe([...existing.partOfSpeech, ...item.partOfSpeech]),
      examples: dedupeExamples([...existing.examples, ...item.examples]),
      synonyms: dedupe([...existing.synonyms, ...item.synonyms]),
      antonyms: dedupe([...(existing.antonyms ?? []), ...(item.antonyms ?? [])]),
      collocations: dedupe([...existing.collocations, ...item.collocations]),
      wordFamily: dedupe([...existing.wordFamily, ...item.wordFamily]),
      topicTags: dedupe([...existing.topicTags, ...item.topicTags]),
      skillTags: dedupe([...existing.skillTags, ...item.skillTags]) as VocabularyItem["skillTags"],
      sourceLayers: dedupe([...existing.sourceLayers, ...item.sourceLayers]) as VocabularyItem["sourceLayers"],
      commonMistakes: dedupe([...(existing.commonMistakes ?? []), ...(item.commonMistakes ?? [])]),
      importWarnings: dedupe([...(existing.importWarnings ?? []), ...(item.importWarnings ?? [])]),
    });
  }
  return { items: [...merged.values()].sort((a, b) => a.word.localeCompare(b.word)), duplicatesMerged };
}

function buildReport(input: Omit<ImportReport, "topWarnings" | "usable"> & { items: VocabularyItem[] }): ImportReport {
  const warningCounts = new Map<string, number>();
  input.items.forEach((item) => (item.importWarnings ?? []).forEach((warning) => warningCounts.set(warning, (warningCounts.get(warning) ?? 0) + 1)));
  return {
    generatedAt: input.generatedAt,
    scannedResources: input.scannedResources,
    parsedFiles: input.parsedFiles,
    skippedFiles: input.skippedFiles,
    unsupportedFiles: input.unsupportedFiles,
    totalRawEntries: input.totalRawEntries,
    totalNormalizedEntries: input.totalNormalizedEntries,
    totalDuplicatesMerged: input.totalDuplicatesMerged,
    totalNeedsReview: input.totalNeedsReview,
    topWarnings: [...warningCounts.entries()].map(([warning, count]) => ({ warning, count })).sort((a, b) => b.count - a.count),
    usable: {
      loadout: input.items.filter((item) => item.word).length,
      meaningQuiz: input.items.filter((item) => item.word && item.chineseMeaning).length,
      dictation: input.items.filter((item) => item.word).length,
      synonymArena: input.items.filter((item) => item.synonyms.length > 0).length,
    },
  };
}

function parseMeaningAndPos(value: string): { partOfSpeech: string[]; meaning: string } {
  const posMatch = value.trim().match(/^((?:n|v|vt|vi|a|adj|ad|adv|prep|conj|pron)\.?(?:\/(?:n|v|vt|vi|a|adj|ad|adv|prep|conj|pron)\.?)*)\s*(.*)$/i);
  if (!posMatch) return { partOfSpeech: [], meaning: value.trim() };
  return { partOfSpeech: normalizePos(posMatch[1]), meaning: posMatch[2].trim() };
}

function normalizePos(value: string): string[] {
  const map: Record<string, string> = {
    n: "noun",
    v: "verb",
    vt: "verb",
    vi: "verb",
    a: "adjective",
    adj: "adjective",
    ad: "adverb",
    adv: "adverb",
    prep: "preposition",
    conj: "conjunction",
    pron: "pronoun",
  };
  return dedupe(value.split(/[\/,;；，\s]+/).map((part) => map[part.replace(/\./g, "").toLowerCase()] ?? part).filter(Boolean));
}

function inferTopicTags(value: string): IELTSTopicRoute[] {
  const text = value.toLowerCase();
  const rules: Array<[IELTSTopicRoute, string[]]> = [
    ["science_technology", ["science", "technology", "ai", "robot", "space", "energy", "research", "data", "internet", "medical"]],
    ["art_culture", ["art", "culture", "museum", "exhibition", "music", "film", "heritage", "gallery"]],
    ["environment_nature", ["environment", "climate", "pollution", "species", "conservation", "ecosystem", "nature", "animal"]],
    ["education_learning", ["education", "university", "student", "course", "exam", "learning", "school"]],
    ["health_lifestyle", ["health", "sleep", "stress", "diet", "exercise", "hospital", "mental"]],
    ["work_business", ["work", "business", "company", "market", "advertising", "consumer", "management"]],
    ["cities_transport", ["city", "urban", "transport", "traffic", "housing", "infrastructure", "route"]],
    ["media_communication", ["media", "news", "communication", "social media", "public speaking", "language"]],
    ["history_society", ["history", "society", "archaeology", "tradition", "family", "community", "population"]],
    ["travel_daily_services", ["accommodation", "hotel", "rent", "booking", "reservation", "library", "appointment", "tour", "ticket"]],
  ];
  return rules.filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword))).map(([route]) => route);
}

function isListeningRiskWord(word: string): boolean {
  const normalized = normalizeWord(word);
  return (
    normalized.length >= 9 ||
    /([a-z])\1/.test(normalized) ||
    /(tion|sion|ough|eigh|ph|que|gue)/.test(normalized) ||
    [
      "accommodation",
      "appointment",
      "reservation",
      "february",
      "wednesday",
      "laboratory",
      "conference",
      "membership",
      "environment",
      "government",
      "restaurant",
      "questionnaire",
    ].includes(normalized)
  );
}

function commonWrongSpellings(word: string): string[] {
  const map: Record<string, string[]> = {
    accommodation: ["acommodation", "accomodation"],
    february: ["Febuary"],
    wednesday: ["Wensday", "Wednsday"],
    government: ["goverment"],
    environment: ["enviroment"],
  };
  return map[normalizeWord(word)] ?? [];
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((part) => part.trim());
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function splitList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(stringValue).filter(Boolean);
  return stringValue(value).split(/[;,；，、|/]+/).map((part) => part.trim()).filter(Boolean);
}

function stringValue(value: unknown): string {
  return String(value ?? "").trim();
}

function dedupe<T extends string>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (!item || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeExamples(items: VocabularyItem["examples"]): VocabularyItem["examples"] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.sentence.toLowerCase();
    if (!item.sentence || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeText(a: string, b: string): string {
  if (!a) return b;
  if (!b || a.includes(b)) return a;
  return `${a}；${b}`;
}

function normalizeWord(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function stableId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "vocabulary";
}

function cleanTitle(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled";
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
