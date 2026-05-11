"use client";

import { useEffect, useState } from "react";
import sampleReadings from "@/data/readings.sample.json";
import type { ReadingArticle } from "./types";
import { arrayOrFallback, fetchJson } from "./clientFetch";

type ReadingsResponse = {
  source: "sample" | "private" | "sample_fallback";
  metadata?: { count?: number; source?: string; generatedAt?: string; note?: string };
  articles: ReadingArticle[];
};

const sampleArticles = sampleReadings as ReadingArticle[];

function fallbackReadings(note = "Using bundled sample readings."): ReadingsResponse {
  return {
    source: "sample_fallback",
    metadata: { count: sampleArticles.length, source: "sample", note },
    articles: sampleArticles,
  };
}

export function useReadings() {
  const [data, setData] = useState<ReadingsResponse>({
    source: "sample",
    metadata: { count: sampleArticles.length, source: "sample" },
    articles: sampleArticles,
  });

  useEffect(() => {
    let cancelled = false;

    fetchJson<Partial<ReadingsResponse>>("/api/readings")
      .then((payload) => {
        if (cancelled) return;
        const articles = arrayOrFallback<ReadingArticle>(payload.articles, sampleArticles);
        setData({
          source: payload.source ?? "sample_fallback",
          metadata: payload.metadata ?? { count: articles.length, source: payload.source ?? "sample" },
          articles: articles.length ? articles : sampleArticles,
        });
      })
      .catch((error) => {
        console.warn("Readings failed to load; using sample readings.", error);
        if (!cancelled) setData(fallbackReadings("Readings API failed."));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
