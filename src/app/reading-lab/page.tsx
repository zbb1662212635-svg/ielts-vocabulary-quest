"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, BookmarkPlus, Database, FileText, Lightbulb } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import {
  getSavedExpressions,
  getSavedScenarioSentences,
  getSavedScenarioWords,
  getScenarioTakeaways,
} from "@/lib/scenarioReadingStorage";
import { useScenarioReadings } from "@/lib/useScenarioReadings";

const topicLabels: Record<string, string> = {
  science_technology: "科学与技术",
  art_culture: "艺术与文化",
  environment_nature: "环境与自然",
  education_learning: "教育与学习",
  health_lifestyle: "健康与生活方式",
  work_business: "工作与商业",
  cities_transport: "城市与交通",
  media_communication: "媒体与交流",
  history_society: "历史与社会",
  travel_daily_services: "旅行与日常服务",
};

export default function ReadingLabPage() {
  const scenario = useScenarioReadings();
  const articles = scenario.articles;
  const today = articles[0];
  const savedWords = typeof window === "undefined" ? [] : getSavedScenarioWords();
  const savedExpressions = typeof window === "undefined" ? [] : getSavedExpressions();
  const savedSentences = typeof window === "undefined" ? [] : getSavedScenarioSentences();
  const takeaways = typeof window === "undefined" ? [] : getScenarioTakeaways();

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Scenario Reading Library</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">情景阅读扩展</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          这里不是再做一套题，而是用真实语境补强 Mission：读短摘录、理解背景、保存表达、积累词汇和长难句。
        </p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-700">
              <BookOpenCheck size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Today&apos;s Scenario Reading</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">{today?.title ?? "暂无情景阅读"}</h2>
              {today ? (
                <>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{today.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge>{today.sourceName ?? "Scenario source"}</Badge>
                    <Badge>{today.topicTags.map((tag) => topicLabels[tag] ?? tag).join(" / ")}</Badge>
                    <Badge>{today.level}</Badge>
                    <Badge>{today.estimatedMinutes} min</Badge>
                  </div>
                  <Link
                    href={`/reading-lab/${today.id}`}
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"
                  >
                    Start Scenario Reading
                    <ArrowRight size={16} />
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <StatCard icon={Database} label="Scenario articles" value={articles.length} helper={scenario.source} />
          <StatCard icon={BookmarkPlus} label="Saved words" value={savedWords.length} helper="for vocabulary review" />
          <StatCard icon={Lightbulb} label="Saved expressions" value={savedExpressions.length} helper="for expression bank" />
          <StatCard icon={FileText} label="Saved sentences" value={savedSentences.length + takeaways.length} helper="sentences + takeaways" />
        </section>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <QuickLink href="/reading-lab/articles" title="Scenario Articles" text="查看本地或 sample 情景阅读素材。" />
        <QuickLink href="/reading-lab/import" title="Import Workbench" text="查看情景阅读导入命令和输出文件。" />
        <QuickLink href="/reading-lab/sources" title="Reading Sources" text="配置来源、许可确认和本地导入范围。" />
        <QuickLink href="/reading-lab/review" title="Expression Review" text="查看保存的词、表达、长难句和 takeaway。" />
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
