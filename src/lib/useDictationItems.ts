"use client";

import { useEffect, useState } from "react";
import type { DictationItem } from "./types";

export function useDictationItems() {
  const [items, setItems] = useState<DictationItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dictation")
      .then((response) => response.json() as Promise<{ items: DictationItem[] }>)
      .then((payload) => {
        if (!cancelled) setItems(payload.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return items;
}
