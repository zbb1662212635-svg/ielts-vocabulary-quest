import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { get as httpsGet } from "node:https";
import { basename, extname, join } from "node:path";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

const root = process.cwd();
const sourceConfigPath = join(root, "src", "data", "reading-sources.sample.json");
const rawRoot = join(root, "private", "readings-raw");
const extractedRoot = join(root, "private", "readings-extracted");
const privateDataRoot = join(root, "data", "private");
const indexPath = join(privateDataRoot, "readings.index.json");
const generatedPath = join(privateDataRoot, "readings.generated.json");
const needsReviewPath = join(privateDataRoot, "readings.needs-review.json");
const licenseSnapshotPath = join(privateDataRoot, "source-license-snapshots.json");

const args = parseArgs(process.argv.slice(2));
const sources = JSON.parse(readFileSync(sourceConfigPath, "utf8"));
const source = sources.find((item) => item.id === (args.source ?? "awesome_english_ebooks")) ?? sources[0];
const repo = `${source.repoOwner}/${source.repoName}`;
const branch = args.branch ?? process.env.READING_SOURCE_BRANCH ?? source.branch ?? "master";
const limit = Number(args.limit ?? process.env.READING_CRAWLER_MAX_FILES ?? 10);
const maxFileSizeMB = Number(args.maxMb ?? process.env.READING_CRAWLER_MAX_MB ?? 80);
const delayMs = Number(args.delayMs ?? process.env.READING_CRAWLER_DELAY_MS ?? 1500);
const dryRun = Boolean(args.dryRun);
const force = Boolean(args.force);
const confirmed = Boolean(args.confirmConsent) || process.env.READING_SOURCE_CONSENT === "true";
const allowedExtensions = String(process.env.READING_CRAWLER_ALLOWED_EXTENSIONS ?? source.allowedExtensions.join(","))
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);
const allowedPaths = String(process.env.READING_CRAWLER_ALLOWED_PATHS ?? source.allowedPaths.join(","))
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

if (!dryRun && !confirmed) {
  console.error("[Reading Crawler] Refusing to download until consent is confirmed.");
  console.error("Run with --confirm-consent after confirming you have the right to import and use this source.");
  process.exit(1);
}

mkdirSync(rawRoot, { recursive: true });
mkdirSync(extractedRoot, { recursive: true });
mkdirSync(privateDataRoot, { recursive: true });

const index = readJson(indexPath, { files: [] });
const needsReview = readJson(needsReviewPath, { items: [] });
const generated = readJson(generatedPath, { metadata: {}, articles: [] });

console.log("[Reading Crawler]");
console.log(`Source: ${source.id}`);
console.log(`Repo: ${repo}`);
console.log(`Branch: ${branch}`);
console.log(`Mode: ${dryRun ? "dry-run" : "download"}`);

const tree = await fetchRepoTree(repo, branch);
const selectedPath = args.path ?? magazineToPath(args.magazine);
const candidates = tree
  .filter((item) => item.type === "blob")
  .filter((item) => pathAllowed(item.path, selectedPath))
  .filter((item) => allowedExtensions.includes(extname(item.path).toLowerCase()))
  .filter((item) => !item.size || item.size <= maxFileSizeMB * 1024 * 1024)
  .sort(prioritySort)
  .slice(0, limit);

console.log(`Files discovered: ${tree.length}`);
console.log(`Files selected: ${candidates.length}`);

if (dryRun) {
  candidates.forEach((item, index) => {
    console.log(`${index + 1}. ${item.path} (${formatBytes(item.size ?? 0)}) ${item.sha}`);
  });
  process.exit(0);
}

let downloaded = 0;
let skippedExisting = 0;
let parsedArticles = 0;

