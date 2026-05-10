"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { getAttempts } from "@/lib/storage";
import { getReadingProgressMap, getSavedReadingWords } from "@/lib/readingStorage";
import { useReadings } from "@/lib/useReadings";

export default function ReadingReviewPage() {
  const readings = useReadings();
  const progress = typeof window === "undefined" ? {} : getReadingProgressMap();
  const savedWords = typeof window === "undefined" ? [] : getSavedReadingWords();
  const readingAttempts = typeof window === "undefined" ? [] : getAttempts().filter((attempt) => attempt.mode === "reading_lab");
  const wrongAttempts = readingAttempts.filter((attempt) => !attempt.isCorrect);
  const completedArticleIds = new Set(Object.values(progress).filter((item) => item.completedAt).map((item) => item.articleId));

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Reading Review</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">外刊阅读复盘</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          集中查看外刊错题、生词和已完成文章。错题同时会进入 Review Room。
        </p>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Stat label="已完成文章" value={completedArticleIds.size} />
        <Stat label="阅读答题" value={readingAttempts.length} />
        <Stat label="阅读错题" value={wrongAttempts.length} />
        <Stat label="保存生词" value={savedWords.length} />
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Wrong Reading Questions</h2>
          <div className="mt-5 space-y-3">
            {wrongAttempts.length ? (
              wrongAttempts.slice(0, 20).map((attempt) => (
                <div key={attempt.id} className="rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-950">
                  <div className="font-black">{attempt.errorType}</div>
                  <div className="mt-1">{attempt.prompt}</div>
                  <div className="mt-2 font-semibold">Your answer: {attempt.userAnswer}</div>
                  <div className="font-semibold">Correct: {attempt.correctAnswer}</div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-600">暂无阅读错题。完成一篇 guided reading 后，这里会显示具体错因。</p>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Saved Vocabulary</h2>
            <div className="mt-4 space-y-3">
              {savedWords.length ? (
                savedWords.slice(0, 12).map((word) => (
                  <div key={word.id} className="rounded-2xl bg-slate-50 p-3">
                    <div className="font-black text-slate-950">{word.word}</div>
                    <div className="text-sm text-slate-600">{word.chineseMeaning}</div>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-slate-600">还没有保存外刊生词。</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Completed Articles</h2>
            <div className="mt-4 space-y-3">
              {readings.articles
                .filter((article) => completedArticleIds.has(article.id))
                .map((article) => (
                  <Link key={article.id} href={`/reading-lab/${article.id}`} className="block rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900">
                    {article.title}
                  </Link>
                ))}
              {!completedArticleIds.size && <p className="text-sm leading-6 text-slate-600">暂无完成记录。</p>}
            </div>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-3xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}
