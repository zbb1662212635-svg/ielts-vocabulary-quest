"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useScenarioReadings } from "@/lib/useScenarioReadings";

export default function ScenarioArticlesPage() {
  const scenario = useScenarioReadings();

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Scenario Articles</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">情景阅读素材库</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          当前数据源：<span className="font-black text-indigo-700">{scenario.source}</span>，共 {scenario.articles.length} 篇情景阅读素材。
        </p>
      </section>

      <section className="mt-6 grid gap-4">
        {scenario.articles.map((article) => (
          <Link
            key={article.id}
            href={`/reading-lab/${article.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200"
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                  {article.sourceName ?? article.sourceType}
                </div>
                <h2 className="mt-2 text-xl font-black text-slate-950">{article.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{article.summary ?? article.backgroundNote}</p>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Badge>{article.level}</Badge>
                <Badge>{article.wordCount} words</Badge>
                <Badge>{article.keyVocabulary.length} words</Badge>
                <Badge>{article.usefulExpressions.length} expressions</Badge>
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
