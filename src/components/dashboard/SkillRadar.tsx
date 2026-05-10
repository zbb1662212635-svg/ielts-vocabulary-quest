import type { SkillMetric } from "@/lib/types";
import { ProgressCard } from "./ProgressCard";

export function SkillRadar({ metrics }: { metrics: SkillMetric[] }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-950">当前能力状态</h2>
          <p className="mt-1 text-sm text-slate-600">完成任务后，这里会显示听写、同义替换和复盘的真实正确率。</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <ProgressCard key={metric.label} metric={metric} />
        ))}
      </div>
    </section>
  );
}
