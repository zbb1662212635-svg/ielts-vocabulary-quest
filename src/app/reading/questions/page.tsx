"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import type { IELTSQuestionType, IELTSReadingQuestion, ReadingAnswerKey, ReadingPassage } from "@/lib/types";

type ReadingAssets = {
  passages: ReadingPassage[];
  questions: IELTSReadingQuestion[];
  answerKeys: ReadingAnswerKey[];
};

const filters: Array<{ label: string; value: "all" | "ready" | "needs_review" | IELTSQuestionType }> = [
  { label: "All", value: "all" },
  { label: "Ready", value: "ready" },
  { label: "Needs review", value: "needs_review" },
  { label: "TFNG", value: "tfng" },
  { label: "Matching headings", value: "matching_headings" },
  { label: "Sentence completion", value: "sentence_completion" },
  { label: "Multiple choice", value: "multiple_choice" },
];

export default function ReadingQuestionsPage() {
  const [assets, setAssets] = useState<ReadingAssets | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");

  useEffect(() => {
    fetch("/api/reading-assets")
      .then((response) => response.json())
      .then((data: ReadingAssets) => setAssets(data))
      .catch(() => setAssets({ passages: [], questions: [], answerKeys: [] }));
  }, []);

  const questions = useMemo(() => {
    const all = assets?.questions ?? [];
    if (filter === "all") return all;
    if (filter === "ready" || filter === "needs_review") return all.filter((question) => question.status === filter);
    return all.filter((question) => question.questionType === filter);
  }, [assets, filter]);

  const passageTitles = useMemo(() => {
    const pairs = (assets?.passages ?? []).map((passage) => [passage.id, passage.title] as const);
    return new Map(pairs);
  }, [assets]);

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Reading Questions</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">阅读题目</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          这里显示从本地 IELTS 阅读材料中识别出的题目。没有答案或证据的题目会进入 needs_review，不会用于自动判分。
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
        {questions.slice(0, 200).map((question) => (
          <QuestionCard key={question.id} question={question} passageTitle={question.passageId ? passageTitles.get(question.passageId) : undefined} />
        ))}
        {!questions.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500">
            还没有可显示的阅读题目。请先运行 npm run import:reading。
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

function QuestionCard({ question, passageTitle }: { question: IELTSReadingQuestion; passageTitle?: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-indigo-600">{question.questionType}</p>
          <h2 className="mt-2 text-lg font-black leading-7 text-slate-950">
            {question.questionNumber ? `${question.questionNumber}. ` : ""}
            {question.prompt}
          </h2>
          <p className="mt-2 text-sm text-slate-500">{passageTitle ?? question.sourceFileName ?? "private reading resource"}</p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
            question.status === "ready" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {question.status}
        </span>
      </div>

      {question.options?.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {question.options.map((option) => (
            <div key={option} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
              {option}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <MiniStat label="Answer" value={question.correctAnswer ?? "missing"} />
        <MiniStat label="Evidence" value={question.evidenceText ? "available" : "missing"} />
        <MiniStat label="Difficulty" value={String(question.difficulty)} />
      </div>

      {question.evidenceText ? <p className="mt-4 text-sm leading-6 text-slate-600">Evidence: {question.evidenceText}</p> : null}
      {question.explanation ? <p className="mt-3 text-sm leading-6 text-slate-600">Explanation: {question.explanation}</p> : null}
      {question.warnings.length ? <p className="mt-4 text-sm font-bold text-amber-700">Warnings: {question.warnings.join(", ")}</p> : null}
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="truncate text-sm font-black text-slate-950">{value}</div>
      <div className="text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}
