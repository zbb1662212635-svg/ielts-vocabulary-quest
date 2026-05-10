import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LearningResource, ResourceFileKind, ResourceHealth, ResourceIndex, ResourceType } from "../src/lib/resourceTypes";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultRoot = "C:/Users/zhangbinbin/Desktop/\u5b66\u82f1\u8bed";
const outputDir = path.join(projectRoot, "data", "private");
const indexOutput = path.join(outputDir, "resources.index.json");
const healthOutput = path.join(outputDir, "resource-health.json");

const expectedFolders = [
  "ielts-papers",
  "vocabulary-books",
  "listening-audio",
  "transcripts",
  "answer-keys",
  "magazines",
  "foreign-reading",
  "processed-notes",
] as const;

const folderAliases: Record<string, string[]> = {
  "ielts-papers": [
    "\u301001\u3011\u5251\u6865\u96c5\u601d1-18(\u771f\u9898\uff0b\u89e3\u6790+\u97f3\u9891)",
    "\u301002\u3011\u5251\u6865\u96c5\u601d\u771f\u9898\u5408\u96c6\u3010A\u7c7b\u5b66\u672f\u7c7b\u3011",
  ],
  "vocabulary-books": ["06.\u96c5\u601d\u8bcd\u6c47"],
  "listening-audio": ["\u301001\u3011\u5251\u6865\u96c5\u601d1-18(\u771f\u9898\uff0b\u89e3\u6790+\u97f3\u9891)"],
  magazines: ["\u5916\u520a"],
  "foreign-reading": ["\u5916\u520a"],
};

const folderTypes: Record<string, ResourceType> = {
  "ielts-papers": "ielts_past_paper",
  "vocabulary-books": "ielts_vocabulary",
  "listening-audio": "ielts_listening_audio",
  transcripts: "ielts_transcript",
  "answer-keys": "answer_key",
  magazines: "foreign_magazine",
  "foreign-reading": "foreign_magazine",
  "processed-notes": "user_note",
};

const skillTagsByFolder: Record<string, LearningResource["skillTags"]> = {
  "ielts-papers": ["reading", "listening"],
  "vocabulary-books": ["vocabulary"],
  "listening-audio": ["listening"],
  transcripts: ["listening", "reading"],
  "answer-keys": ["review"],
  magazines: ["reading"],
  "foreign-reading": ["reading"],
  "processed-notes": ["review"],
};

const args = parseArgs(process.argv.slice(2));
loadEnvLocal();

const resourceRoot = normalizePath(args.input || process.env.LEARNING_RESOURCE_ROOT || defaultRoot);
const scannedAt = new Date().toISOString();
const warnings: string[] = [];

if (!process.env.LEARNING_RESOURCE_ROOT && !args.input) {
  warnings.push(`LEARNING_RESOURCE_ROOT is not configured. Please set it to ${defaultRoot}`);
}

if (!fs.existsSync(resourceRoot)) {
  warnings.push(`Resource root not found: ${resourceRoot}`);
  const health = buildEmptyHealth(resourceRoot, scannedAt, warnings);
  writeJson(indexOutput, { metadata: { resourceRoot, scannedAt, count: 0, generatedBy: "scripts/index-resources.ts" }, items: [] });
  writeJson(healthOutput, health);
  printSummary(health, indexOutput, healthOutput);
  process.exit(0);
}

const folderResolutions = expectedFolders.map((folder) => ({
  folder,
  resolvedPaths: resolveFolders(resourceRoot, folder),
}));

const items: LearningResource[] = [];

const seenFiles = new Set<string>();

for (const folderInfo of folderResolutions) {
  if (!folderInfo.resolvedPaths.length) continue;
  const files = folderInfo.resolvedPaths.flatMap((folderPath) => safeWalk(folderPath, warnings));
  for (const filePath of files) {
    const normalizedFilePath = normalizePath(filePath).toLowerCase();
    if (seenFiles.has(normalizedFilePath)) continue;
    seenFiles.add(normalizedFilePath);
    const item = toResourceItem(filePath, folderInfo.folder, resourceRoot, scannedAt);
    items.push(item);
  }
}

items.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

const health: ResourceHealth = {
  resourceRoot,
  scannedAt,
  rootExists: true,
  totalFiles: items.length,
  byType: countBy(items, (item) => item.type),
  byFileKind: countBy(items, (item) => item.fileKind),
  byFolder: countBy(items, (item) => item.folder),
  missingExpectedFolders: folderResolutions.filter((item) => !item.resolvedPaths.length).map((item) => item.folder),
  detectedExpectedFolders: folderResolutions.filter((item) => item.resolvedPaths.length).map((item) => item.folder),
  warnings,
};

const index: ResourceIndex = {
  metadata: {
    resourceRoot,
    scannedAt,
    count: items.length,
    generatedBy: "scripts/index-resources.ts",
  },
  items,
};

writeJson(indexOutput, index);
writeJson(healthOutput, health);
printSummary(health, indexOutput, healthOutput);

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

function resolveFolders(root: string, folder: string): string[] {
  const candidates = [folder, ...(folderAliases[folder] ?? [])];
  const resolved: string[] = [];
  for (const candidate of candidates) {
    const candidatePath = path.join(root, candidate);
    if (fs.existsSync(candidatePath)) resolved.push(candidatePath);
  }
  return [...new Set(resolved.map((item) => normalizePath(item)))];
}

