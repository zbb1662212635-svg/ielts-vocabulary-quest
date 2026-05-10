import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AudioFileFormat, AudioTrack, DictationItem, IELTSTopicRoute, Transcript, TranscriptFormat, TranscriptSegment, VocabularyItem } from "../src/lib/types";
import type { ResourceIndex } from "../src/lib/resourceTypes";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultRoot = "C:/Users/zhangbinbin/Desktop/\u5b66\u82f1\u8bed";
const privateDir = path.join(projectRoot, "data", "private");
const resourceIndexPath = path.join(privateDir, "resources.index.json");
const vocabularyPath = path.join(privateDir, "vocabulary.generated.json");

const audioOutput = path.join(privateDir, "audio.index.json");
const transcriptOutput = path.join(privateDir, "transcripts.index.json");
const dictationOutput = path.join(privateDir, "dictation.generated.json");
const reportOutput = path.join(privateDir, "audio.import-report.json");
const needsReviewOutput = path.join(privateDir, "audio.needs-review.json");

const audioExtensions = new Set([".mp3", ".m4a", ".wav", ".flac", ".aac"]);
const transcriptExtensions = new Set([".txt", ".md", ".srt", ".vtt", ".json", ".csv"]);

const args = parseArgs(process.argv.slice(2));
loadEnvLocal();

const generatedAt = new Date().toISOString();
const resourceRoot = normalizePath(process.env.LEARNING_RESOURCE_ROOT || defaultRoot);
const index = readResourceIndex();
const audioInput = args.audio ? normalizePath(args.audio) : "";
const transcriptInput = args.transcripts ? normalizePath(args.transcripts) : path.join(resourceRoot, "transcripts");
const limit = Number(args.limit ?? 200);
const warnings: string[] = [];

const audioResources = audioInput
  ? discoverFiles(audioInput, audioExtensions).map((file) => fileToAudio(file, resourceRoot, generatedAt))
  : index.items.filter((item) => item.fileKind === "audio" || audioExtensions.has(item.extension)).map((item) => resourceToAudio(item, generatedAt));

const transcriptFiles = fs.existsSync(transcriptInput) ? discoverFiles(transcriptInput, transcriptExtensions) : [];
if (!fs.existsSync(transcriptInput)) warnings.push("Transcripts folder is missing. Audio indexed, but dictation generation is limited without transcripts.");

const transcripts = transcriptFiles.map((file) => parseTranscriptFile(file, resourceRoot));
matchAudioAndTranscripts(audioResources, transcripts);

const transcriptDictation = transcripts.flatMap((transcript) => generateDictationFromTranscript(transcript)).slice(0, limit);
const fallbackDictation = transcriptDictation.length ? [] : generateVocabularyFallbackDictation(limit);
const dictationItems = [...transcriptDictation, ...fallbackDictation];

const needsReview = [
  ...audioResources.filter((audio) => !audio.matchedTranscriptId).map((audio) => ({ type: "unmatched_audio", id: audio.id, path: audio.relativePath })),
  ...transcripts.filter((transcript) => !transcript.matchedAudioId).map((transcript) => ({ type: "unmatched_transcript", id: transcript.id, path: transcript.relativePath })),
];

const report = {
  generatedAt,
  resourceRoot,
  audioFilesDetected: audioResources.length,
  transcriptsDetected: transcripts.length,
  matchedPairs: audioResources.filter((audio) => audio.matchedTranscriptId).length,
  unmatchedAudio: audioResources.filter((audio) => !audio.matchedTranscriptId).length,
  unmatchedTranscripts: transcripts.filter((transcript) => !transcript.matchedAudioId).length,
  dictationItemsGenerated: dictationItems.length,
  needsReview: needsReview.length,
  unsupportedFiles: [],
  warnings,
};

writeJson(audioOutput, { generatedAt, totalItems: audioResources.length, items: audioResources });
writeJson(transcriptOutput, { generatedAt, totalItems: transcripts.length, items: transcripts });
writeJson(dictationOutput, { generatedAt, totalItems: dictationItems.length, items: dictationItems });
writeJson(reportOutput, report);
writeJson(needsReviewOutput, { generatedAt, totalItems: needsReview.length, items: needsReview });

console.log("\nAudio import complete.\n");
console.log(`Audio files detected: ${report.audioFilesDetected}`);
console.log(`Transcripts detected: ${report.transcriptsDetected}`);
console.log(`Matched pairs: ${report.matchedPairs}`);
console.log(`Dictation items generated: ${report.dictationItemsGenerated}`);
console.log(`Needs review: ${report.needsReview}`);
console.log("\nOutput:");
console.log(normalizePath(audioOutput));
console.log(normalizePath(transcriptOutput));
console.log(normalizePath(dictationOutput));
console.log(normalizePath(reportOutput));
console.log(normalizePath(needsReviewOutput));

