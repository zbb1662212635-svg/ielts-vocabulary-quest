"use client";

import { useEffect, useState } from "react";
import sampleReadings from "@/data/readings.sample.json";
import type { ReadingArticle } from "./types";

type ReadingsResponse = {
  source: "sample" | "private" | "sample_fallback";
  metadata?: {
    count?: number;
    source?: string;
    generatedAt?: string;
  };
  articles: ReadingArticle[];
};

export function useReadings() {
  const [data, setData] = useState<ReadingsResponse>({
    source: "sample",
    metadata: { count: (sampleReadings as ReadingArticle[]).length, source: "sample" },
    articles: sampleReadings as ReadingArticle[],
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/readings")
      .then((response) => response.json() as Promise<ReadingsResponse>)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) {
          setData({
            source: "sample_fallback",
            metadata: { count: (sampleReadings as ReadingArticle[]).length, source: "sample" },
            articles: sampleReadings as ReadingArticle[],
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