for (const file of candidates) {
  const existing = index.files.find((item) => item.sha === file.sha);
  if (existing && !force) {
    skippedExisting += 1;
    continue;
  }

  try {
    await sleep(delayMs);
    const rawFile = await downloadFile(file);
    downloaded += 1;
    index.files = index.files.filter((item) => item.sha !== file.sha);
    index.files.unshift(rawFile);

    const parsed = await parseRawFile(rawFile.localPath, rawFile.extension);
    const articleText = selectArticleText(parsed.text);
    if (!articleText || countWords(articleText) < 500) {
      needsReview.items.unshift({ rawFile, reason: "No usable article text extracted", createdAt: new Date().toISOString() });
      continue;
    }

    const article = buildArticle(rawFile, articleText);
    generated.articles = generated.articles.filter((item) => item.id !== article.id);
    generated.articles.unshift(article);
    parsedArticles += 1;

    const extractedPath = join(extractedRoot, `${rawFile.id}.txt`);
    writeFileSync(extractedPath, articleText, "utf8");
  } catch (error) {
    needsReview.items.unshift({
      file,
      reason: error instanceof Error ? error.message : String(error),
      createdAt: new Date().toISOString(),
    });
    if (String(error).includes("403") || String(error).includes("429")) break;
  }
}

generated.metadata = {
  source: source.id,
  generatedAt: new Date().toISOString(),
  count: generated.articles.length,
};

writeJson(indexPath, index);
writeJson(generatedPath, generated);
writeJson(needsReviewPath, needsReview);
writeJson(licenseSnapshotPath, {
  sourceId: source.id,
  sourceRepo: repo,
  sourceUrl: source.baseUrl,
  branch,
  crawledAt: new Date().toISOString(),
  notes: "User confirmed use rights before download. Store with imported reading data.",
});

console.log(`Downloaded: ${downloaded}`);
console.log(`Skipped existing: ${skippedExisting}`);
console.log(`Parsed articles: ${parsedArticles}`);
console.log(`Needs review: ${needsReview.items.length}`);
console.log(`Output: ${generatedPath}`);

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

async function fetchRepoTree(repo, branch) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ielts-vocabulary-quest-reading-crawler",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const url = `https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GitHub tree request failed: ${response.status}`);
  const payload = await response.json();
  return payload.tree ?? [];
}

function pathAllowed(path, selectedPath) {
  if (selectedPath) return path.startsWith(`${selectedPath}/`) || path === selectedPath;
  return allowedPaths.some((prefix) => path.startsWith(`${prefix}/`) || path === prefix);
}

function magazineToPath(magazine) {
  if (!magazine) return undefined;
  const map = {
    economist: "01_economist",
    new_yorker: "02_new_yorker",
    atlantic: "04_atlantic",
    wired: "05_wired",
  };
  return map[String(magazine).toLowerCase()];
}

function prioritySort(a, b) {
  const weights = { ".epub": 0, ".pdf": 1, ".txt": 2, ".md": 3, ".mobi": 4 };
  return (weights[extname(a.path).toLowerCase()] ?? 9) - (weights[extname(b.path).toLowerCase()] ?? 9);
}