function parseArgs(values: string[]) {
  const result: { audio?: string; transcripts?: string; limit?: string } = {};
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] === "--audio") result.audio = values[++i];
    else if (values[i] === "--transcripts") result.transcripts = values[++i];
    else if (values[i] === "--limit") result.limit = values[++i];
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

function discoverFiles(root: string, extensions: Set<string>): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) return discoverFiles(full, extensions);
    if (entry.isFile() && extensions.has(path.extname(full).toLowerCase())) return [full];
    return [];
  });
}

function resourceToAudio(resource: ResourceIndex["items"][number], importedAt: string): AudioTrack {
  return {
    id: resource.id,
    title: resource.title,
    fileName: resource.fileName,
    extension: resource.extension,
    format: audioFormat(resource.extension),
    absolutePath: resource.absolutePath,
    relativePath: resource.relativePath,
    sizeBytes: resource.sizeBytes,
    modifiedAt: resource.modifiedAt,
    importedAt,
    sourceResourceId: resource.id,
    topicTags: resource.topicTags as IELTSTopicRoute[],
    skillTags: ["listening", "dictation"],
    status: "indexed",
    warnings: resource.warnings,
  };
}

function fileToAudio(filePath: string, root: string, importedAt: string): AudioTrack {
  const stat = fs.statSync(filePath);
  const relativePath = normalizeSlashes(path.relative(root, filePath));
  return {
    id: stableId(relativePath),
    title: cleanTitle(path.basename(filePath, path.extname(filePath))),
    fileName: path.basename(filePath),
    extension: path.extname(filePath).toLowerCase(),
    format: audioFormat(path.extname(filePath)),
    absolutePath: normalizePath(filePath),
    relativePath,
    sizeBytes: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    importedAt,
    topicTags: inferTopicTags(relativePath),
    skillTags: ["listening", "dictation"],
    status: "indexed",
    warnings: [],
  };
}

function parseTranscriptFile(filePath: string, root: string): Transcript {
  const extension = path.extname(filePath).toLowerCase();
  const text = fs.readFileSync(filePath, "utf8");
  const relativePath = normalizeSlashes(path.relative(root, filePath));
  const id = stableId(relativePath);
  const segments = parseTranscriptSegments(text, extension, id);
  return {
    id,
    title: cleanTitle(path.basename(filePath, extension)),
    fileName: path.basename(filePath),
    format: transcriptFormat(extension),
    absolutePath: normalizePath(filePath),
    relativePath,
    text,
    segments,
    topicTags: inferTopicTags(relativePath),
    skillTags: ["listening", "reading", "dictation"],
    status: segments.length ? "parsed" : "needs_review",
    warnings: segments.length ? [] : ["empty_transcript"],
  };
}

function parseTranscriptSegments(text: string, extension: string, transcriptId: string): TranscriptSegment[] {
  if (extension === ".srt" || extension === ".vtt") return parseTimedSegments(text, transcriptId);
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const sentences = lines.flatMap((line) => line.split(/(?<=[.!?])\s+/)).map((item) => item.trim()).filter((item) => item.length >= 8);
  return sentences.map((sentence, index) => ({ id: `${transcriptId}_seg_${index + 1}`, transcriptId, index, text: sentence }));
}

function parseTimedSegments(text: string, transcriptId: string): TranscriptSegment[] {
  const blocks = text.split(/\r?\n\r?\n/);
  const segments: TranscriptSegment[] = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const [start, end] = lines[timingIndex].split("-->").map((item) => parseTimestamp(item.trim()));
    const text = lines.slice(timingIndex + 1).join(" ").trim();
    if (!text) continue;
    segments.push({ id: `${transcriptId}_seg_${segments.length + 1}`, transcriptId, index: segments.length, startTime: start, endTime: end, text });
  }
  return segments;
}

function matchAudioAndTranscripts(audio: AudioTrack[], transcripts: Transcript[]) {
  for (const track of audio) {
    const ranked = transcripts
      .map((transcript) => ({ transcript, confidence: filenameSimilarity(track.fileName, transcript.fileName) }))
      .sort((a, b) => b.confidence - a.confidence);
    const best = ranked[0];
    if (!best || best.confidence < 0.65) continue;
    track.matchedTranscriptId = best.transcript.id;
    track.status = "matched";
    best.transcript.matchedAudioId = track.id;
    best.transcript.status = "matched";
    best.transcript.segments = best.transcript.segments.map((segment) => ({ ...segment, audioId: track.id }));
  }
}

