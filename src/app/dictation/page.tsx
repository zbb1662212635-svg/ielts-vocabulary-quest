"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DictationCard } from "@/components/training/DictationCard";
import { FeedbackPanel } from "@/components/training/FeedbackPanel";
import listeningData from "@/data/listening-survival.sample.json";
import vocabularyData from "@/data/vocabulary.sample.json";
import { detectDictationError, isAnswerCorrect } from "@/lib/normalizer";
import { applyAttempt } from "@/lib/scoring";
import { DEFAULT_SETTINGS, getAppSettings } from "@/lib/settings";
import { getProgressMap, saveAttempt, saveProgressMap, upsertReviewItem } from "@/lib/storage";
import { getTutorFeedback } from "@/lib/tutor";
import type { AppSettings, DictationItem, ErrorType, ListeningSurvivalItem, TrainingAttempt, VocabularyItem } from "@/lib/types";
import { useDictationItems } from "@/lib/useDictationItems";
import { useVocabulary } from "@/lib/useVocabulary";

type DictationQuestion = {
  id: string;
  word: string;
  tip: string;
  audioId?: string;
};

type Result = {
  isCorrect: boolean;
  answer: string;
  correctAnswer: string;
  errorType?: ErrorType;
  feedback: string;
};

export default function DictationPage() {
  const vocabulary = useVocabulary();
  const privateDictation = useDictationItems();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    queueMicrotask(() => setSettings(getAppSettings()));
  }, []);

  const questions = useMemo<DictationQuestion[]>(() => {
    const generated = privateDictation.map((item: DictationItem) => ({
      id: item.id,
      word: item.answer,
      tip: item.source === "vocabulary_fallback" ? "来自你的私有词库；当前没有 transcript，使用 TTS 兜底。" : "来自本地 transcript 听写题。",
      audioId: item.audioId,
    }));
    if (generated.length) return generated.slice(0, settings.dailyMission.dictationItemsPerDay);

    const listening = listeningData as ListeningSurvivalItem[];
    const activeVocabulary = vocabulary.items.length ? vocabulary.items : (vocabularyData as VocabularyItem[]);
    const vocab = activeVocabulary
      .filter((item) => item.listeningRisk?.spellingRisk || item.skillTags?.includes("listening"))
      .map((item) => ({
        id: item.id,
        word: item.word,
        tip: item.commonMistakes?.length
          ? `常见错误拼写：${item.commonMistakes.join(", ")}`
          : "请检查每个字母，尤其是词尾和双写字母。",
      }));
    return [...listening.map((item) => ({ id: item.id, word: item.word, tip: item.tip })), ...vocab].slice(
      0,
      settings.dailyMission.dictationItemsPerDay,
    );
  }, [privateDictation, settings.dailyMission.dictationItemsPerDay, vocabulary.items]);

  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [currentResult, setCurrentResult] = useState<Result | null>(null);
  const question = questions[index % Math.max(questions.length, 1)];
  const complete = results.length >= settings.dailyMission.dictationItemsPerDay;
  const targetCount = settings.dailyMission.dictationItemsPerDay;

  function submit(answer: string) {
    const isCorrect = isAnswerCorrect(answer, question.word);
    const errorType = detectDictationError(answer, question.word);
    const attempt: TrainingAttempt = {
      id: `attempt_${Date.now()}`,
      wordId: question.id,
      mode: "dictation",
      prompt: "听音频并写出单词。",
      userAnswer: answer,
      correctAnswer: question.word,
      isCorrect,
      errorType,
      createdAt: new Date().toISOString(),
    };

    const progress = getProgressMap();
    progress[attempt.wordId] = applyAttempt(progress[attempt.wordId], attempt, errorType);
    saveProgressMap(progress);
    saveAttempt(attempt);
    if (!isCorrect && errorType) upsertReviewItem(question.id, errorType);

    setCurrentResult({
      isCorrect,
      answer,
      correctAnswer: question.word,
      errorType,
      feedback: getTutorFeedback({
        mode: "dictation",
        isCorrect,
        userAnswer: answer,
        correctAnswer: question.word,
        errorType,
        targetWord: question.word,
      }),
    });
  }

  function next() {
    if (!currentResult) return;
    setResults((existing) => [...existing, currentResult]);
    setCurrentResult(null);
    setIndex((value) => value + 1);
  }

  const accuracy = results.length
    ? Math.round((results.filter((result) => result.isCorrect).length / results.length) * 100)
    : 0;

  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Dictation Mode 听写训练</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            训练 IELTS Listening 的拼写准确率。
          </h1>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
          进度：{Math.min(results.length + (currentResult ? 1 : 0), targetCount)}/{targetCount}
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
            拼写错误和单复数错误已经进入 Review Room。Listening 填空中，听懂但拼错仍可能失分。
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
          <DictationCard
            key={question.id + index}
            word={question.word}
            tip={question.tip}
            audioSrc={question.audioId ? `/api/audio/${question.audioId}` : undefined}
            disabled={Boolean(currentResult)}
            accent={settings.dictation.accent}
            playbackSpeed={settings.dictation.playbackSpeed}
            onSubmit={submit}
          />
          {currentResult && (
            <FeedbackPanel
              isCorrect={currentResult.isCorrect}
              correctAnswer={currentResult.correctAnswer}
              errorType={currentResult.errorType}
              feedback={currentResult.feedback}
              onNext={next}
            />
          )}
        </>
      )}
    </AppShell>
  );
}
