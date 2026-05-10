import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ieltsMissions, topicRouteLabels } from "@/data/ielts-missions.sample";

const allRoutes = [
  "science_technology",
  "art_culture",
  "environment_nature",
  "education_learning",
  "health_lifestyle",
  "work_business",
  "cities_transport",
  "media_communication",
  "history_society",
  "travel_daily_services",
] as const;

export default function QuestPage() {
  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">IELTS Topic Routes</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">雅思高频话题任务地图</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          分类按 IELTS 高频话题组织，每条路线都用具体角色、场景和任务目标包装，不再用宽泛学科分类。
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {allRoutes.map((route) => {
          const mission = ieltsMissions.find((item) => item.topicRoute === route);
          const label = topicRouteLabels[route];
          return (
            <div key={route} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-indigo-600">{label.title}</div>
              <h2 className="mt-2 text-xl font-black text-slate-950">{label.subtitle}</h2>
              {mission ? (
                <>
                  <p className="mt-3 text-sm font-bold text-slate-700">{mission.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{mission.scenario}</p>
                  <Link href="/mission" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">
                    Start route mission
                    <ArrowRight size={15} />
                  </Link>
                </>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-500">路线已规划，任务样例将在后续版本加入。</p>
              )}
            </div>
          );
        })}
      </section>
    </AppShell>
  );
}
