"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpenCheck, FileQuestion, ListChecks, RotateCcw, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

type ReadingHealth = {
  imported: boolean;
  passages: number;
  questions: number;
  readyQuestions: number;
  questionsWithAnswers: number;
  questionsWithEvidence: number;
  questionsNeedingReview: number;
  needsReview: number;
  lastImportedAt: string | null;
};

export default function ReadingDossierPage() {
  const [health, setHealth] = useState<ReadingHealth | null>(null);

  useEffect(() => {
    fetch("/api/reading-health")
      .then((response) => response.json())
      .then((data: ReadingHealth) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Reading Dossier</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">雅思阅读档案库</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          这里把本地雅思阅读材料转换成文章、题目和复查清单。没有答案依据时，系统只展示材料，不会自动编造答案。
        </p>
        {!health?.imported ? (
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800">
            阅读资源还没有导入。请先运行 npm run import:reading；应用仍会使用 sample 阅读任务。
          </p>
        ) : null}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat icon={BookOpenCheck} label="阅读文章" value={health?.passages ?? 0} />
        <Stat icon={FileQuestion} label="题目总数" value={health?.questions ?? 0} />
        <Stat icon={ListChecks} label="可判分题目" value={health?.readyQuestions ?? 0} />
        <Stat icon={RotateCcw} label="需要复查" value={health?.needsReview ?? 0} />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <QuickLink href="/reading/passages" title="Reading Passages" text="查看已经抽取的阅读文章和段落。" />
        <QuickLink href="/reading/questions" title="Reading Questions" text="查看题目、答案状态、证据和复查原因。" />
        <QuickLink href="/review" title="Review Reading Mistakes" text="复盘阅读错因，训练同义替换、TFNG 和定位。" />
      </section>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Icon className="text-indigo-600" size={24} />
      <div className="mt-4 text-3xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-sm font-bold text-slate-500">{label}</div>
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
