import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultRoot = "C:/Users/zhangbinbin/Desktop/学英语";
const resourceRoot = path.resolve((process.env.LEARNING_RESOURCE_ROOT || defaultRoot).replace(/^"|"$/g, ""));
const outputDir = path.join(projectRoot, "data", "private");

const defaults = {
  audio: { folders: ["listening-audio", "【01】剑桥雅思1-18(真题＋解析+音频)"], output: "audio.index.json", extensions: [".mp3", ".m4a", ".wav", ".aac", ".flac"] },
  papers: { folders: ["ielts-papers", "【01】剑桥雅思1-18(真题＋解析+音频)", "【02】剑桥雅思真题合集【A类学术类】"], output: "questions.generated.json", extensions: [".pdf", ".txt", ".md", ".docx"] },
  magazines: { folders: ["magazines", "外刊"], output: "readings.generated.json", extensions: [".pdf", ".epub", ".txt", ".md"] },
  resources: { folder: "", output: "resources.index.json", extensions: [] },
};

const args = parseArgs(process.argv.slice(2));
const kind = args.kind || "resources";
const config = defaults[kind] || defaults.resources;
const input = path.resolve(args.input || resolveDefaultInput(config));
const output = path.resolve(args.output || path.join(outputDir, config.output));

if (!process.env.LEARNING_RESOURCE_ROOT && !args.input) {
  console.warn(`LEARNING_RESOURCE_ROOT is not configured. Please set it to ${defaultRoot}`);
}

if (!fs.existsSync(input)) {
  console.warn(`Resource folder not found: ${input.replace(/\\/g, "/")}`);
  writeJson(output, {
    metadata: { kind, resourceRoot: resourceRoot.replace(/\\/g, "/"), status: "not_found" },
    items: [],
  });
  process.exit(0);
}

const items = walk(input)
  .filter((file) => !config.extensions.length || config.extensions.includes(path.extname(file).toLowerCase()))
  .map((file) => ({
    id: stableId(path.relative(input, file)),
    kind,
    name: path.basename(file),
    extension: path.extname(file).toLowerCase(),
    relativePath: path.relative(input, file).replace(/\\/g, "/"),
    absolutePath: file.replace(/\\/g, "/"),
    sizeBytes: fs.statSync(file).size,
  }));

writeJson(output, {
  metadata: {
    kind,
    resourceRoot: resourceRoot.replace(/\\/g, "/"),
    input: input.replace(/\\/g, "/"),
    count: items.length,
    generatedBy: "scripts/index-resources.mjs",
  },
  items,
});

console.log(`[OK] Indexed ${items.length} ${kind} resources`);
console.log(`[OK] Input: ${input.replace(/\\/g, "/")}`);
console.log(`[OK] Output: ${output.replace(/\\/g, "/")}`);

function parseArgs(values) {
  const result = {};
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (value === "--kind") result.kind = values[++i];
    else if (value === "--input") result.input = values[++i];
    else if (value === "--output") result.output = values[++i];
  }
  return result;
}

function resolveDefaultInput(config) {
  if (config.folder !== undefined) return path.join(resourceRoot, config.folder);
  const folders = config.folders || [""];
  const existing = folders.map((folder) => path.join(resourceRoot, folder)).find((candidate) => fs.existsSync(candidate));
  return existing || path.join(resourceRoot, folders[0]);
}

function walk(root) {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile()) return [fullPath];
    return [];
  });
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function stableId(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
