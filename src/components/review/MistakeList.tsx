import type { ReviewItem, UserProgress } from "@/lib/types";
import { MasteryBadge } from "./MasteryBadge";

export function MistakeList({
  items,
  progress,
}: {
  items: ReviewItem[];
  progress: Record<string, UserProgress>;
}) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm leading-6 text-slate-600">
        暂无错因。完成今日场景任务后，词汇、听写、阅读和外刊中的错误会自动进入这里。
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.slice(0, 8).map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <div className="text-sm font-black text-slate-950">{cleanWordId(item.wordId)}</div>
            <div className="mt-1 text-xs font-semibold text-rose-600">{item.errorType}</div>
          </div>
          <MasteryBadge value={progress[item.wordId]?.mastery ?? 0} />
        </div>
      ))}
    </div>
  );
}

function cleanWordId(wordId: string) {
  return wordId
    .replace(/^synonym_/, "")
    .replace(/^listen_/, "")
    .replace(/^vocab_/, "")
    .replace(/^mission_[^_]+_/, "")
    .replace(/_/g, " ");
}
