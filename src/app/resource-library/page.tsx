"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Database, FileAudio, FileText, Library, Newspaper, Stethoscope } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { ResourceHealth } from "@/lib/resourceTypes";

export default function ResourceLibraryPage() {
  const [health, setHealth] = useState<ResourceHealth | null>(null);

  useEffect(() => {
    fetch("/api/resource-health")
      .then((response) => response.json())
      .then((data: ResourceHealth) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  const cards = useMemo(
    () => [
      { label: "IELTS 真题", value: health?.byType.ielts_past_paper ?? 0, icon: FileText },
      { label: "词汇资源", value: health?.byType.ielts_vocabulary ?? 0, icon: Library },
      { label: "听力音频", value: health?.byType.ielts_listening_audio ?? 0, icon: FileAudio },
      { label: "听力文本", value: health?.byType.ielts_transcript ?? 0, icon: FileText },
      { label: "答案解析", value: health?.byType.answer_key ?? 0, icon: Stethoscope },
      { label: "外刊素材", value: health?.byType.foreign_magazine ?? 0, icon: Newspaper },
    ],
    [health],
  );

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Resource Library</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">本地资源库</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          这里先做资源发现和索引，不解析原文内容。后续词汇、音频、真题和外刊训练都会从这个索引开始。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/resource-library/items" className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white">
            查看资源列表
          </Link>
          <Link href="/resource-library/health" className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700">
            查看健康检查
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
              <Database size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500">Resource root</p>
              <p className="mt-1 break-all text-lg font-black text-slate-950">{health?.resourceRoot ?? "未扫描"}</p>
              <p className="mt-2 text-sm text-slate-600">总文件数：{health?.totalFiles ?? 0}</p>
            </div>
          </div>
        </div>

        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <card.icon className="text-indigo-600" size={24} />
            <div className="mt-4 text-3xl font-black text-slate-950">{card.value}</div>
            <div className="mt-1 text-sm font-bold text-slate-500">{card.label}</div>
          </div>
        ))}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <AlertCount count={health?.warnings.length ?? 0} />
        </div>
      </section>
    </AppShell>
  );
}

function AlertCount({ count }: { count: number }) {
  return (
    <>
      <Stethoscope className={count ? "text-amber-600" : "text-emerald-600"} size={24} />
      <div className="mt-4 text-3xl font-black text-slate-950">{count}</div>
      <div className="mt-1 text-sm font-bold text-slate-500">需要注意的问题</div>
    </>
  );
}
