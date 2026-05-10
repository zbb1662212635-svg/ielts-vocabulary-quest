"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowRight, Headphones, Lightbulb } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getKnowledgeMission, getKnowledgeRoute } from "@/data/knowledge.sample";
import { isAnswerCorrect } from "@/lib/normalizer";
import { applyAttempt } from "@/lib/scoring";
import {
  getProgressMap,
  markKnowledgeMissionComplete,
  saveAttempt,
  saveProgressMap,
  upsertReviewItem,
} from "@/lib/storage";
import type { ErrorType, MiniPassageQuestion, TrainingAttempt } from "@/lib/types";

const stageLabels = ["主题导入", "主题词", "Mini Reading", "题目训练", "听写挑战", "知识奖励", "总结"];

export default function KnowledgeMissionPage() {
  const params = useParams<{ missionId: string }>();
  const missionCandidate = getKnowledgeMission(params.missionId);
  if (!missionCandidate) notFound();
  const mission = missionCandidate;
  const route = getKnowledgeRoute(mission.routeId);
  const [stageIndex, setStageIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [dictationAnswers, setDictationAnswers] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<{ correct: number; total: number; mistakes: number } | null>(null);

  const dictationWords = mission.themeWords.filter((word) => word.length >= 8).slice(0, 6);
  const currentStage = stageLabels[stageIndex];

  const questionResults = mission.miniPassage.questions.map((question) => {
    const answer = answers[question.id] ?? "";
    return {
      question,
      answer,
      isCorrect: submitted[question.id] ? isAnswerCorrect(answer, question.correctAnswer) : false,
    };
  });

  function saveQuestionAttempt(question: MiniPassageQuestion, answer: string) {
    const isCorrect = isAnswerCorrect(answer, question.correctAnswer);
    const errorType: ErrorType | undefined =
      isCorrect ? undefined : question.type === "synonym" ? "wrong_synonym" : "context_misread";
    const createdAt = new Date().toISOString();
    const attempt: TrainingAttempt = {
      id: `attempt_${createdAt}_${question.id}`,
      wordId: `knowledge_${question.targetWord ?? question.id}`,
      mode: question.type === "synonym" ? "synonym_arena" : "context_puzzle",
      prompt: question.prompt,
      userAnswer: answer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      errorType,
      createdAt,
    };
    const progress = getProgressMap();
    progress[attempt.wordId] = applyAttempt(progress[attempt.wordId], attempt, errorType);
    saveProgressMap(progress);
    saveAttempt(attempt);
    if (errorType) upsertReviewItem(attempt.wordId, errorType);
  }

  function submitQuestion(question: MiniPassageQuestion) {
    const answer = answers[question.id] ?? "";
    if (!answer) return;
    saveQuestionAttempt(question, answer);
    setSubmitted((current) => ({ ...current, [question.id]: true }));
  }

  function playWord(word: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-GB";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  }

  function completeMission() {
    let correct = questionResults.filter((result) => result.isCorrect).length;
    let total = questionResults.length;
    let mistakes = questionResults.filter((result) => submitted[result.question.id] && !result.isCorrect).length;

    dictationWords.forEach((word) => {
      const answer = dictationAnswers[word] ?? "";
      if (!answer) return;
      const isCorrect = isAnswerCorrect(answer, word);
      const errorType: ErrorType | undefined = isCorrect ? undefined : "spelling_error";
      const createdAt = new Date().toISOString();
      const attempt: TrainingAttempt = {
        id: `attempt_${createdAt}_${word}`,
        wordId: `knowledge_dictation_${word}`,
        mode: "dictation",
        prompt: `Knowledge Quest dictation: ${word}`,
        userAnswer: answer,
        correctAnswer: word,
        isCorrect,
        errorType,
        createdAt,
      };
      const progress = getProgressMap();
      progress[attempt.wordId] = applyAttempt(progress[attempt.wordId], attempt, errorType);
      saveProgressMap(progress);
      saveAttempt(attempt);
      if (errorType) upsertReviewItem(attempt.wordId, errorType);
      total += 1;
      if (isCorrect) correct += 1;
      else mistakes += 1;
    });

    markKnowledgeMissionComplete(mission.id);
    setSummary({ correct, total, mistakes });
    setStageIndex(6);
  }

  return (
    <AppShell>
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">
          {route?.subtitle ?? "Knowledge Quest"} · {mission.estimatedMinutes} 分钟
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{mission.title}</h1>
        <p className="mt-2 text-base font-semibold text-slate-600">{mission.subtitle}</p>
      </section>

      <div className="mb-6 grid gap-2 md:grid-cols-7">
        {stageLabels.map((label, index) => (
          <button
            key={label}
            onClick={() => setStageIndex(index)}
            className={`rounded-2xl px-3 py-3 text-xs font-bold ${
              index === stageIndex
                ? "bg-indigo-600 text-white"
                : index < stageIndex
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-white text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">{currentStage}</p>

        {stageIndex === 0 && (
          <StageIntro mission={mission} onNext={() => setStageIndex(1)} />
        )}

        {stageIndex === 1 && (
          <div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">主题词初遇</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {mission.themeWords.map((word) => (
                <div key={word} className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-lg font-black text-slate-950">{word}</div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">主题词 · 可进入听写或阅读题</div>
                </div>
              ))}
            </div>
            <NextButton onClick={() => setStageIndex(2)} label="进入 Mini Reading" />
          </div>
        )}

        {stageIndex === 2 && (
          <div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{mission.miniPassage.title}</h2>
            <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-base leading-8 text-slate-800">
              {mission.miniPassage.text}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                {mission.miniPassage.level}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {mission.miniPassage.wordCount} words
              </span>
            </div>
            <NextButton onClick={() => setStageIndex(3)} label="开始阅读题" />
          </div>
        )}

        {stageIndex === 3 && (
          <div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">阅读题训练</h2>
            <div className="mt-5 grid gap-4">
              {mission.miniPassage.questions.map((question) => {
                const didSubmit = submitted[question.id];
                const isCorrect = didSubmit && isAnswerCorrect(answers[question.id] ?? "", question.correctAnswer);
                return (
                  <div key={question.id} className="rounded-2xl border border-slate-200 p-5">
                    <div className="text-sm font-black text-slate-950">{question.prompt}</div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {(question.options ?? []).map((option) => (
                        <button
                          key={option}
                          onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold ${
                            answers[question.id] === option
                              ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                              : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => submitQuestion(question)}
                      disabled={!answers[question.id] || didSubmit}
                      className="mt-4 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
                    >
                      提交
                    </button>
                    {didSubmit && (
                      <div className={`mt-4 rounded-2xl p-4 text-sm leading-6 ${isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
                        {isCorrect ? "答对了。" : `需要复盘。正确答案：${question.correctAnswer}。`}
                        <br />
                        {question.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <NextButton onClick={() => setStageIndex(4)} label="进入听写挑战" />
          </div>
        )}

        {stageIndex === 4 && (
          <div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">主题词听写挑战</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {dictationWords.map((word) => (
                <div key={word} className="rounded-2xl border border-slate-200 p-4">
                  <button
                    onClick={() => playWord(word)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
                  >
                    <Headphones size={16} />
                    播放
                  </button>
                  <input
                    value={dictationAnswers[word] ?? ""}
                    onChange={(event) =>
                      setDictationAnswers((current) => ({ ...current, [word]: event.target.value }))
                    }
                    className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-300"
                    placeholder="输入听到的单词"
                  />
                </div>
              ))}
            </div>
            <NextButton onClick={() => setStageIndex(5)} label="解锁知识卡片" />
          </div>
        )}

        {stageIndex === 5 && (
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              <Lightbulb size={14} />
              Knowledge Reward
            </div>
            <h2 className="mt-4 text-2xl font-black text-slate-950">{mission.knowledgeNote.title}</h2>
            <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-base leading-8 text-slate-800">
              {mission.knowledgeNote.content}
            </p>
            <p className="mt-4 rounded-2xl bg-indigo-50 p-5 text-sm leading-7 text-indigo-950">
              {mission.knowledgeNote.chineseSummary}
            </p>
            <div className="mt-4 text-sm font-bold text-slate-600">
              对应 IELTS 技能：{mission.knowledgeNote.relatedIELTSSkill}
            </div>
            <button
              onClick={completeMission}
              className="mt-6 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"
            >
              完成任务并生成总结
            </button>
          </div>
        )}

        {stageIndex === 6 && (
          <div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">任务完成</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <SummaryStat label="题目总数" value={summary?.total ?? 0} />
              <SummaryStat label="答对" value={summary?.correct ?? 0} />
              <SummaryStat label="新增错因" value={summary?.mistakes ?? 0} />
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-600">
              错题已进入 Review Room。明天复习时，系统会优先处理这些影响 IELTS Reading / Listening 的错误。
            </p>
            <Link
              href="/knowledge-quest"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
            >
              返回知识探索
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function StageIntro({
  mission,
  onNext,
}: {
  mission: NonNullable<ReturnType<typeof getKnowledgeMission>>;
  onNext: () => void;
}) {
  return (
    <div>
      <h2 className="mt-2 text-2xl font-black text-slate-950">{mission.subtitle}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        本任务把知识主题转化为 IELTS 训练：主题词、Mini Reading、同义替换、语境判断、听写和知识奖励。
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <SummaryStat label="主题词" value={mission.themeWords.length} />
        <SummaryStat label="阅读题" value={mission.miniPassage.questions.length} />
        <SummaryStat label="预计分钟" value={mission.estimatedMinutes} />
      </div>
      <NextButton onClick={onNext} label="开始主题词初遇" />
    </div>
  );
}

function NextButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="mt-6 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">
      {label}
    </button>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="text-3xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}
