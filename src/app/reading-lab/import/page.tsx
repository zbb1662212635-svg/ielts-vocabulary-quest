import { Database, FileText, ShieldCheck, TerminalSquare } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

export default function ScenarioReadingImportPage() {
  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Scenario Reading Import</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">情景阅读导入工作台</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          外刊和外部阅读材料在这里被转换成“情景阅读资产”：摘录、背景、词汇、表达、长难句和反思提示，而不是另一套考试题。
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <StepCard
          icon={ShieldCheck}
          title="1. 确认材料来源"
          text="只导入你有权用于个人学习的本地或公开材料，原始文件不会进入 GitHub。"
          href="/reading-lab/sources"
          action="查看来源设置"
        />
        <StepCard
          icon={TerminalSquare}
          title="2. 生成情景阅读资产"
          text="脚本会从 magazines、foreign-reading 或 processed-notes 中提取短摘录和语言资产。"
          href="#commands"
          action="查看命令"
        />
        <StepCard
          icon={Database}
          title="3. 在 Mission 中使用"
          text="Mission 的最后一段会调用相关摘录，帮助你进入真实话题语境。"
          href="/reading-lab/articles"
          action="查看素材库"
        />
      </section>

      <section id="commands" className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <FileText className="text-indigo-600" size={22} />
          <h2 className="text-2xl font-black text-slate-950">推荐命令</h2>
        </div>
        <pre className="mt-4 overflow-auto rounded-2xl bg-slate-950 p-4 text-sm font-semibold leading-7 text-slate-100">
{`npm run index:resources
npm run import:scenario-reading

# 或指定本地文件夹
npm run import:scenario-reading -- --input "C:/Users/zhangbinbin/Desktop/学英语/foreign-reading"`}
        </pre>
      </section>

      <section className="mt-6 rounded-2xl bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        输出会写入 <span className="font-black">data/private/scenario-*.json</span>。这些私有生成数据已被 .gitignore 排除。
      </section>
    </AppShell>
  );
}

function StepCard({
  icon: Icon,
  title,
  text,
  href,
  action,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200">
      <Icon className="text-indigo-600" size={22} />
      <h2 className="mt-4 text-lg font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
      <div className="mt-4 text-sm font-black text-indigo-700">{action}</div>
    </Link>
  );
}
