import fs from "node:fs";
import path from "node:path";
import type { ContentGraph, ContentGraphReport } from "./contentGraphTypes";

const emptyGraph: ContentGraph = {
  generatedAt: "",
  nodes: [],
  edges: [],
  stats: {
    totalNodes: 0,
    totalEdges: 0,
    byNodeType: {},
    byTopic: {},
    bySkill: {},
  },
};

export function getContentGraph(): ContentGraph {
  return readJson<ContentGraph>("content-graph.generated.json") ?? emptyGraph;
}

export function getContentGraphReport(): ContentGraphReport | null {
  return readJson<ContentGraphReport>("content-graph.report.json");
}

export function getContentGraphNeedsReview(): Array<Record<string, unknown>> {
  const payload = readJson<{ items?: Array<Record<string, unknown>> }>("content-graph.needs-review.json");
  return payload?.items ?? [];
}

function readJson<T>(fileName: string): T | null {
  const filePath = path.join(process.cwd(), "data", "private", fileName);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}
