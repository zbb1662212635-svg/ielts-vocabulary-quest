"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import type { LearningResource, ResourceIndex, ResourceType } from "@/lib/resourceTypes";

const filters: Array<{ label: string; value: "all" | ResourceType | "needs_review" }> = [
  { label: "All", value: "all" },
  { label: "IELTS papers", value: "ielts_past_paper" },
  { label: "Vocabulary", value: "ielts_vocabulary" },
  { label: "Audio", value: "ielts_listening_audio" },
  { label: "Transcripts", value: "ielts_transcript" },
  { label: "Answer keys", value: "answer_key" },
  { label: "Magazines", value: "foreign_magazine" },
  { label: "Needs review", value: "needs_review" },
];

export default function ResourceItemsPage() {
  const [index, setIndex] = useState<ResourceIndex | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");

  useEffect(() => {
    fetch("/api/resources")
      .then((response) => response.json())
      .then((data: ResourceIndex) => setIndex(data))
      .catch(() => setIndex(null));
  }, []);

  const items = useMemo(() => {
    const all = index?.items ?? [];
    if (filter === "all") return all;
    if (filter === "needs_review") return all.filter((item) => item.status === "needs_review");
    return all.filter((item) => item.type === filter);
  }, [filter, index]);

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Resource Items</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">资源列表</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          当前显示的是扫描索引，不读取文件正文。资源总数：{index?.items.length ?? 0}
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              className={`rounded-2xl px-4 py-2 text-sm font-black ${
                filter === item.value ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
              onClick={() => setFilter(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Folder</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Modified</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Skill tags</th>
                <th className="px-4 py-3">Topic tags</th>
                <th className="px-4 py-3">Warnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.slice(0, 300).map((item) => (
                <ResourceRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
        {items.length > 300 && <p className="border-t border-slate-100 p-4 text-sm text-slate-500">仅显示前 300 条。</p>}
      </section>
    </AppShell>
  );
}

function ResourceRow({ item }: { item: LearningResource }) {
  return (
    <tr className="align-top">
      <td className="max-w-xs px-4 py-3 font-bold text-slate-900">{item.title}</td>
      <td className="px-4 py-3 text-slate-600">{item.type}</td>
      <td className="px-4 py-3 text-slate-600">{item.fileKind}</td>
      <td className="px-4 py-3 text-slate-600">{item.folder}</td>
      <td className="px-4 py-3 text-slate-600">{formatSize(item.sizeBytes)}</td>
      <td className="px-4 py-3 text-slate-600">{item.modifiedAt.slice(0, 10)}</td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-1 text-xs font-black ${item.status === "needs_review" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
          {item.status}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-600">{item.skillTags.join(", ")}</td>
      <td className="px-4 py-3 text-slate-600">{item.topicTags.join(", ")}</td>
      <td className="px-4 py-3 text-slate-600">{item.warnings.join(", ") || "-"}</td>
    </tr>
  );
}

function formatSize(value: number) {
  if (value > 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value > 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}
