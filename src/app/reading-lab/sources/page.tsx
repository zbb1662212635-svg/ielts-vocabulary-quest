"use client";

import { useEffect, useState } from "react";
import sources from "@/data/reading-sources.sample.json";
import { AppShell } from "@/components/layout/AppShell";
import { getReadingSourceConsent, saveReadingSourceConsent } from "@/lib/readingStorage";
import { DEFAULT_SETTINGS, getAppSettings, saveAppSettings } from "@/lib/settings";
import type { AppSettings, ReadingSource } from "@/lib/types";

export default function ReadingSourcesPage() {
  const source = (sources as ReadingSource[])[0];
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setSettings(getAppSettings());
      setConsent(getReadingSourceConsent(source.id));
    });
  }, [source.id]);

  function updateCrawlerEnabled(enabled: boolean) {
    const next = {
      ...settings,
      readingSources: {
        ...settings.readingSources,
        enableGithubCrawler: enabled,
        selectedSources: enabled ? [source.id] : settings.readingSources.selectedSources,
      },
    };
    setSettings(next);
    saveAppSettings(next);
  }

  function updateConsent(value: boolean) {
    setConsent(value);
    saveReadingSourceConsent(source.id, value);
  }

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Scenario Reading Sources</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">情景阅读来源配置</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          外部阅读材料只用于个人学习的真实语境扩展。系统会记录来源信息，不绕过登录、付费墙或 DRM。
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">{source.type}</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{source.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{source.baseUrl}</p>
          </div>
          <div className={`rounded-2xl px-4 py-2 text-sm font-black ${settings.readingSources.enableGithubCrawler ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {settings.readingSources.enableGithubCrawler ? "enabled" : "disabled"}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <InfoBlock label="Allowed paths" value={source.allowedPaths.join(", ")} />
          <InfoBlock label="Allowed extensions" value={source.allowedExtensions.join(", ")} />
          <InfoBlock label="Scenario output" value="context, expressions, sentences, prompts" />
        </div>

        <label className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <input type="checkbox" checked={consent} onChange={(event) => updateConsent(event.target.checked)} className="mt-1" />
          <span>I confirm I have the right to import and use this source for my personal study.</span>
        </label>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            disabled={!consent}
            onClick={() => updateCrawlerEnabled(true)}
            className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:bg-slate-300"
          >
            Enable Source
          </button>
          <button
            onClick={() => updateCrawlerEnabled(false)}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700"
          >
            Disable Source
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-slate-950">本地导入命令</h2>
        <pre className="mt-4 overflow-auto rounded-2xl bg-slate-950 p-4 text-sm font-semibold text-slate-100">
{`npm run import:scenario-reading
npm run import:scenario-reading -- --input "C:/Users/zhangbinbin/Desktop/学英语/foreign-reading"`}
        </pre>
      </section>
    </AppShell>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-bold leading-6 text-slate-900">{value}</div>
    </div>
  );
}
