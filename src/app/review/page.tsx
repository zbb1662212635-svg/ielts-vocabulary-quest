"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MistakeList } from "@/components/review/MistakeList";
import { ReviewCard } from "@/components/review/ReviewCard";
import { scheduleNextReview } from "@/lib/scheduler";
import { applyAttempt } from "@/lib/scoring";
import { DEFAULT_SETTINGS, getAppSettings } from "@/lib/settings";
import {
  getAttempts,
  getProgressMap,
  getReviewItems,
  markReviewResult,
  saveAttempt,
  saveProgressMap,
} from "@/lib/storage";
import type { AppSettings, ReviewItem, TrainingAttempt, UserProgress } from "@/lib/types";

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [progress, setProgress] = useState<Record<string, UserProgress>>({});
  const [attemptCount, setAttemptCount] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [now, setNow] = useState(0);

  useEffect(() => {
    queueMicrotask(() => {
      setItems(getReviewItems());
      setProgress(getProgressMap());
      setAttemptCount(getAttempts().length);
      setSettings(getAppSettings());
      setNow(Date.now());
    });
  }, []);

  const due = useMemo(() => {
    const cap = Math.min(settings.review.dailyReviewCap, settings.dailyMission.reviewLimitPerDay);
    return items.filter((item) => new Date(item.dueAt).getTime() <= now).slice(0, cap);
  }, [items, now, settings.dailyMission.reviewLimitPerDay, settings.review.dailyReviewCap]);

  const current = due[0];
  const counts = {
    spelling: items.filter((item) => item.errorType === "spelling_error" || item.errorType === "plural_error").length,
    synonym: items.filter((item) => item.errorType === "wrong_synonym").length,
    reading: items.filter((item) =>
      ["main_idea_error", "tfng_error", "author_attitude_error", "context_misread"].includes(item.errorType),
    ).length,
  };

  function rate(result: "again" | "hard" | "good" | "easy") {
    if (!current) return;
    const isCorrect = result === "good" || result === "easy";
    const createdAt = new Date().toISOString();
    const attempt: TrainingAttempt = {
      id: `review_${createdAt}_${current.id}`,
      wordId: current.wordId,
      mode: "review",
      prompt: `复盘 ${current.errorType}`,
      userAnswer: result,
      correctAnswer: "good",
      isCorrect,
      errorType: isCorrect ? undefined : current.errorType,
      createdAt,
    };
    const nextProgress = getProgressMap();
    nextProgress[current.wordId] = applyAttempt(nextProgress[current.wordId], attempt, attempt.errorType);
    saveProgressMap(nextProgress);
    saveAttempt(attempt);
    const nextInterval = scheduleNextReview(current.intervalDays, result);
    markReviewResult(current.id, result, nextInterval);
    setItems(getReviewItems());
    setProgress(nextProgress);
    setNow(Date.now());
  }

  return (
    <AppShell>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Review Room 错因复盘</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          今天只复习真正影响提分的错误。
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          每日最多精选 {Math.min(settings.review.dailyReviewCap, settings.dailyMission.reviewLimitPerDay)} 个项目，优先处理拼写、同义替换和阅读证据定位问题。
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-2xl font-black text-slate-950">{due.length}</div>
          <div className="text-xs font-bold text-slate-500">今日精选复盘</div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-2xl font-black text-rose-600">{counts.spelling}</div>
          <div className="text-xs font-bold text-slate-500">听力拼写错误</div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-2xl font-black text-indigo-600">{counts.synonym}</div>
          <div className="text-xs font-bold text-slate-500">同义替换错因</div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-2xl font-black text-amber-600">{counts.reading}</div>
          <div className="text-xs font-bold text-slate-500">阅读定位错因</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          {current ? (
            <ReviewCard key={current.id} item={current} onRate={rate} />
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-600">当前清空</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {attemptCount === 0 ? "暂无复盘任务" : "现在没有到期错因"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {attemptCount === 0
                  ? "完成第一轮今日任务后，系统会把错题按错误类型安排到这里。"
                  : "继续完成场景任务，新的错因会进入下一次复盘。"}
              </p>
            </section>
          )}
        </div>
        <aside>
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">错因记录</h2>
          <MistakeList items={items} progress={progress} />
        </aside>
      </div>
    </AppShell>
  );
}
