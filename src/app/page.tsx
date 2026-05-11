"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, ClipboardList, FileText, Headphones, Network, PackageCheck, Target } from "lucide-react";
import { SkillRadar } from "@/components/dashboard/SkillRadar";
import { AppShell } from "@/components/layout/AppShell";
import { topicRouteLabels } from "@/data/ielts-missions.sample";
import { buildSkillMetrics } from "@/lib/scoring";
import { DEFAULT_SETTINGS, getAppSettings } from "@/lib/settings";
import { getAttempts, getReviewItems } from "@/lib/storage";
import type { AppSettings, ReviewItem, TrainingAttempt } from "@/lib/types";
import { useGeneratedMission } from "@/lib/useGeneratedMission";

const flowCards = [
  { title: "词汇装备", text: "先拿到本场景需要的核心词、搭配、同义替换和听力风险词。", icon: PackageCheck },
  { title: "听力场景", text: "围绕同一任务做听写，拼写、单复数和空格错误会进入复盘。", icon: Headphones },
  { title: "雅思阅读", text: "用真题或样例阅读训练主旨、定位、TFNG 和句子填空。", icon: BookOpenCheck },
  { title: "情景阅读", text: "用外刊摘录补充真实语境，保存表达、长难句和主题词。", icon: FileText },
  { title: "任务复盘", text: "汇总正确率、错因、保存内容和下一次复习重点。", icon: ClipboardList },
];

export default function DashboardPage() {
  const generated = useGeneratedMission();
  const mission = generated.mission;
  const route = topicRouteLabels[mission.topicRoute];
  const [attempts, setAttempts] = useState<TrainingAttempt[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    queueMicrotask(() => {
      setAttempts(getAttempts());
      setReviewItems(getReviewItems());
      setSettings(getAppSettings());
    });
  }, []);

  const metrics = useMemo(() => buildSkillMetrics(attempts), [attempts]);
  const scenarioAvailable = Boolean(mission.foreignPressExtension?.excerpt);

  return (
    <AppShell>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.35fr_0.85fr] lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              <Target size={14} />
              目标：IELTS Listening {settings.studyGoal.targetListeningBand} / Reading {settings.studyGoal.targetReadingBand}
            </div>
            <p className="mt-5 text-sm font-bold uppercase tracking-wide text-indigo-600">今日雅思沉浸式任务</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">{mission.title}</h1>
            <p className="mt-3 text-base font-bold text-slate-700">
              {route?.subtitle ?? "雅思任务"} · 你的身份：{mission.role} · {mission.estimatedMinutes} 分钟 · {mission.level}
            </p>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{mission.scenario}</p>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
              系统会围绕同一个雅思话题自动组织词汇、听写、阅读、外刊情景材料和错题复盘。你只需要点击一次，按顺序完成今天这节课。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/mission"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700"
              >
                开始今日任务
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/resource-library/graph"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:border-indigo-200"
              >
                <Network size={17} />
                查看内容图谱
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5">
            <div className="text-sm font-black text-slate-950">今日任务流程</div>
            <div className="mt-4 space-y-3">
              {flowCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3">
                    <Icon className="mt-0.5 text-indigo-600" size={18} />
                    <div>
                      <div className="text-sm font-black text-slate-950">{item.title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{item.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <StatusCard label="今日精选复习" value={Math.min(reviewItems.length, settings.review.dailyReviewCap)} />
        <StatusCard label="场景词汇" value={mission.vocabularyLoadout.length} />
        <StatusCard label="听写项目" value={mission.listeningScene.items.length} />
        <StatusCard label="阅读题目" value={mission.readingTask.questions.length} />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <ResourceCard label="情景阅读" value={scenarioAvailable ? "已接入" : "使用样例"} />
        <ResourceCard label="任务话题" value={route?.title ?? mission.topicRoute} />
        <ResourceCard label="组课降级" value={generated.usedFallbacks.length ? `${generated.usedFallbacks.length} 项` : "无"} />
        <ResourceCard label="系统提示" value={generated.warnings.length ? "需关注" : "正常"} />
      </section>

      {generated.warnings.length ? (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800">
          {generated.warnings[0]}
        </section>
      ) : null}

      <div className="mt-6">
        <SkillRadar metrics={metrics} />
      </div>
    </AppShell>
  );
}

function StatusCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-3xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}

function ResourceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}
