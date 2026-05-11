"use client";

import { useEffect, useState } from "react";
import { sampleScenarioReadings } from "@/data/scenario-readings.sample";
import type { ScenarioReadingArticle } from "./types";

type ScenarioReadingsState = {
  source: "sample" | "private" | "sample_fallback";
  articles: ScenarioReadingArticle[];
  metadata?: { count?: number; generatedAt?: string };
};

const sampleState: ScenarioReadingsState = {
  source: "sample",
  articles: sampleScenarioReadings,
  metadata: { count: sampleScenarioReadings.length },
};

export function useScenarioReadings() {
  const [data, setData] = useState<ScenarioReadingsState>(sampleState);

  useEffect(() => {
    let cancelled = false;

    async function loadScenarioReadings() {
      try {
        const response = await fetch("/api/scenario-readings");
        if (!response.ok) throw new Error(`Scenario readings API failed: ${response.status}`);

        const payload = (await response.json()) as Partial<ScenarioReadingsState>;
        const articles = Array.isArray(payload.articles) && payload.articles.length ? payload.articles : sampleScenarioReadings;

        if (!cancelled) {
          setData({
            source: payload.source ?? "sample_fallback",
            articles,
            metadata: payload.metadata ?? { count: articles.length },
          });
        }
      } catch (error) {
        console.warn("Scenario readings failed to load. Falling back to sample scenario readings.", error);
        if (!cancelled) setData({ ...sampleState, source: "sample_fallback" });
      }
    }

    loadScenarioReadings();

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
