"use client";

import { useEffect, useState } from "react";
import sampleVocabulary from "@/data/vocabulary.sample.json";
import type { VocabularyItem } from "./types";

type VocabularyResponse = {
  source: "sample" | "private" | "sample_fallback";
  metadata?: {
    count?: number;
    source?: string;
    note?: string;
  };
  items: VocabularyItem[];
};

export function useVocabulary() {
  const [data, setData] = useState<VocabularyResponse>({
    source: "sample",
    metadata: { count: (sampleVocabulary as VocabularyItem[]).length, source: "sample" },
    items: sampleVocabulary as VocabularyItem[],
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/vocabulary")
      .then((response) => response.json() as Promise<VocabularyResponse>)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) {
          setData({
            source: "sample_fallback",
            metadata: { count: (sampleVocabulary as VocabularyItem[]).length, source: "sample" },
            items: sampleVocabulary as VocabularyItem[],
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
