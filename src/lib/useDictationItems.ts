"use client";

import { useEffect, useState } from "react";
import listeningData from "@/data/listening-survival.sample.json";
import type { DictationItem, ListeningSurvivalItem } from "./types";
import { arrayOrFallback, fetchJson } from "./clientFetch";

type DictationPayload = { items?: DictationItem[] };

const fallbackItems: DictationItem[] = (listeningData as ListeningSurvivalItem[]).map((item) => ({
  id: `sample_${item.id}`,
  text: item.audioText || item.word,
  answer: item.word,
  chineseMeaning: item.category,
  topicTags: ["travel_daily_services"],
  skillTags: ["listening", "dictation", "spelling"],
  difficulty: Math.min(Math.max(Math.round(item.difficulty || 2), 1), 5) as 1 | 2 | 3 | 4 | 5,
  itemType: "word",
  source: "sample",
  commonMistakes: item.commonWrongSpellings,
  status: "ready",
  warnings: [],
}));

export function useDictationItems() {
  const [items, setItems] = useState<DictationItem[]>(fallbackItems);

  useEffect(() => {
    let cancelled = false;

    fetchJson<DictationPayload>("/api/dictation")
      .then((payload) => {
        if (!cancelled) {
          const next = arrayOrFallback<DictationItem>(payload.items, fallbackItems);
          setItems(next.length ? next : fallbackItems);
        }
      })
      .catch((error) => {
        console.warn("Dictation items failed to load; using sample dictation.", error);
        if (!cancelled) setItems(fallbackItems);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return items;
}
