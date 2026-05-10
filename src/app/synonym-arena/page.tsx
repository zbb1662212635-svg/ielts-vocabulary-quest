"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { FeedbackPanel } from "@/components/training/FeedbackPanel";
import { MultipleChoiceCard } from "@/components/training/MultipleChoiceCard";
import synonymsData from "@/data/synonyms.sample.json";
import type { AppSettings, SynonymPair, TrainingAttempt } from "@/lib/types";
import { applyAttempt } from "@/lib/scoring";
import { DEFAULT_SETTINGS, getAppSettings } from "@/lib/settings";
import { getProgressMap, saveAttempt, saveProgressMap, upsertReviewItem } from "@/lib/storage";
import { getTutorFeedback } from "@/lib/tutor";

type Result = {
  answer: string;
  correctAnswer: string;
  isCorrect: boolean;
  feedback: string;
};

export default function SynonymArenaPage() {
  const questions = synonymsData as SynonymPair[];
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [currentResult, setCurrentResult] = useState<Result | null>(null);
  const pair = questions[index % questions.length];
  const targetCount = settings.dailyMission.synonymBattlesPerDay;
  const complete = results.length >= targetCount;

  useEffect(() => {
    queueMicrotask(() => setSettings(getAppSettings()));
  }, []);

  const accuracy = useMemo(() => {
    if (!results.length) return 0;
    return Math.round((results.filter((result) => result.isCorrect).length / results.length) * 100);
  }, [results]);

  function handleAnswer(answer: string, correctAnswer: string, isCorrect: boolean) {
    const attempt: TrainingAttempt = {
      id: `attempt_${Date.now()}`,
      wordId: `synonym_${pair.stemWord}`,
      mode: "synonym_arena",
      prompt: pair.example.questionStem,
      userAnswer: answer,
      correctAnswer,
      isCorrect,
      errorType: isCorrect ? undefined : "wrong_synonym",
      createdAt: new Date().toISOString(),
    };
    const progress = getProgressMap();
    progress[attempt.wordId] = applyAttempt(progress[attempt.wordId], attempt, attempt.errorType);
    saveProgressMap(progress);
    saveAttempt(attempt);
    if (!isCorrect) upsertReviewItem(attempt.wordId, "wrong_synonym");

    setCurrentResult({
      answer,
      correctAnswer,
      isCorrect,
      feedback: getTutorFeedback({
        mode: "synonym_arena",
        isCorrect,
        userAnswer: answer,
        correctAnswer,
        errorType: attempt.errorType,
        targetWord: pair.stemWord,
      }),
    });
  }

  function next() {
    if (!currentResult) return;
    setResults((existing) => [...existing, currentResult]);
    setCurrentResult(null);
    setIndex((value) => value + 1);
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Synonym Arena 同义替换</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            训练 IELTS Reading 的 paraphrase 反应速度。
          </h1>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
          进度：{Math.min(results.length + (currentResult ? 1 : 0), 10)}/10
        </div>
      </div>

      <div className="mb-5 h-3 rounded-full bg-slate-200">
        <div
          className="h-3 rounded-full bg-indigo-600"
          style={{ width: `${Math.min(100, ((results.length + (currentResult ? 1 : 0)) / targetCount) * 100)}%` }}
        />
      </div>

      {complete ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-600">本轮完成</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">正确率：{accuracy}%</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            错题已经进入 Review Room。Reading 7.0 的关键不是“见过单词”，而是能在原文替换表达中快速识别同一含义。
          </p>
          <button
            onClick={() => {
              setIndex(0);
              setResults([]);
              setCurrentResult(null);
            }}
            className="mt-6 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
          >
            再练一轮
          </button>
        </section>
      ) : (
        <>
          <MultipleChoiceCard pair={pair} disabled={Boolean(currentResult)} onAnswer={handleAnswer} />
          {currentResult && (
            <FeedbackPanel
              isCorrect={currentResult.isCorrect}
              correctAnswer={currentResult.correctAnswer}
              errorType={currentResult.isCorrect ? undefined : "wrong_synonym"}
              feedback={currentResult.feedback}
              onNext={next}
            />
          )}
        </>
      )}
    </AppShell>
  );
}
