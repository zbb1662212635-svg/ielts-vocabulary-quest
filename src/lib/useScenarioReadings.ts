"use client";

import { useEffect, useState } from "react";
import { sampleScenarioReadings } from "@/data/scenario-readings.sample";
import type { ScenarioReadingArticle } from "./types";

export function useScenarioReadings() {
  const [data, setData] = useState<{
    source: "sample" | "private" | "sample_fallback";
    articles: ScenarioReadingArticle[];
    metadata?: { count?: number; generatedAt?: string };
  }>({ source: "sample", articles: sampleScenarioReadings, metadata: { count: sampleScenarioReadings.length } });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/scenario-readings")
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) {
          setData({
            source: payload.source ?? "sample_fallback",
            articles: payload.articles ?? sampleScenarioReadings,
            metadata: payload.metadata,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setData({ source: "sample_fallback", articles: sampleScenarioReadings });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
