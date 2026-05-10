import Link from "next/link";
import { ArrowRight, BookOpenCheck, Headphones, RotateCcw, Sparkles } from "lucide-react";
import type { DailyMission } from "@/lib/types";

export function DailyMissionCard({ mission }: { mission: DailyMission }) {
  const rows = [
    { label: "新词初遇", value: mission.newWordIds.length, minutes: "7 分钟", icon: Sparkles },
    { label: "同义替换", value: mission.synonymPairIds.length, minutes: "8 分钟", icon: BookOpenCheck },
    { label: "听写拼写", value: mission.dictationWordIds.length, minutes: "6 分钟", icon: Headphones },
    { label: "错词复盘", value: mission.reviewWordIds.length, minutes: "4 分钟", icon: RotateCcw },
  ];

  return (
    <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">今日任务</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{mission.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            今天只完成一节 20-30 分钟的雅思词汇课：先复盘，再遇见新词，最后用 Reading 和 Listening 题型巩固。
          </p>
        </div>
        <Link
          href="/mission"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700"
        >
          开始今日任务
          <ArrowRight size={17} />
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="rounded-2xl bg-slate-50 p-4">
              <Icon className="text-indigo-600" size={18} />
              <div className="mt-3 text-2xl font-black text-slate-950">{row.value}</div>
              <div className="text-xs font-semibold text-slate-500">{row.label} · {row.minutes}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl bg-indigo-50 p-4 md:grid-cols-2">
        <div>
          <div className="text-sm font-black text-indigo-950">今日重点</div>
          <p className="mt-1 text-sm leading-6 text-indigo-900">
            Reading：建立题干词与原文 paraphrase 的替换反射；Listening：减少高危词拼写和单复数失分。
          </p>
        </div>
        <div>
          <div className="text-sm font-black text-indigo-950">完成后你会得到</div>
          <p className="mt-1 text-sm leading-6 text-indigo-900">
            新错词会自动进入复盘，技能分数会更新，明天任务会优先安排薄弱项。
          </p>
        </div>
      </div>
    </section>
  );
}