function generateDictationFromTranscript(transcript: Transcript): DictationItem[] {
  return transcript.segments.flatMap((segment) => {
    const items: DictationItem[] = [];
    const sentence = segment.text.replace(/\s+/g, " ").trim();
    const words = sentence.match(/\b[A-Za-z][A-Za-z'-]{5,}\b/g) ?? [];
    const risky = words.filter((word) => isListeningRiskWord(word)).slice(0, 2);
    risky.forEach((word) => items.push(buildDictationItem(word, "word", transcript, segment)));
    if (sentence.split(/\s+/).length >= 6 && sentence.split(/\s+/).length <= 16) {
      items.push(buildDictationItem(sentence, "sentence", transcript, segment));
    }
    return items;
  });
}

function generateVocabularyFallbackDictation(limit: number): DictationItem[] {
  if (!fs.existsSync(vocabularyPath)) return [];
  const payload = JSON.parse(fs.readFileSync(vocabularyPath, "utf8")) as { items?: VocabularyItem[] };
  return (payload.items ?? [])
    .filter((item) => item.word && (item.listeningRisk?.spellingRisk || item.word.length >= 9))
    .slice(0, limit)
    .map((item, index) => ({
      id: `vocab_fallback_${stableId(item.word)}_${index}`,
      text: item.word,
      answer: item.word,
      chineseMeaning: item.chineseMeaning,
      topicTags: (item.topicTags ?? []) as IELTSTopicRoute[],
      skillTags: ["listening", "dictation", "spelling"],
      difficulty: item.word.length >= 12 ? 4 : 3,
      itemType: "word",
      source: "vocabulary_fallback",
      commonMistakes: item.commonMistakes ?? item.listeningRisk?.commonWrongSpellings ?? [],
      status: "ready",
      warnings: ["generated_without_transcript"],
    }));
}

function buildDictationItem(text: string, itemType: DictationItem["itemType"], transcript: Transcript, segment: TranscriptSegment): DictationItem {
  return {
    id: `dict_${segment.id}_${stableId(text).slice(0, 40)}`,
    audioId: segment.audioId,
    transcriptId: transcript.id,
    segmentId: segment.id,
    text,
    answer: text,
    audioStart: segment.startTime,
    audioEnd: segment.endTime,
    topicTags: transcript.topicTags,
    skillTags: ["listening", "dictation", "spelling"],
    difficulty: itemType === "sentence" ? 4 : 3,
    itemType,
    source: "private_transcript",
    status: "ready",
    warnings: segment.audioId ? [] : ["no_audio_segment"],
  };
}

function filenameSimilarity(a: string, b: string): number {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.85;
  const xTokens = new Set(x.split(" "));
  const yTokens = new Set(y.split(" "));
  const common = [...xTokens].filter((token) => yTokens.has(token)).length;
  return common / Math.max(xTokens.size, yTokens.size, 1);
}

function normalizeName(value: string): string {
  return path
    .basename(value, path.extname(value))
    .toLowerCase()
    .replace(/\bsection\b/g, "s")
    .replace(/\btest\b/g, "t")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTimestamp(value: string): number {
  const clean = value.replace(",", ".");
  const parts = clean.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function audioFormat(extension: string): AudioFileFormat {
  const value = extension.replace(".", "").toLowerCase();
  return ["mp3", "m4a", "wav", "flac", "aac"].includes(value) ? (value as AudioFileFormat) : "unknown";
}

function transcriptFormat(extension: string): TranscriptFormat {
  const value = extension.replace(".", "").toLowerCase();
  return ["txt", "md", "srt", "vtt", "json", "csv"].includes(value) ? (value as TranscriptFormat) : "unknown";
}

function isListeningRiskWord(word: string): boolean {
  return word.length >= 9 || /([a-z])\1/i.test(word) || /(tion|sion|ough|eigh|ph|que|gue)$/i.test(word);
}

function inferTopicTags(value: string): IELTSTopicRoute[] {
  const text = value.toLowerCase();
  const rules: Array<[IELTSTopicRoute, string[]]> = [
    ["travel_daily_services", ["accommodation", "reservation", "appointment", "library", "tour", "ticket"]],
    ["education_learning", ["student", "university", "course", "school", "exam"]],
    ["science_technology", ["science", "technology", "energy", "research", "internet"]],
    ["environment_nature", ["environment", "climate", "pollution", "animal"]],
    ["health_lifestyle", ["health", "hospital", "exercise", "stress"]],
    ["work_business", ["business", "company", "market", "work"]],
    ["cities_transport", ["transport", "traffic", "city", "urban"]],
    ["media_communication", ["media", "news", "communication"]],
    ["history_society", ["history", "society", "community"]],
    ["art_culture", ["art", "music", "museum", "film"]],
  ];
  return rules.filter(([, keys]) => keys.some((key) => text.includes(key))).map(([route]) => route);
}

function cleanTitle(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled audio";
}

function stableId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "audio";
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
