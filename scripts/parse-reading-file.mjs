import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import JSZip from "jszip";

const args = parseArgs(process.argv.slice(2));
const input = args.input ?? process.argv.find((item, index) => index > 1 && !item.startsWith("--"));

if (!input || !existsSync(input)) {
  console.error("Usage: npm run parse:readings -- --input <file.epub|file.pdf|file.txt|file.md>");
  process.exit(1);
}

const extension = extname(input).toLowerCase();
const outputDir = join(process.cwd(), "private", "readings-extracted");
mkdirSync(outputDir, { recursive: true });

const text = await parseFile(input, extension);
const output = args.output ?? join(outputDir, `${basename(input, extension)}.txt`);
writeFileSync(output, `${cleanText(text)}\n`, "utf8");
console.log(`[OK] Extracted text: ${output}`);

async function parseFile(filePath, ext) {
  if (ext === ".txt" || ext === ".md") return readFileSync(filePath, "utf8");
  if (ext === ".epub") {
    const zip = await JSZip.loadAsync(readFileSync(filePath));
    const chunks = [];
    const files = Object.values(zip.files).filter((file) => /\.(xhtml|html|htm)$/i.test(file.name));
    for (const file of files) chunks.push(stripTags(await file.async("string")));
    return chunks.join("\n\n");
  }
  if (ext === ".pdf") {
    const pdf = await import("pdf-parse");
    const parse = pdf.default ?? pdf;
    const result = await parse(readFileSync(filePath));
    return result.text ?? "";
  }
  if (ext === ".mobi") {
    throw new Error("MOBI is skipped in v1. Convert it to EPUB with Calibre first.");
  }
  throw new Error(`Unsupported extension: ${ext}`);
}

function cleanText(text) {
  return stripTags(text)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripTags(text) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) result[key] = true;
    else {
      result[key] = next;
      i += 1;
    }
  }
  return result;
}