function safeWalk(root: string, warnings: string[]): string[] {
  try {
    return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const fullPath = path.join(root, entry.name);
      try {
        if (entry.isDirectory()) return safeWalk(fullPath, warnings);
        if (entry.isFile()) return [fullPath];
      } catch (error) {
        warnings.push(`Skipped unreadable path: ${normalizePath(fullPath)} (${String(error)})`);
      }
      return [];
    });
  } catch (error) {
    warnings.push(`Skipped unreadable folder: ${normalizePath(root)} (${String(error)})`);
    return [];
  }
}

function toResourceItem(filePath: string, sourceFolder: string, resourceRoot: string, scannedAt: string): LearningResource {
  const stat = fs.statSync(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);
  const fileKind = inferFileKind(extension);
  const folder = inferEffectiveFolder(sourceFolder, fileKind);
  const title = cleanTitle(path.basename(fileName, extension));
  const relativePath = normalizePath(path.relative(resourceRoot, filePath));
  const warnings = buildWarnings(filePath, fileKind, stat.size);
  return {
    id: stableId(relativePath),
    title,
    fileName,
    extension,
    type: folderTypes[folder] ?? "unknown",
    fileKind,
    absolutePath: normalizePath(filePath),
    relativePath,
    folder,
    sizeBytes: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    importedAt: scannedAt,
    topicTags: inferTopicTags(`${folder} ${relativePath} ${title}`),
    skillTags: skillTagsByFolder[folder] ?? [],
    level: inferLevel(`${relativePath} ${title}`),
    status: warnings.length ? "needs_review" : "indexed",
    warnings,
  };
}

function inferEffectiveFolder(sourceFolder: string, fileKind: ResourceFileKind): string {
  if (sourceFolder === "ielts-papers" && fileKind === "audio") return "listening-audio";
  if (sourceFolder === "listening-audio" && fileKind !== "audio") return "ielts-papers";
  return sourceFolder;
}

function inferFileKind(extension: string): ResourceFileKind {
  if ([".pdf"].includes(extension)) return "document";
  if ([".epub", ".mobi", ".azw3"].includes(extension)) return "ebook";
  if ([".mp3", ".m4a", ".wav", ".flac", ".aac"].includes(extension)) return "audio";
  if ([".txt", ".md", ".docx"].includes(extension)) return "text";
  if ([".csv", ".json", ".xls", ".xlsx"].includes(extension)) return "structured_data";
  return "unknown";
}

function inferTopicTags(value: string): string[] {
  const text = value.toLowerCase();
  const rules: Array<[string, string[]]> = [
    ["travel_daily_services", ["accommodation", "housing", "rent", "hotel", "tour", "booking", "library"]],
    ["education_learning", ["education", "university", "student", "course", "exam", "school"]],
    ["science_technology", ["science", "technology", "ai", "robot", "energy", "space"]],
    ["environment_nature", ["environment", "climate", "pollution", "species", "conservation"]],
    ["health_lifestyle", ["health", "sleep", "stress", "diet", "hospital"]],
    ["work_business", ["business", "work", "advertising", "market", "company"]],
    ["cities_transport", ["transport", "city", "traffic", "urban"]],
    ["media_communication", ["media", "communication", "news", "internet"]],
    ["history_society", ["history", "society", "culture", "archaeology"]],
    ["art_culture", ["art", "museum", "exhibition", "music", "film"]],
  ];
  const tags = rules.filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword))).map(([tag]) => tag);
  return tags.length ? tags : ["general"];
}

function inferLevel(value: string): LearningResource["level"] {
  const text = value.toLowerCase();
  if (text.includes("advanced") || text.includes("c1")) return "C1";
  if (text.includes("basic") || text.includes("b1")) return "B1";
  return "B2";
}

function buildWarnings(filePath: string, fileKind: ResourceFileKind, sizeBytes: number): string[] {
  const warnings: string[] = [];
  if (fileKind === "unknown") warnings.push("unknown_file_kind");
  if (sizeBytes === 0) warnings.push("empty_file");
  if (sizeBytes > 200 * 1024 * 1024) warnings.push("large_file");
  if (/[~$]/.test(path.basename(filePath))) warnings.push("temporary_or_lock_file");
  return warnings;
}

function cleanTitle(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled resource";
}

function buildEmptyHealth(resourceRoot: string, scannedAt: string, warnings: string[]): ResourceHealth {
  return {
    resourceRoot,
    scannedAt,
    rootExists: false,
    totalFiles: 0,
    byType: {},
    byFileKind: {},
    byFolder: {},
    missingExpectedFolders: [...expectedFolders],
    detectedExpectedFolders: [],
    warnings,
  };
}

function countBy<T>(items: T[], getter: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getter(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function normalizePath(value: string): string {
  return path.resolve(value.replace(/^"|"$/g, "")).replace(/\\/g, "/");
}

function writeJson(filePath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function stableId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "resource";
}

function printSummary(health: ResourceHealth, indexPath: string, healthPath: string) {
  console.log("\nResource scan complete.\n");
  console.log("Root:");
  console.log(health.resourceRoot);
  console.log(`\nTotal files: ${health.totalFiles}`);
  console.log("\nBy type:");
  Object.entries(health.byType).forEach(([type, count]) => console.log(`${type}: ${count}`));
  console.log("\nMissing folders:");
  console.log(health.missingExpectedFolders.length ? health.missingExpectedFolders.join(", ") : "none");
  if (health.warnings.length) {
    console.log("\nWarnings:");
    health.warnings.slice(0, 8).forEach((warning) => console.log(`- ${warning}`));
  }
  console.log("\nOutput:");
  console.log(normalizePath(indexPath));
  console.log(normalizePath(healthPath));
}
