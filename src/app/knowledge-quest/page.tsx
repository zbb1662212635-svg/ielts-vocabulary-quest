"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckCircle2, Compass, Headphones } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { knowledgeRoutes } from "@/data/knowledge.sample";
import {
  getCompletedKnowledgeMissions,
  getSelectedKnowledgeRoute,
  saveSelectedKnowledgeRoute,
} from "@/lib/storage";

export default function KnowledgeQuestPage() {
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>();
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      setSelectedRouteId(getSelectedKnowledgeRoute());
      setCompleted(getCompletedKnowledgeMissions());
    });
  }, []);

  function chooseRoute(routeId: string) {
    saveSelectedKnowledgeRoute(routeId);
    setSelectedRouteId(routeId);
  }

  return (
    <AppShell>
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Knowledge Quest 知识探索</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          用你感兴趣的主题训练雅思听读能力。
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          这里不是百科阅读区。每个知识主题都会绑定 IELTS 技能：同义替换、语境词义、段落主旨、听写拼写和错因复盘。
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        {knowledgeRoutes.map((route) => {
          const selected = selectedRouteId === route.id;
          const mission = route.missions[0];
          const completedCount = route.missions.filter((item) => completed.includes(item.id)).length;

          return (
            <section
              key={route.id}
              className={`rounded-2xl border bg-white p-6 shadow-sm ${
                selected ? "border-indigo-300 ring-4 ring-indigo-50" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">{route.title}</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{route.subtitle}</h2>
                </div>
                {selected && <CheckCircle2 className="text-emerald-600" size={22} />}
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">{route.description}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  推荐 {route.recommendedLevel}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {route.missions.length} 个任务
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  已完成 {completedCount}
                </span>
              </div>

              <div className="mt-5 grid gap-2 text-sm text-slate-600">
                <SkillLine icon={<BookOpenCheck size={16} />} text="Reading：同义替换 / 主旨 / 语境判断" />
                <SkillLine icon={<Headphones size={16} />} text="Listening：学术词听写拼写" />
                <SkillLine icon={<Compass size={16} />} text={`今日任务：${mission.subtitle}`} />
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => chooseRoute(route.id)}
                  className={`rounded-2xl px-5 py-3 text-sm font-bold ${
                    selected
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
                  }`}
                >
                  {selected ? "已设为默认路线" : "选择这条路线"}
                </button>
                <Link
                  href={`/knowledge-quest/${mission.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  开始首个任务
                  <ArrowRight size={16} />
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}

function SkillLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-indigo-600">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
