"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, GitBranch, Network, RadioTower } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

type GraphHealth = {
  generatedAt: string;
  stats: {
    totalNodes: number;
    totalEdges: number;
    byNodeType: Record<string, number>;
    byTopic: Record<string, number>;
    bySkill: Record<string, number>;
  };
  report?: {
    warnings: string[];
    orphanVocabularyItems: number;
    readingPassagesWithoutQuestions: number;
    audioWithoutTranscript: number;
    scenarioArticlesWithoutTopic: number;
    missionsWithoutEnoughResources: number;
  } | null;
  needsReviewCount: number;
  warnings: string[];
};

export default function ContentGraphPage() {
  const [health, setHealth] = useState<GraphHealth | null>(null);

  useEffect(() => {
    fetch("/api/content-graph-health")
      .then((response) => response.json())
      .then((payload) => setHealth(payload))
      .catch(() => setHealth(null));
  }, []);

  const stats = health?.stats;

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-indigo-600">Content Graph Health</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">内容图谱健康</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              这里检查词汇、听写、雅思阅读、情景阅读和任务之间是否已经连成一个可组课的学习网络。
            </p>
          </div>
          <Network className="text-indigo-600" size={34} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Stat label="节点总数" value={stats?.totalNodes ?? 0} />
          <Stat label="连接总数" value={stats?.totalEdges ?? 0} />
          <Stat label="需要复核" value={health?.needsReviewCount ?? 0} />
          <Stat label="警告" value={health?.warnings.length ?? 0} />
        </div>

        {health?.warnings.length ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-amber-800">
              <AlertTriangle size={18} />
              图谱警告
            </div>
            <ul className="mt-3 space-y-2 text-sm text-amber-800">
              {health.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <Breakdown title="按资源类型" icon={GitBranch} data={stats?.byNodeType ?? {}} />
        <Breakdown title="按雅思话题" icon={RadioTower} data={stats?.byTopic ?? {}} />
        <Breakdown title="按训练能力" icon={Network} data={stats?.bySkill ?? {}} />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">重点诊断</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <Diagnostic label="孤立词汇" value={health?.report?.orphanVocabularyItems ?? 0} />
          <Diagnostic label="无题阅读" value={health?.report?.readingPassagesWithoutQuestions ?? 0} />
          <Diagnostic label="无文本音频" value={health?.report?.audioWithoutTranscript ?? 0} />
          <Diagnostic label="无话题外刊" value={health?.report?.scenarioArticlesWithoutTopic ?? 0} />
          <Diagnostic label="任务资源不足" value={health?.report?.missionsWithoutEnoughResources ?? 0} />
        </div>
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="text-3xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}

function Breakdown({
  title,
  icon: Icon,
  data,
}: {
  title: string;
  icon: typeof GitBranch;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 12);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-slate-950">
        <Icon className="text-indigo-600" size={18} />
        {title}
      </div>
      <div className="mt-4 space-y-3">
        {entries.length ? (
          entries.map(([key, value]) => (
            <div key={key}>
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>{key}</span>
                <span>{value}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.min(100, value)}%` }} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">还没有图谱数据。请先运行内容图谱构建。</p>
        )}
      </div>
    </div>
  );
}

function Diagnostic({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-2xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}
