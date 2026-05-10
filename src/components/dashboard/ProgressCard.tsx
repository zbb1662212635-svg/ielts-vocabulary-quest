import type { SkillMetric } from "@/lib/types";

export function ProgressCard({ metric }: { metric: SkillMetric }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{metric.label}</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">{metric.helper}</p>
        </div>
        <div className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700">
          {metric.value}%
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-indigo-600"
          style={{ width: `${Math.max(metric.value, 4)}%` }}
        />
      </div>
    </div>
  );
}