async function downloadFile(file) {
  const extension = extname(file.path).toLowerCase();
  const fileName = basename(file.path);
  const id = stableId(file.sha || file.path);
  const localDir = join(rawRoot, source.id);
  mkdirSync(localDir, { recursive: true });
  const localPath = join(localDir, `${id}_${fileName.replace(/[^\w.\-]+/g, "_")}`);
  const downloadUrl = `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(branch)}/${file.path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const buffer = await downloadBuffer(downloadUrl, file.path, file.url);
  writeFileSync(localPath, buffer);
  return {
    id,
    sourceId: source.id,
    sourceRepo: repo,
    sourcePath: file.path,
    sourceUrl: `${source.baseUrl}/blob/${branch}/${file.path}`,
    downloadUrl,
    sha: file.sha,
    fileName,
    extension,
    sizeBytes: file.size,
    magazine: detectMagazine(file.path),
    issueDate: detectIssueDate(file.path),
    downloadedAt: new Date().toISOString(),
    localPath,
    licenseInfo: {
      sourceRepo: repo,
      sourceUrl: source.baseUrl,
      crawledAt: new Date().toISOString(),
      commitSha: file.sha,
      branch,
      notes: "Imported through configured Reading Lab source.",
    },
  };
}

async function downloadBuffer(url, path, blobApiUrl) {
  try {
    const response = await fetch(url, {
      headers: process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : undefined,
    });
    if (!response.ok) throw new Error(`Download failed ${response.status}: ${path}`);
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    try {
      return await new Promise((resolve, reject) => {
        httpsGet(url, (response) => {
          if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            downloadBuffer(response.headers.location, path, blobApiUrl).then(resolve, reject);
            return;
          }
          if (response.statusCode !== 200) {
            reject(new Error(`Download failed ${response.statusCode}: ${path}`));
            return;
          }
          const chunks = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () => resolve(Buffer.concat(chunks)));
        }).on("error", reject);
      });
    } catch {
      if (!blobApiUrl) throw error;
      const headers = {
        Accept: "application/vnd.github+json",
        "User-Agent": "ielts-vocabulary-quest-reading-crawler",
      };
      if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      const response = await fetch(blobApiUrl, { headers });
      if (!response.ok) throw new Error(`Blob API download failed ${response.status}: ${path}`);
      const payload = await response.json();
      if (payload.encoding !== "base64" || !payload.content) {
        throw new Error(`Blob API returned unsupported content for ${path}`);
      }
      return Buffer.from(String(payload.content).replace(/\s+/g, ""), "base64");
    }
  }
}

async function parseRawFile(filePath, extension) {
  if (extension === ".txt" || extension === ".md") return { text: cleanText(readFileSync(filePath, "utf8")) };
  if (extension === ".epub") return { text: await parseEpub(filePath) };
  if (extension === ".pdf") return { text: await parsePdf(filePath) };
  if (extension === ".mobi") {
    if (process.env.ENABLE_MOBI_IMPORT !== "true") throw new Error("MOBI skipped because ENABLE_MOBI_IMPORT is false");
    throw new Error("MOBI conversion requires Calibre; convert to EPUB first.");
  }
  throw new Error(`Unsupported extension: ${extension}`);
}

async function parseEpub(filePath) {
  const zip = await JSZip.loadAsync(readFileSync(filePath));
  const parser = new XMLParser({ ignoreAttributes: false });
  const chunks = [];
  const files = Object.values(zip.files).filter((file) => /\.(xhtml|html|htm)$/i.test(file.name));
  for (const file of files) {
    const xml = await file.async("string");
    parser.parse(xml);
    chunks.push(stripTags(xml));
  }
  return cleanText(chunks.join("\n\n"));
}

async function parsePdf(filePath) {
  const pdf = await import("pdf-parse");
  const parse = pdf.default ?? pdf;
  const result = await parse(readFileSync(filePath));
  return cleanText(result.text ?? "");
}

function buildArticle(rawFile, text) {
  const paragraphs = splitParagraphs(text).slice(0, 8);
  const articleId = `reading_${rawFile.id}`;
  const fullText = paragraphs.join(" ");
  const title = titleFromText(text) ?? titleFromPath(rawFile.sourcePath);
  const firstParagraph = paragraphs[0] ?? fullText.slice(0, 400);
  const route = classifyRoute(fullText);
  const vocab = extractVocabulary(fullText, articleId);
  const readingParagraphs = paragraphs.map((paragraph, index) => ({
    id: `${articleId}_p${index + 1}`,
    articleId,
    index: index + 1,
    text: paragraph,
    mainIdea: paragraph.slice(0, 120).replace(/\s+\S*$/, "") + "...",
    functionTag: index === 0 ? "background" : index === paragraphs.length - 1 ? "conclusion" : "claim",
  }));
  return {
    id: articleId,
    sourceFileId: rawFile.id,
    title,
    subtitle: rawFile.magazine ? `${rawFile.magazine} imported reading` : "Imported reading",
    publication: rawFile.magazine ?? "foreign press",
    issueDate: rawFile.issueDate,
    sourceUrl: rawFile.sourceUrl,
    sourcePath: rawFile.sourcePath,
    sourceLicense: rawFile.licenseInfo,
    topicTags: routeToTags(route),
    interestRoute: route,
    level: estimateLevel(fullText),
    estimatedMinutes: Math.min(35, Math.max(15, Math.ceil(countWords(fullText) / 35))),
    wordCount: countWords(fullText),
    summary: firstParagraph.slice(0, 260).replace(/\s+\S*$/, "") + "...",
    paragraphs: readingParagraphs,
    keyVocabulary: vocab,
    difficultSentences: extractDifficultSentences(fullText, articleId, readingParagraphs[0]?.id ?? `${articleId}_p1`),
    questions: buildQuestions(articleId, readingParagraphs, vocab),
    importedAt: new Date().toISOString(),
    readingStatus: "not_started",
  };
}

function splitParagraphs(text) {
  const blocks = text
    .split(/\n{2,}/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => countWords(item) >= 30 && countWords(item) <= 260)
    .filter((item) => /[.!?]$/.test(item) || /[.!?]\s/.test(item));
  if (blocks.length >= 3) return blocks;

  const sentences = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks = [];
  let current = [];
  let currentWords = 0;
  for (const sentence of sentences) {
    const words = countWords(sentence);
    current.push(sentence);
    currentWords += words;
    if (currentWords >= 100) {
      chunks.push(current.join(" "));
      current = [];
      currentWords = 0;
    }
  }
  if (current.length) chunks.push(current.join(" "));
  return chunks.filter((item) => countWords(item) >= 30);
}

function selectArticleText(text) {
  const candidates = text
    .split(/\n{2,}/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => {
      const words = countWords(item);
      return words >= 500 && words <= 3000 && !isJunkBlock(item);
    });
  return candidates[0] ?? "";
}

function isJunkBlock(text) {
  const lower = text.toLowerCase();
  return (
    lower.includes("ad_page") ||
    lower.includes("优质app推荐") ||
    lower.includes("the weekly cartoon") ||
    lower.includes("this week’s cover") ||
    lower.includes("this week's cover") ||
    lower.startsWith("cover ") ||
    lower.startsWith("theeconomist.") ||
    lower.startsWith("the world this week") ||
    lower.startsWith("letters to the editor")
  );
}

function extractVocabulary(text, articleId) {
  const terms = [
    ["diffusion", "传播；扩散", ["spread", "circulation"]],
    ["authority", "权威；权力", ["power", "legitimacy"]],
    ["sovereignty", "主权", ["independence", "authority"]],
    ["alliance", "联盟", ["partnership", "cooperation"]],
    ["innovation", "创新", ["invention", "breakthrough"]],
    ["urbanization", "城市化", ["city growth", "migration to cities"]],
    ["infrastructure", "基础设施", ["public systems", "facilities"]],
    ["inequality", "不平等", ["gap", "disparity"]],
    ["security", "安全", ["protection", "safety"]],
    ["institution", "制度；机构", ["organization", "system"]],
  ];
  return terms
    .filter(([word]) => new RegExp(`\\b${word}\\b`, "i").test(text))
    .slice(0, 12)
    .map(([word, chineseMeaning, synonyms], index) => ({
      id: `${articleId}_v${index + 1}`,
      articleId,
      word,
      chineseMeaning,
      sourceSentence: findSentence(text, word),
      synonyms,
      topicTags: ["foreign_press"],
      skillTags: ["reading"],
      addToVocabularyQuest: true,
    }));
}

function extractDifficultSentences(text, articleId, paragraphId) {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => countWords(sentence) >= 24)
    .slice(0, 3)
    .map((sentence, index) => ({
      id: `${articleId}_s${index + 1}`,
      articleId,
      paragraphId,
      sentence,
      structureNote: "Long sentence with embedded modifiers or clauses. Identify the main subject, verb and object first.",
      chineseExplanation: "先找主干，再处理从句、插入语和介词短语；这是 IELTS 长难句定位的核心步骤。",
      targetGrammar: ["complex sentence", "modifiers"],
    }));
}

function buildQuestions(articleId, paragraphs, vocabulary) {
  const first = paragraphs[0];
  const second = paragraphs[1] ?? first;
  const vocab = vocabulary[0];
  return [
    {
      id: `${articleId}_q1`,
      articleId,
      paragraphId: first?.id,
      type: "main_idea",
      prompt: "What is the main idea of the opening paragraph?",
      options: [
        first?.mainIdea ?? "It introduces the article's central issue.",
        "It gives unrelated biographical details.",
        "It rejects the whole topic.",
        "It only lists publication metadata.",
      ],
      correctAnswer: first?.mainIdea ?? "It introduces the article's central issue.",
      explanation: "Main idea questions ask for the paragraph's function, not one isolated detail.",
      evidenceText: first?.text,
      skillTags: ["main idea"],
      difficulty: 2,
    },
    {
      id: `${articleId}_q2`,
      articleId,
      paragraphId: first?.id,
      type: "paragraph_function",
      prompt: "What is the function of the first paragraph?",
      options: ["background", "irrelevant example", "advertisement", "bibliography"],
      correctAnswer: "background",
      explanation: "The first paragraph usually frames the issue and introduces the topic.",
      evidenceText: first?.text,
      skillTags: ["paragraph function"],
      difficulty: 2,
    },
    {
      id: `${articleId}_q3`,
      articleId,
      paragraphId: second?.id,
      type: "tfng",
      prompt: "True / False / Not Given: The article provides a clear claim in paragraph 2.",
      options: ["True", "False", "Not Given"],
      correctAnswer: "True",
      explanation: "The selected paragraph contains explicit statements that support this.",
      evidenceText: second?.text,
      skillTags: ["TFNG"],
      difficulty: 2,
    },
    vocab
      ? {
          id: `${articleId}_q4`,
          articleId,
          type: "synonym",
          prompt: `Which expression is closest to "${vocab.word}"?`,
          options: [vocab.synonyms[0] ?? "related idea", "opposite meaning", "page number", "unrelated detail"],
          correctAnswer: vocab.synonyms[0] ?? "related idea",
          explanation: "This trains IELTS paraphrase recognition between question wording and passage wording.",
          evidenceText: vocab.sourceSentence,
          skillTags: ["paraphrase"],
          difficulty: 2,
        }
      : {
          id: `${articleId}_q4`,
          articleId,
          type: "multiple_choice",
          prompt: "What should a reader use to answer this passage accurately?",
          options: ["evidence in the text", "personal opinion", "title only", "outside news"],
          correctAnswer: "evidence in the text",
          explanation: "IELTS Reading answers must be grounded in passage evidence.",
          evidenceText: first?.text,
          skillTags: ["detail location"],
          difficulty: 1,
        },
  ];
}

function classifyRoute(text) {
  const lower = text.toLowerCase();
  if (/state|diplomacy|alliance|war|security|sovereignty|governance|sanction/.test(lower)) return "world_order_power";
  if (/technology|innovation|science|internet|computer|printing|industrial|semiconductor/.test(lower)) return "technology_civilization";
  if (/climate|energy|environment|health|biology|conservation/.test(lower)) return "science_environment";
  if (/market|inflation|finance|trade|growth|labour|supply chain/.test(lower)) return "economics_globalization";
  if (/society|education|culture|urban|migration|identity|media|inequality/.test(lower)) return "society_ideas";
  return "general";
}

function estimateLevel(text) {
  const words = countWords(text);
  const sentences = Math.max(1, text.split(/[.!?]+/).filter(Boolean).length);
  const avg = words / sentences;
  if (avg > 26) return "C1";
  if (avg >= 18) return "B2";
  return "B1";
}

function routeToTags(route) {
  return {
    society_ideas: ["society", "ideas"],
    technology_civilization: ["technology", "history"],
    world_order_power: ["politics", "security"],
    economics_globalization: ["economics", "globalization"],
    science_environment: ["science", "environment"],
    general: ["general"],
  }[route];
}

function cleanText(text) {
  return stripTags(text)
    .replace(/This article was downloaded by zlibrary from\s+https?:\/\/\S+/gi, " ")
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
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function countWords(text) {
  return (text.match(/[A-Za-z]+(?:[-'][A-Za-z]+)?/g) ?? []).length;
}

function findSentence(text, word) {
  return text.split(/(?<=[.!?])\s+/).find((sentence) => new RegExp(`\\b${word}\\b`, "i").test(sentence)) ?? word;
}

function titleFromPath(path) {
  return basename(path, extname(path)).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "Imported Reading";
}

function titleFromText(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const sectionMarker = cleaned.match(/^(.{20,140}?)\s+(Leaders|Briefing|United States|The Americas|Asia|China|Europe|Britain|International|Business|Finance|Science|Culture|Economic)/);
  if (sectionMarker?.[1]) return sectionMarker[1].trim();
  const sentence = cleaned.split(/[.!?]/)[0]?.trim();
  return sentence && countWords(sentence) >= 4 && countWords(sentence) <= 20 ? sentence : undefined;
}

function stableId(value) {
  return value.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 80);
}

function detectMagazine(path) {
  if (path.startsWith("01_economist")) return "economist";
  if (path.startsWith("02_new_yorker")) return "new_yorker";
  if (path.startsWith("04_atlantic")) return "atlantic";
  if (path.startsWith("05_wired")) return "wired";
  return "unknown";
}

function detectIssueDate(path) {
  const match = path.match(/(20\d{2})[-_. ]?(\d{2})[-_. ]?(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : undefined;
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatBytes(bytes) {
  if (!bytes) return "unknown size";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
