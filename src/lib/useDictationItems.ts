"use client";

import { useEffect, useState } from "react";
import type { DictationItem } from "./types";

export function useDictationItems() {
  const [items, setItems] = useState<DictationItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadDictationItems() {
      try {
        const response = await fetch("/api/dictation");
        if (!response.ok) throw new Error(`Dictation API failed: ${response.status}`);

        const payload: unknown = await response.json();
        const nextItems = Array.isArray((payload as { items?: unknown }).items)
          ? (payload as { items: DictationItem[] }).items
          : [];

        if (!cancelled) setItems(nextItems);
      } catch (error) {
        console.warn("Dictation items failed to load. Continuing with mission fallback items.", error);
        if (!cancelled) setItems([]);
      }
    }

    loadDictationItems();

    return () => {
      cancelled = true;
    };
  }, []);

  return items;
}
