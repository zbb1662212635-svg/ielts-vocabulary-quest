"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useReadings } from "@/lib/useReadings";

const routeLabels = {
  society_ideas: "人文社科",
  technology_civilization: "科技史",
  world_order_power: "国际政治",
  economics_globalization: "经济全球化",
  science_environment: "科学与环境",
  general: "通用主题",
};

export default function ReadingArticlesPage() {
  const readings = useReadings();

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Imported Articles</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">外刊文章库</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          当前数据源：<span className="font-black text-indigo-700">{readings.source}</span>，共 {readings.articles.length} 篇文章。
        </p>
      </section>

      <section className="mt-6 grid gap-4">
        {readings.articles.map((article) => (
          <Link
            key={article.id}
            href={`/reading-lab/${article.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200"
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-indigo-600">{article.publication}</div>
                <h2 className="mt-2 text-xl font-black text-slate-950">{article.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{article.summary}</p>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Badge>{routeLabels[article.interestRoute]}</Badge>
                <Badge>{article.level}</Badge>
                <Badge>{article.wordCount} words</Badge>
                <Badge>{article.questions.length} questions</Badge>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{children}</span>;
}
