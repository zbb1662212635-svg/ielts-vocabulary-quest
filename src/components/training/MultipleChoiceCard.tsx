"use client";

import { useMemo, useState } from "react";
import type { SynonymPair } from "@/lib/types";

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function MultipleChoiceCard({
  pair,
  disabled,
  onAnswer,
}: {
  pair: SynonymPair;
  disabled?: boolean;
  onAnswer: (answer: string, correctAnswer: string, isCorrect: boolean) => void;
}) {
  const correctAnswer = pair.targetSynonyms[0];
  const options = useMemo(
    () => shuffle([correctAnswer, ...pair.distractors]).slice(0, 4),
    [correctAnswer, pair.distractors],
  );
  const [selected, setSelected] = useState<string | null>(null);

  function choose(option: string) {
    if (disabled || selected) return;
    setSelected(option);
    onAnswer(option, correctAnswer, pair.targetSynonyms.includes(option));
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Reading 同义替换</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
        在 IELTS Reading 里，&quot;{pair.stemWord}&quot; 可能被替换成：
      </h2>
      <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        <div>
          <span className="font-bold text-slate-950">题干句：</span> {pair.example.questionStem}
        </div>
        <div className="mt-2">
          <span className="font-bold text-slate-950">原文句：</span> {pair.example.passagePhrase}
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option}
            disabled={disabled || Boolean(selected)}
            onClick={() => choose(option)}
            className={`rounded-2xl border px-4 py-4 text-left text-sm font-bold ${
              selected === option
                ? pair.targetSynonyms.includes(option)
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-rose-300 bg-rose-50 text-rose-800"
                : "border-slate-200 bg-white text-slate-800 hover:border-indigo-200 hover:bg-indigo-50"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {pair.topicTags.map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}
