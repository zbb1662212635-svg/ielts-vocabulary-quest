"use client";

import { useMemo, useState } from "react";
import type { ReviewItem } from "@/lib/types";

export function ReviewCard({
  item,
  onRate,
}: {
  item: ReviewItem;
  onRate: (result: "again" | "hard" | "good" | "easy") => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const prompt = useMemo(() => {
    const label = cleanWordId(item.wordId);
    if (item.errorType === "wrong_synonym") {
      return `回忆 "${label}" 在 IELTS Reading 中可能对应的同义替换。`;
    }
    if (item.errorType === "spelling_error" || item.errorType === "plural_error") {
      return `准确拼写这个 Listening 高危词：${label}`;
    }
    if (item.errorType === "main_idea_error") {
      return `重新判断这道阅读题的段落主旨：${label}`;
    }
    if (item.errorType === "author_attitude_error") {
      return `重新判断作者态度：${label}`;
    }
    return `复盘这个影响听读反应速度的项目：${label}`;
  }, [item]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">复盘题</p>
      <h2 className="mt-3 text-2xl font-black text-slate-950">{prompt}</h2>
      <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">
        错误类型：{item.errorType}。这类错误可能直接影响 IELTS Listening 或 Reading 得分。
      </div>
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
        >
          显示答案并自评
        </button>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            ["again", "再来"],
            ["hard", "困难"],
            ["good", "掌握"],
            ["easy", "简单"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => onRate(value as "again" | "hard" | "good" | "easy")}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function cleanWordId(wordId: string) {
  return wordId
    .replace(/^synonym_/, "")
    .replace(/^listen_/, "")
    .replace(/^vocab_/, "")
    .replace(/^mission_[^_]+_/, "")
    .replace(/_/g, " ");
}
