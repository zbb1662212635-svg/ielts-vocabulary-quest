"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useVocabulary } from "@/lib/useVocabulary";
import type { VocabularyItem } from "@/lib/types";

type Filter = "all" | "listening_risk" | "has_synonyms" | "needs_review";

export default function VocabularyPage() {
  const vocabulary = useVocabulary();
  const [filter, setFilter] = useState<Filter>("all");
  const [topic, setTopic] = useState("all");

  const items = vocabulary.items;
  const topics = useMemo(() => [...new Set(items.flatMap((item) => item.topicTags ?? []))].filter(Boolean).sort(), [items]);
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filter === "listening_risk" && !item.listeningRisk?.spellingRisk) return false;
      if (filter === "has_synonyms" && !item.synonyms.length) return false;
      if (filter === "needs_review" && !(item.importWarnings?.length)) return false;
      if (topic !== "all" && !item.topicTags.includes(topic)) return false;
      return true;
    });
  }, [filter, items, topic]);

  const stats = {
    total: items.length,
    loadout: items.filter((item) => item.word).length,
    listeningRisk: items.filter((item) => item.listeningRisk?.spellingRisk).length,
    synonyms: items.filter((item) => item.synonyms.length > 0).length,
    needsReview: items.filter((item) => item.importWarnings?.length).length,
  };

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Vocabulary Arsenal</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">词汇装备库</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          当前词库来源：{vocabulary.source}。这些词会进入今日任务的词汇装备、听写兜底和错因复盘。
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Stat label="总词条" value={stats.total} />
        <Stat label="任务可用" value={stats.loadout} />
        <Stat label="听写高危词" value={stats.listeningRisk} />
        <Stat label="有同义词" value={stats.synonyms} />
        <Stat label="需复查" value={stats.needsReview} />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "All"],
            ["listening_risk", "Listening Risk"],
            ["has_synonyms", "Has Synonyms"],
            ["needs_review", "Needs Review"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value as Filter)}
              className={`rounded-2xl px-4 py-2 text-sm font-black ${
                filter === value ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
          >
            <option value="all">All IELTS Topics</option>
            {topics.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.slice(0, 240).map((item) => (
          <VocabularyCard key={item.id} item={item} />
        ))}
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-3xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-sm font-bold text-slate-500">{label}</div>
    </div>
  );
}

function VocabularyCard({ item }: { item: VocabularyItem }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">{item.word}</h2>
          <p className="mt-1 text-sm font-bold text-indigo-700">{item.chineseMeaning || "待补充释义"}</p>
        </div>
        {item.listeningRisk?.spellingRisk && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">spelling risk</span>
        )}
      </div>
      <p className="mt-3 text-xs font-bold text-slate-500">{item.partOfSpeech.join(", ") || "IELTS word"}</p>
      {!!item.synonyms.length && <p className="mt-3 text-sm text-slate-700">Synonyms: {item.synonyms.slice(0, 5).join(" / ")}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {item.topicTags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {tag}
          </span>
        ))}
        {item.skillTags.map((tag) => (
          <span key={tag} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            {tag}
          </span>
        ))}
      </div>
      <p className="mt-4 truncate text-xs text-slate-400">{item.sourceFileName ?? item.sourcePath ?? "sample"}</p>
    </div>
  );
}
