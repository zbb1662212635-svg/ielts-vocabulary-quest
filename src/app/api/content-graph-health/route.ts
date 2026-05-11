import { NextResponse } from "next/server";
import { getContentGraph, getContentGraphNeedsReview, getContentGraphReport } from "@/lib/contentGraphLoader";

export function GET() {
  const graph = getContentGraph();
  const report = getContentGraphReport();
  const needsReview = getContentGraphNeedsReview();

  return NextResponse.json({
    generatedAt: graph.generatedAt,
    stats: graph.stats,
    report,
    needsReviewCount: needsReview.length,
    warnings: report?.warnings ?? [],
  });
}
