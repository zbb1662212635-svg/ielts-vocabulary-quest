"use client";

import { useEffect, useState } from "react";
import { getSampleIELTSReadingQuestions, getSampleReadingAnswerKeys, getSampleReadingPassages } from "./sampleReadingAssets";
import type { IELTSReadingQuestion, ReadingAnswerKey, ReadingPassage } from "./types";
import { arrayOrFallback, fetchJson } from "./clientFetch";

type ReadingAssets = {
  source?: "private" | "sample" | "sample_fallback";
  passages?: ReadingPassage[];
  questions?: IELTSReadingQuestion[];
  answerKeys?: ReadingAnswerKey[];
};

const fallbackAssets: {
  source: "private" | "sample" | "sample_fallback";
  passages: ReadingPassage[];
  questions: IELTSReadingQuestion[];
  answerKeys: ReadingAnswerKey[];
} = {
  source: "sample_fallback",
  passages: getSampleReadingPassages(),
  questions: getSampleIELTSReadingQuestions(),
  answerKeys: getSampleReadingAnswerKeys(),
};

export function useReadingAssets() {
  const [assets, setAssets] = useState(fallbackAssets);

  useEffect(() => {
    let cancelled = false;

    fetchJson<ReadingAssets>("/api/reading-assets")
      .then((payload) => {
        if (cancelled) return;
        const passages = arrayOrFallback<ReadingPassage>(payload.passages, fallbackAssets.passages);
        const questions = arrayOrFallback<IELTSReadingQuestion>(payload.questions, fallbackAssets.questions);
        const answerKeys = arrayOrFallback<ReadingAnswerKey>(payload.answerKeys, fallbackAssets.answerKeys);
        setAssets({
          source: payload.source ?? "sample_fallback",
          passages: passages.length ? passages : fallbackAssets.passages,
          questions: questions.length ? questions : fallbackAssets.questions,
          answerKeys: answerKeys.length ? answerKeys : fallbackAssets.answerKeys,
        });
      })
      .catch((error) => {
        console.warn("Reading assets failed to load; using bundled sample reading assets.", error);
        if (!cancelled) setAssets(fallbackAssets);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return assets;
}
