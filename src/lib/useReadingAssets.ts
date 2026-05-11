"use client";

import { useEffect, useState } from "react";
import type { IELTSReadingQuestion, ReadingAnswerKey, ReadingPassage } from "./types";

export function useReadingAssets() {
  const [assets, setAssets] = useState<{
    passages: ReadingPassage[];
    questions: IELTSReadingQuestion[];
    answerKeys: ReadingAnswerKey[];
  }>({ passages: [], questions: [], answerKeys: [] });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reading-assets")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) {
          setAssets({
            passages: data.passages ?? [],
            questions: data.questions ?? [],
            answerKeys: data.answerKeys ?? [],
          });
        }
      })
      .catch(() => {
        if (!cancelled) setAssets({ passages: [], questions: [], answerKeys: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return assets;
}
