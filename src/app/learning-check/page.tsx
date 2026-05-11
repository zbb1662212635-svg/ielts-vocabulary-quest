"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";

type HealthPayload = {
  ok: boolean;
  generatedAt: string;
  checks: { key: string; label: string; ok: boolean; count?: number; error?: string }[];
  routes: string[];
};

const fallbackRoutes = [
  "/",
  "/mission",
  "/vocabulary",
  "/synonym-arena",
  "/dictation",
  "/listening/studio",
  "/reading/dossier",
  "/reading/passages",
  "/reading/questions",
  "/reading-lab",
  "/resource-library",
  "/review",
  "/settings",
];

export default function LearningCheckPage() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/app-health", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<HealthPayload>;
      })
      .then(setHealth)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const routes = health?.routes?.length ? health.routes : fallbackRoutes;

  return (
    <AppShell>
      <section className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-indigo-200">Learning Flow Check</p>
        <h1 className="mt-3 text-3xl font-black">项目功能自检</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
          这个页面用于快速确认词汇、听写、阅读、情景阅读和 Mission Engine 是否都有可用数据。没有私有资源时，系统会自动使用 sample fallback，保证完整学习流程可以跑通。
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className={`rounded-3xl p-5 ${health?.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
          <div className="text-3xl font-black">{health ? (health.ok ? "OK" : "Check") : error ? "Error" : "Loading"}</div>
          <div className="mt-1 text-sm font-bold">整体状态</div>
          {error ? <p className="mt-2 text-xs font-bold">{error}</p> : null}
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="text-3xl font-black text-slate-950">{health?.checks?.length ?? 0}</div>
          <div className="mt-1 text-sm font-bold text-slate-500">检查项</div>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="text-3xl font-black text-slate-950">{routes.length}</div>
          <div className="mt-1 text-sm font-bold text-slate-500">功能页面</div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-black text-slate-950">数据检查</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(health?.checks ?? []).map((check) => (
            <div key={check.key} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-slate-950">{check.label}</div>
                  {check.error ? <div className="mt-1 text-xs font-bold text-rose-600">{check.error}</div> : null}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${check.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {check.ok ? "ready" : "failed"}
                </span>
              </div>
              <div className="mt-3 text-2xl font-black text-slate-950">{check.count ?? 0}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-black text-slate-950">功能入口</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {routes.map((route) => (
            <Link
              key={route}
              href={route}
              className="rounded-2xl border border-slate-100 p-4 text-sm font-black text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
            >
              {route}
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
