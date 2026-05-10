import fs from "node:fs";
import path from "node:path";
import type { ResourceHealth } from "./resourceTypes";

export const DEFAULT_RESOURCE_ROOT = "C:/Users/zhangbinbin/Desktop/\u5b66\u82f1\u8bed";

export const RESOURCE_FOLDERS = [
  "ielts-papers",
  "vocabulary-books",
  "listening-audio",
  "transcripts",
  "answer-keys",
  "magazines",
  "foreign-reading",
  "processed-notes",
] as const;

const RESOURCE_ALIASES: Record<string, string[]> = {
  "ielts-papers": [
    "\u301001\u3011\u5251\u6865\u96c5\u601d1-18(\u771f\u9898\uff0b\u89e3\u6790+\u97f3\u9891)",
    "\u301002\u3011\u5251\u6865\u96c5\u601d\u771f\u9898\u5408\u96c6\u3010A\u7c7b\u5b66\u672f\u7c7b\u3011",
  ],
  "vocabulary-books": ["06.\u96c5\u601d\u8bcd\u6c47"],
  "listening-audio": ["\u301001\u3011\u5251\u6865\u96c5\u601d1-18(\u771f\u9898\uff0b\u89e3\u6790+\u97f3\u9891)"],
  magazines: ["\u5916\u520a"],
  "foreign-reading": ["\u5916\u520a"],
};

export type FolderHealth = {
  name: string;
  path: string;
  exists: boolean;
  fileCount: number;
};

export function getResourceRoot(): string {
  return normalizeResourcePath(process.env.LEARNING_RESOURCE_ROOT || DEFAULT_RESOURCE_ROOT);
}

export function resolveResourcePath(...segments: string[]): string {
  return path.resolve(getResourceRoot(), ...segments);
}

export function assertResourceRootExists(): void {
  const root = getResourceRoot();
  if (!process.env.LEARNING_RESOURCE_ROOT) {
    throw new Error(`LEARNING_RESOURCE_ROOT is not configured. Please set it to ${DEFAULT_RESOURCE_ROOT}`);
  }
  if (!fs.existsSync(root)) {
    throw new Error(`Resource folder not found: ${root}`);
  }
}

export function getResourceFolderHealth(): {
  configured: boolean;
  root: string;
  exists: boolean;
  status: "configured" | "missing" | "not_found";
  message: string;
  folders: FolderHealth[];
  totalFiles: number;
} {
  const configured = Boolean(process.env.LEARNING_RESOURCE_ROOT);
  const root = getResourceRoot();
  const exists = fs.existsSync(root);
  const folders = RESOURCE_FOLDERS.map((name) => {
    const resolved = resolveExistingFolder(root, name);
    const folderPath = resolved ?? path.join(root, name);
    const folderExists = Boolean(resolved);
    return {
      name,
      path: normalizeResourcePath(folderPath),
      exists: folderExists,
      fileCount: folderExists ? countFiles(folderPath) : 0,
    };
  });

  const status = !configured ? "missing" : exists ? "configured" : "not_found";
  const message =
    status === "missing"
      ? `LEARNING_RESOURCE_ROOT is not configured. Please set it to ${DEFAULT_RESOURCE_ROOT}`
      : status === "not_found"
        ? `Resource folder not found: ${root}`
        : "Resource root is configured.";

  return {
    configured,
    root,
    exists,
    status,
    message,
    folders,
    totalFiles: folders.reduce((sum, folder) => sum + folder.fileCount, 0),
  };
}

export function getLiveResourceHealth(): ResourceHealth {
  const folderHealth = getResourceFolderHealth();
  const scannedAt = new Date().toISOString();
  return {
    resourceRoot: folderHealth.root,
    scannedAt,
    rootExists: folderHealth.exists,
    totalFiles: folderHealth.totalFiles,
    byType: {},
    byFileKind: {},
    byFolder: Object.fromEntries(folderHealth.folders.map((folder) => [folder.name, folder.fileCount])),
    missingExpectedFolders: folderHealth.folders.filter((folder) => !folder.exists).map((folder) => folder.name),
    detectedExpectedFolders: folderHealth.folders.filter((folder) => folder.exists).map((folder) => folder.name),
    warnings: folderHealth.exists ? [] : [folderHealth.message],
  };
}

function resolveExistingFolder(root: string, folderName: string): string | undefined {
  const candidates = [folderName, ...(RESOURCE_ALIASES[folderName] ?? [])];
  return candidates.map((candidate) => path.join(root, candidate)).find((candidatePath) => fs.existsSync(candidatePath));
}

export function normalizeResourcePath(input: string): string {
  return path.resolve(input.replace(/^"|"$/g, "")).replace(/\\/g, "/");
}

function countFiles(folderPath: string): number {
  try {
    return fs.readdirSync(folderPath, { withFileTypes: true }).reduce((count, entry) => {
      const fullPath = path.join(folderPath, entry.name);
      if (entry.isDirectory()) return count + countFiles(fullPath);
      if (entry.isFile()) return count + 1;
      return count;
    }, 0);
  } catch {
    return 0;
  }
}
