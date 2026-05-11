"use client";

import { useEffect, useState } from "react";
import sampleVocabulary from "@/data/vocabulary.sample.json";
import type { VocabularyItem } from "./types";

type VocabularyResponse = {
  source: "sample" | "private" | "sample_fallback" | "emergency";
  metadata?: {
    count?: number;
    source?: string;
    note?: string;
  };
  items: VocabularyItem[];
};

const sampleItems = sampleVocabulary as VocabularyItem[];

function fallbackVocabulary(note = "Using bundled sample vocabulary."): VocabularyResponse {
  return {
    source: "sample_fallback",
    metadata: { count: sampleItems.length, source: "sample", note },
    items: sampleItems,
  };
}

function isVocabularyResponse(value: unknown): value is VocabularyResponse {
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as { items?: unknown }).items);
}

export function useVocabulary() {
  const [data, setData] = useState<VocabularyResponse>({
    source: "sample",
    metadata: { count: sampleItems.length, source: "sample" },
    items: sampleItems,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadVocabulary() {
      try {
        const response = await fetch("/api/vocabulary");
        if (!response.ok) throw new Error(`Vocabulary API failed: ${response.status}`);

        const payload: unknown = await response.json();
        if (!isVocabularyResponse(payload)) {
          if (!cancelled) setData(fallbackVocabulary("Vocabulary API returned an invalid payload."));
          return;
        }

        if (!cancelled) {
          setData({
            source: payload.source ?? "sample_fallback",
            metadata: payload.metadata ?? { count: payload.items.length, source: payload.source },
            items: payload.items.length ? payload.items : sampleItems,
          });
        }
      } catch (error) {
        console.warn("Vocabulary data failed to load. Falling back to sample data.", error);
        if (!cancelled) setData(fallbackVocabulary("Vocabulary API failed; using sample data."));
      }
    }

    loadVocabulary();

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
