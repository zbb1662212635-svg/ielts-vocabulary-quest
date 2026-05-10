"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FolderSearch } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { ResourceHealth } from "@/lib/resourceTypes";

const expectedFolders = [
  "ielts-papers",
  "vocabulary-books",
  "listening-audio",
  "transcripts",
  "answer-keys",
  "magazines",
  "foreign-reading",
  "processed-notes",
];

export default function ResourceHealthPage() {
  const [health, setHealth] = useState<ResourceHealth | null>(null);

  useEffect(() => {
    fetch("/api/resource-health")
      .then((response) => response.json())
      .then((data: ResourceHealth) => setHealth(data))
      .catch(() =>
        setHealth({
          resourceRoot: "C:/Users/zhangbinbin/Desktop/\u5b66\u82f1\u8bed",
          scannedAt: "",
          rootExists: false,
          totalFiles: 0,
          byType: {},
          byFileKind: {},
          byFolder: {},
          missingExpectedFolders: expectedFolders,
          detectedExpectedFolders: [],
          warnings: ["Resource health check failed."],
        }),
      );
  }, []);

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Resource Library Health</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">本地学习资源健康检查</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          这里只显示外部资源目录的扫描结果。原始 PDF、EPUB、音频、真题和生成的私有索引不会提交到 GitHub。
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {!health ? (
          <p className="text-sm font-bold text-slate-500">正在检查资源目录...</p>
        ) : (
          <>
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <div className="text-sm font-bold text-slate-500">Resource root</div>
                <div className="mt-2 break-all text-xl font-black text-slate-950">{health.resourceRoot}</div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {health.rootExists ? "资源目录已配置并可读取。" : "资源目录不存在，应用会继续使用 sample 数据。"}
                </p>
              </div>
              <StatusBadge ok={health.rootExists} />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Stat label="扫描到的文件" value={health.totalFiles.toString()} />
              <Stat label="已检测文件夹" value={health.detectedExpectedFolders.length.toString()} />
              <Stat label="缺失文件夹" value={health.missingExpectedFolders.length.toString()} />
            </div>
          </>
        )}
      </section>

      {health && (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {expectedFolders.map((folder) => {
            const detected = health.detectedExpectedFolders.includes(folder);
            return (
              <div key={folder} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <FolderSearch className="text-indigo-600" size={22} />
                  {detected ? (
                    <CheckCircle2 className="text-emerald-600" size={20} />
                  ) : (
                    <AlertTriangle className="text-amber-600" size={20} />
                  )}
                </div>
                <h2 className="mt-4 text-base font-black text-slate-950">{folder}</h2>
                <p className="mt-2 text-xs font-bold text-slate-500">{detected ? "detected" : "missing"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{health.byFolder[folder] ?? 0} files</p>
              </div>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}

function StatusBadge({ ok }: { ok: boolean }) {
  const style = ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";
  return <div className={`rounded-2xl px-4 py-2 text-sm font-black ${style}`}>{ok ? "configured" : "not found"}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="text-2xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}
