"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FolderSearch } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { ResourceHealth } from "@/lib/resourcePaths";

export default function ResourceHealthPage() {
  const [health, setHealth] = useState<ResourceHealth | null>(null);

  useEffect(() => {
    fetch("/api/resource-health")
      .then((response) => response.json())
      .then((data: ResourceHealth) => setHealth(data))
      .catch(() =>
        setHealth({
          configured: false,
          root: "C:/Users/zhangbinbin/Desktop/学英语",
          exists: false,
          status: "missing",
          message: "Resource health check failed.",
          folders: [],
          totalFiles: 0,
        }),
      );
  }, []);

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Resource Library Health</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">本地学习资源健康检查</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          项目只读取外部资源目录，不会把 PDF、EPUB、音频、真题、答案或生成的私有数据提交到 GitHub。
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
                <div className="mt-2 break-all text-xl font-black text-slate-950">{health.root}</div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{health.message}</p>
              </div>
              <StatusBadge status={health.status} />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Stat label="状态" value={health.status} />
              <Stat label="检测到的文件" value={health.totalFiles.toString()} />
              <Stat label="文件夹数量" value={health.folders.length.toString()} />
            </div>
          </>
        )}
      </section>

      {health && (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {health.folders.map((folder) => (
            <div key={folder.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <FolderSearch className="text-indigo-600" size={22} />
                {folder.exists ? (
                  <CheckCircle2 className="text-emerald-600" size={20} />
                ) : (
                  <AlertTriangle className="text-amber-600" size={20} />
                )}
              </div>
              <h2 className="mt-4 text-base font-black text-slate-950">{folder.name}</h2>
              <p className="mt-2 text-xs font-bold text-slate-500">{folder.exists ? "detected" : "missing"}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{folder.fileCount} files</p>
            </div>
          ))}
        </section>
      )}
    </AppShell>
  );
}

function StatusBadge({ status }: { status: ResourceHealth["status"] }) {
  const style =
    status === "configured"
      ? "bg-emerald-50 text-emerald-700"
      : status === "missing"
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-700";
  return <div className={`rounded-2xl px-4 py-2 text-sm font-black ${style}`}>{status}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="text-2xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}
