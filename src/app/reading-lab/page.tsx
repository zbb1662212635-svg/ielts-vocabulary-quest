"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, Database, Newspaper, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getReadingProgressMap, getSavedReadingWords } from "@/lib/readingStorage";
import { useReadings } from "@/lib/useReadings";

const routeLabels = {
  society_ideas: "人文社科",
  technology_civilization: "科技史",
  world_order_power: "国际政治",
  economics_globalization: "经济全球化",
  science_environment: "科学与环境",
  general: "通用主题",
};

export default function ReadingLabPage() {
  const readings = useReadings();
  const articles = readings.articles;
  const today = articles[0];
  const progress = typeof window === "undefined" ? {} : getReadingProgressMap();
  const savedWords = typeof window === "undefined" ? [] : getSavedReadingWords();
  const completedCount = Object.values(progress).filter((item) => item.completedAt).length;

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Foreign Press Reading Lab</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">外刊精读实验室</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          把外刊文章转化成 IELTS Reading 训练：主旨、同义替换、TFNG、作者态度、长难句和生词复盘。
        </p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-700">
              <Newspaper size={24} />
            </div>
            <div className="flex-1">
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Today&apos;s Reading</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">{today?.title ?? "暂无文章"}</h2>
              {today && (
                <>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{today.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge>{today.publication}</Badge>
                    <Badge>{routeLabels[today.interestRoute]}</Badge>
                    <Badge>{today.level}</Badge>
                    <Badge>{today.estimatedMinutes} min</Badge>
                  </div>
                  <Link
                    href={`/reading-lab/${today.id}`}
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"
                  >
                    Start Guided Reading
                    <ArrowRight size={16} />
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <StatCard icon={Database} label="Articles loaded" value={articles.length} helper={readings.source} />
          <StatCard icon={BookOpenCheck} label="Articles completed" value={completedCount} helper="progress persists locally" />
          <StatCard icon={RotateCcw} label="Saved words" value={savedWords.length} helper="for Vocabulary Quest" />
        </section>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <QuickLink href="/reading-lab/articles" title="Imported Articles" text="查看所有 sample 或私有导入文章。" />
        <QuickLink href="/reading-lab/import" title="Import Workbench" text="查看 dry-run、小批量同步和生成阅读任务命令。" />
        <QuickLink href="/reading-lab/sources" title="Reading Sources" text="启用来源、确认许可并查看同步命令。" />
        <QuickLink href="/reading-lab/review" title="Reading Review" text="查看阅读错题、生词和长难句复盘。" />
      </section>
    </AppShell>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{children}</span>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Icon className="text-indigo-600" size={20} />
      <div className="mt-3 text-3xl font-black text-slate-950">{value}</div>
      <div className="text-sm font-bold text-slate-700">{label}</div>
      <div className="mt-1 text-xs font-semibold text-slate-500">{helper}</div>
    </div>
  );
}

function QuickLink({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </Link>
  );
}
