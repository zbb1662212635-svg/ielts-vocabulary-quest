"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileAudio, Headphones, ListChecks, Mic2, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { DictationItem } from "@/lib/types";

type ListeningHealth = {
  imported: boolean;
  audioTracks: number;
  transcripts: number;
  matchedPairs: number;
  unmatchedAudio: number;
  unmatchedTranscripts: number;
  dictationItems: number;
  needsReview: number;
  lastImportedAt: string | null;
};

type DictationPayload = {
  items: DictationItem[];
};

export default function ListeningStudioPage() {
  const [health, setHealth] = useState<ListeningHealth | null>(null);
  const [dictation, setDictation] = useState<DictationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "ready" | "needs_review" | "with_audio" | "without_audio">("all");

  useEffect(() => {
    fetch("/api/listening-health")
      .then((response) => response.json())
      .then((data: ListeningHealth) => setHealth(data))
      .catch(() => setHealth(null));
    fetch("/api/dictation")
      .then((response) => response.json())
      .then((data: DictationPayload) => setDictation(data.items ?? []))
      .catch(() => setDictation([]));
  }, []);

  const filtered = useMemo(() => {
    return dictation.filter((item) => {
      if (filter === "ready") return item.status === "ready";
      if (filter === "needs_review") return item.status === "needs_review";
      if (filter === "with_audio") return Boolean(item.audioId);
      if (filter === "without_audio") return !item.audioId;
      return true;
    });
  }, [dictation, filter]);

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Listening Studio</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">听力工作室</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          这里显示本地雅思音频、transcript 匹配状态和已生成的听写题。没有 transcript 时，系统会用词汇高危拼写词作为听写兜底。
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Stat icon={FileAudio} label="音频文件" value={health?.audioTracks ?? 0} />
        <Stat icon={ListChecks} label="Transcript" value={health?.transcripts ?? 0} />
        <Stat icon={Headphones} label="已匹配" value={health?.matchedPairs ?? 0} />
        <Stat icon={Mic2} label="听写题" value={health?.dictationItems ?? 0} />
        <Stat icon={ListChecks} label="需复查" value={health?.needsReview ?? 0} />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "All"],
            ["ready", "Ready"],
            ["needs_review", "Needs Review"],
            ["with_audio", "With Audio"],
            ["without_audio", "Without Audio"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value as typeof filter)}
              className={`rounded-2xl px-4 py-2 text-sm font-black ${
                filter === value ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
          <Link href="/dictation" className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
            Start Dictation
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.slice(0, 120).map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">{item.answer}</h2>
                <p className="mt-1 text-sm text-slate-600">{item.chineseMeaning || item.itemType}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${item.audioId ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {item.audioId ? "audio" : "TTS"}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{item.source}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.skillTags.map((tag) => (
                <span key={tag} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Icon className="text-indigo-600" size={24} />
      <div className="mt-4 text-3xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-sm font-bold text-slate-500">{label}</div>
    </div>
  );
}
