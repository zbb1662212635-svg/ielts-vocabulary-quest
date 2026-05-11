"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import type { IELTSReadingQuestion, ReadingAnswerKey, ReadingPassage } from "@/lib/types";

type ReadingAssets = {
  passages: ReadingPassage[];
  questions: IELTSReadingQuestion[];
  answerKeys: ReadingAnswerKey[];
};

const filters = [
  { label: "All", value: "all" },
  { label: "Ready", value: "ready" },
  { label: "Needs review", value: "needs_review" },
] as const;

export default function ReadingPassagesPage() {
  const [assets, setAssets] = useState<ReadingAssets | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");

  useEffect(() => {
    fetch("/api/reading-assets")
      .then((response) => response.json())
      .then((data: ReadingAssets) => setAssets(data))
      .catch(() => setAssets({ passages: [], questions: [], answerKeys: [] }));
  }, []);

  const passages = useMemo(() => {
    const all = assets?.passages ?? [];
    if (filter === "all") return all;
    return all.filter((passage) => passage.status === filter);
  }, [assets, filter]);

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Reading Passages</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">阅读文章</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          这里显示从本地 IELTS 阅读资源中抽取出的文章和段落。PDF 版式不稳定的材料会被标记为需要复查。
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              className={`rounded-2xl px-4 py-2 text-sm font-black ${
                filter === item.value ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
              onClick={() => setFilter(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4">
        {passages.slice(0, 100).map((passage) => (
          <PassageCard key={passage.id} passage={passage} questionCount={assets?.questions.filter((q) => q.passageId === passage.id).length ?? 0} />
        ))}
        {!passages.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500">
            还没有可显示的阅读文章。请先运行 npm run import:reading。
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

function PassageCard({ passage, questionCount }: { passage: ReadingPassage; questionCount: number }) {
  const preview = passage.paragraphs[0]?.text ?? passage.text.slice(0, 260);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h2 className="text-xl font-black text-slate-950">{passage.title}</h2>
          <p className="mt-2 text-sm text-slate-500">{passage.sourceFileName ?? "private reading resource"}</p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
            passage.status === "ready" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {passage.status}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-700">{preview}</p>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <MiniStat label="Words" value={String(passage.wordCount)} />
        <MiniStat label="Paragraphs" value={String(passage.paragraphs.length)} />
        <MiniStat label="Questions" value={String(questionCount)} />
        <MiniStat label="Level" value={passage.level} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {passage.topicTags.map((tag) => (
          <span key={tag} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
            {tag}
          </span>
        ))}
      </div>

      {passage.warnings.length ? <p className="mt-4 text-sm font-bold text-amber-700">Warnings: {passage.warnings.join(", ")}</p> : null}
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-lg font-black text-slate-950">{value}</div>
      <div className="text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}
