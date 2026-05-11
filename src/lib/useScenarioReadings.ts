"use client";

import { useEffect, useState } from "react";
import { sampleScenarioReadings } from "@/data/scenario-readings.sample";
import type { ScenarioReadingArticle } from "./types";
import { arrayOrFallback, fetchJson } from "./clientFetch";

type ScenarioPayload = {
  source?: "sample" | "private" | "sample_fallback";
  articles?: ScenarioReadingArticle[];
  metadata?: { count?: number; generatedAt?: string; note?: string };
};

const fallback: {
  source: "sample" | "private" | "sample_fallback";
  articles: ScenarioReadingArticle[];
  metadata?: { count?: number; generatedAt?: string; note?: string };
} = {
  source: "sample_fallback",
  articles: sampleScenarioReadings,
  metadata: { count: sampleScenarioReadings.length, note: "Using bundled scenario readings." },
};

export function useScenarioReadings() {
  const [data, setData] = useState(fallback);

  useEffect(() => {
    let cancelled = false;

    fetchJson<ScenarioPayload>("/api/scenario-readings")
      .then((payload) => {
        if (cancelled) return;
        const articles = arrayOrFallback<ScenarioReadingArticle>(payload.articles, sampleScenarioReadings);
        setData({
          source: payload.source ?? "sample_fallback",
          articles: articles.length ? articles : sampleScenarioReadings,
          metadata: payload.metadata ?? { count: articles.length },
        });
      })
      .catch((error) => {
        console.warn("Scenario readings failed to load; using sample scenario readings.", error);
        if (!cancelled) setData(fallback);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
