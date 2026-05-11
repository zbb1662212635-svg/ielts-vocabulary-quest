"use client";

import { useEffect, useState } from "react";
import type { IELTSReadingQuestion, ReadingAnswerKey, ReadingPassage } from "./types";

type ReadingAssetsState = {
  passages: ReadingPassage[];
  questions: IELTSReadingQuestion[];
  answerKeys: ReadingAnswerKey[];
};

const emptyAssets: ReadingAssetsState = { passages: [], questions: [], answerKeys: [] };

export function useReadingAssets() {
  const [assets, setAssets] = useState<ReadingAssetsState>(emptyAssets);

  useEffect(() => {
    let cancelled = false;

    async function loadReadingAssets() {
      try {
        const response = await fetch("/api/reading-assets");
        if (!response.ok) throw new Error(`Reading assets API failed: ${response.status}`);

        const data: unknown = await response.json();
        const record = data as Partial<ReadingAssetsState>;

        if (!cancelled) {
          setAssets({
            passages: Array.isArray(record.passages) ? record.passages : [],
            questions: Array.isArray(record.questions) ? record.questions : [],
            answerKeys: Array.isArray(record.answerKeys) ? record.answerKeys : [],
          });
        }
      } catch (error) {
        console.warn("Reading assets failed to load. Continuing with mission fallback reading.", error);
        if (!cancelled) setAssets(emptyAssets);
      }
    }

    loadReadingAssets();

    return () => {
      cancelled = true;
    };
  }, []);

  return assets;
}
