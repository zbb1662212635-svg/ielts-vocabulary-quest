"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, PackageCheck, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { isAnswerCorrect } from "@/lib/normalizer";
import { applyAttempt } from "@/lib/scoring";
import { DEFAULT_SETTINGS, getAppSettings } from "@/lib/settings";
import { getProgressMap, saveAttempt, saveProgressMap, upsertReviewItem } from "@/lib/storage";
import type { AppSettings, TrainingAttempt, UserProgress } from "@/lib/types";
import { useVocabulary } from "@/lib/useVocabulary";
import { isWordEncounterUsable } from "@/lib/vocabularyHealth";

type Result = {
  isCorrect: boolean;
  answer: string;
  correctAnswer: string;
  mode: "meaning" | "recall";
};

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export default function VocabularyPage() {
  const vocabulary = useVocabulary();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<Record<string, UserProgress>>({});
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<"meaning" | "recall">("meaning");
  const [selected, setSelected] = useState("");
  const [typedAnswer, setTypedAnswer] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [currentResult, setCurrentResult] = useState<Result | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setSettings(getAppSettings());
      setProgress(getProgressMap());
    });
  }, []);

  const words = useMemo(() => {
    return vocabulary.items
      .filter(isWordEncounterUsable)
      .sort((a, b) => (progress[a.id]?.mastery ?? 0) - (progress[b.id]?.mastery ?? 0))
      .slice(0, Math.max(settings.dailyMission.newWordsPerDay, 10));
  }, [progress, settings.dailyMission.newWordsPerDay, vocabulary.items]);

  const word = words[index % Math.max(words.length, 1)];
  const targetCount = Math.min(words.length || 1, settings.dailyMission.newWordsPerDay);
  const complete = results.length >= targetCount;
  const meaningOptions = useMemo(() => {
    if (!word) return [];
    const distractors = vocabulary.items
      .filter((item) => item.id !== word.id && item.chineseMeaning)
      .slice(index, index + 12)
      .map((item) => item.chineseMeaning);
    return shuffle([word.chineseMeaning, ...distractors]).slice(0, 4);
  }, [index, vocabulary.items, word]);

  function logAttempt(isCorrect: boolean, answer: string, correctAnswer: string, attemptMode: "meaning" | "recall") {
    if (!word) return;
    const errorType = isCorrect ? undefined : attemptMode === "recall" ? "slow_recall" : "meaning_unknown";
    const createdAt = new Date().toISOString();
    const attempt: TrainingAttempt = {
      id: `vocab_${createdAt}_${word.id}`,
      wordId: word.id,
      mode: "word_encounter",
      prompt: attemptMode === "meaning" ? `Choose the meaning of ${word.word}` : `Recall the English word: ${word.chineseMeaning}`,
      userAnswer: answer,
      correctAnswer,
      isCorrect,
      errorType,
      createdAt,
    };
    const nextProgress = getProgressMap();
    nextProgress[word.id] = applyAttempt(nextProgress[word.id], attempt, errorType);
    saveProgressMap(nextProgress);
    saveAttempt(attempt);
    if (errorType) upsertReviewItem(word.id, errorType);
    setProgress(nextProgress);
    setCurrentResult({ isCorrect, answer, correctAnswer, mode: attemptMode });
  }

  function chooseMeaning(option: string) {
    if (!word || currentResult) return;
    setSelected(option);
    logAttempt(option === word.chineseMeaning, option, word.chineseMeaning, "meaning");
  }

  function submitRecall() {
    if (!word || !typedAnswer.trim() || currentResult) return;
    logAttempt(isAnswerCorrect(typedAnswer, word.word), typedAnswer, word.word, "recall");
  }

  function next() {
    if (!currentResult) return;
    setResults((items) => [...items, currentResult]);
    setCurrentResult(null);
    setSelected("");
    setTypedAnswer("");
    setMode((value) => (value === "meaning" ? "recall" : "meaning"));
    setIndex((value) => value + 1);
  }

  const accuracy = results.length ? Math.round((results.filter((item) => item.isCorrect).length / results.length) * 100) : 0;

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Vocabulary Training</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">词汇训练</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          这里不是只看词表。每个词会经过“识别意思”和“主动回忆”，结果会写入 mastery 和 Review Room。
        </p>
      </section>

      <div className="mt-5 h-3 rounded-full bg-slate-200">
        <div className="h-3 rounded-full bg-indigo-600" style={{ width: `${Math.min(100, ((results.length + (currentResult ? 1 : 0)) / targetCount) * 100)}%` }} />
      </div>

      {complete ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-600">Session complete</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">正确率：{accuracy}%</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            错词已按 meaning_unknown 或 slow_recall 进入 Review Room。刷新页面后进度仍会保留。
          </p>
          <button
            onClick={() => {
              setIndex(0);
              setResults([]);
              setCurrentResult(null);
              setMode("meaning");
            }}
            className="mt-6 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"
          >
            再练一轮
          </button>
        </section>
      ) : word ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                <PackageCheck size={14} />
                {results.length + 1}/{targetCount} · mastery {progress[word.id]?.mastery ?? 0}
              </div>
              <h2 className="mt-4 text-4xl font-black text-slate-950">{mode === "meaning" ? word.word : word.chineseMeaning}</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">{word.partOfSpeech.join(", ") || "IELTS word"}</p>
            </div>
            <button
              onClick={() => setMode((value) => (value === "meaning" ? "recall" : "meaning"))}
              disabled={Boolean(currentResult)}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
            >
              切换题型
            </button>
          </div>

          {mode === "meaning" ? (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {meaningOptions.map((option) => (
                <button
                  key={option}
                  disabled={Boolean(currentResult)}
                  onClick={() => chooseMeaning(option)}
                  className={`rounded-2xl border px-4 py-4 text-left text-sm font-bold ${
                    selected === option
                      ? currentResult?.isCorrect
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-rose-300 bg-rose-50 text-rose-800"
                      : "border-slate-200 bg-white text-slate-800 hover:border-indigo-200"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <label className="text-sm font-bold text-slate-700">请输入对应英文单词</label>
              <input
                value={typedAnswer}
                disabled={Boolean(currentResult)}
                onChange={(event) => setTypedAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitRecall();
                }}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-4 text-lg font-bold outline-none focus:border-indigo-300"
                placeholder="Type the English word"
              />
              <button onClick={submitRecall} disabled={!typedAnswer.trim() || Boolean(currentResult)} className="mt-4 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:bg-slate-300">
                提交
              </button>
            </div>
          )}

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <div className="font-black text-slate-950">Example</div>
            <p className="mt-1">{word.examples[0]?.sentence || word.englishDefinition || "No example yet."}</p>
            {!!word.synonyms.length && <p className="mt-2 font-bold text-indigo-700">Synonyms: {word.synonyms.join(" / ")}</p>}
            {!!word.collocations.length && <p className="mt-1 font-bold text-slate-600">Collocations: {word.collocations.slice(0, 3).join(" / ")}</p>}
          </div>

          {currentResult && (
            <div className={`mt-5 rounded-2xl p-4 text-sm leading-6 ${currentResult.isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
              <div className="flex items-center gap-2 font-black">
                {currentResult.isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                {currentResult.isCorrect ? "答对了" : `正确答案：${currentResult.correctAnswer}`}
              </div>
              <p className="mt-1">
                {currentResult.isCorrect
                  ? "这个词会提高 mastery，并减少之后出现频率。"
                  : "这个错误会进入 Review Room，之后按错因重新出现。"}
              </p>
              <button onClick={next} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">
                下一题
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">暂无可训练词条</h2>
        </section>
      )}
    </AppShell>
  );
}
