"use client";

import Link from "next/link";
import { Database, FileText, ShieldCheck, TerminalSquare } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export default function ReadingImportPage() {
  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Reading Import</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">外刊导入工作台</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          先 dry-run 查看将要同步的文件，再小批量下载、解析并生成 IELTS-style guided reading sessions。
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <StepCard
          icon={ShieldCheck}
          title="1. 确认来源权限"
          text="在 Reading Sources 勾选确认，只导入你有权使用的公开或本地材料。"
          href="/reading-lab/sources"
          action="打开来源设置"
        />
        <StepCard
          icon={TerminalSquare}
          title="2. Dry-run 预览"
          text="列出将要下载的文件，不写入本地缓存，适合先检查范围和大小。"
          href="#commands"
          action="查看命令"
        />
        <StepCard
          icon={Database}
          title="3. 生成阅读任务"
          text="下载和解析完成后，文章会写入 data/private/readings.generated.json。"
          href="/reading-lab/articles"
          action="查看文章库"
        />
      </section>

      <section id="commands" className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <FileText className="text-indigo-600" size={22} />
          <h2 className="text-2xl font-black text-slate-950">推荐命令</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          第一次只抓 5-10 个文件。实际下载需要你已经确认来源使用权，并加上 <code className="rounded bg-slate-100 px-1 py-0.5">--confirm-consent</code>。
        </p>
        <pre className="mt-4 overflow-auto rounded-2xl bg-slate-950 p-4 text-sm font-semibold leading-7 text-slate-100">
{`npm run crawl:readings -- --source awesome_english_ebooks --magazine economist --limit 10 --dry-run

npm run crawl:readings -- --source awesome_english_ebooks --magazine economist --limit 10 --confirm-consent

npm run build:reading-sessions`}
        </pre>
      </section>

      <section className="mt-6 rounded-2xl bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        下载文件、解析文本和生成的私有阅读数据都会写入 <span className="font-black">private/</span> 或{" "}
        <span className="font-black">data/private/</span>，这些目录已经加入 .gitignore。
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
