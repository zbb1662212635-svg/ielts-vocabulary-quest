"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, FolderSearch } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { ResourceHealth } from "@/lib/resourceTypes";

type VocabularyImportHealth = {
  imported: boolean;
  totalVocabularyItems: number;
  usableForLoadout: number;
  usableForMeaningQuiz: number;
  usableForDictation: number;
  usableForSynonymArena: number;
  needsReviewCount: number;
  duplicateCount: number;
  lastImportedAt: string | null;
  report?: { parsedFiles?: number; unsupportedFiles?: unknown[] } | null;
};

type ListeningImportHealth = {
  imported: boolean;
  audioTracks: number;
  transcripts: number;
  matchedPairs: number;
  unmatchedAudio: number;
  unmatchedTranscripts: number;
  dictationItems: number;
  needsReview: number;
  lastImportedAt: string | null;
  report?: { warnings?: string[] } | null;
};

type ReadingImportHealth = {
  imported: boolean;
  passages: number;
  questions: number;
  readyQuestions: number;
  questionsWithAnswers: number;
  questionsWithEvidence: number;
  questionsNeedingReview: number;
  needsReview: number;
  lastImportedAt: string | null;
  report?: { readingFilesDetected?: number; answerKeyFilesDetected?: number; unsupportedFiles?: unknown[]; warnings?: string[] } | null;
};

type ScenarioReadingHealth = {
  imported: boolean;
  articles: number;
  readyArticles: number;
  articlesNeedingReview: number;
  keyVocabulary: number;
  usefulExpressions: number;
  difficultSentences: number;
  scenarioPrompts: number;
  needsReview: number;
  lastImportedAt: string | null;
  report?: { foreignReadingFilesDetected?: number; unsupportedFiles?: unknown[]; warnings?: string[] } | null;
};

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
  const [vocabHealth, setVocabHealth] = useState<VocabularyImportHealth | null>(null);
  const [listeningHealth, setListeningHealth] = useState<ListeningImportHealth | null>(null);
  const [readingHealth, setReadingHealth] = useState<ReadingImportHealth | null>(null);
  const [scenarioHealth, setScenarioHealth] = useState<ScenarioReadingHealth | null>(null);

  useEffect(() => {
    fetch("/api/resource-health")
      .then((response) => response.json())
      .then((data: ResourceHealth) => setHealth(data))
      .catch(() =>
        setHealth({
          resourceRoot: "C:/Users/zhangbinbin/Desktop/学英语",
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
    fetch("/api/vocabulary-import-health").then((r) => r.json()).then(setVocabHealth).catch(() => setVocabHealth(null));
    fetch("/api/listening-health").then((r) => r.json()).then(setListeningHealth).catch(() => setListeningHealth(null));
    fetch("/api/reading-health").then((r) => r.json()).then(setReadingHealth).catch(() => setReadingHealth(null));
    fetch("/api/scenario-reading-health").then((r) => r.json()).then(setScenarioHealth).catch(() => setScenarioHealth(null));
  }, []);

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Resource Library Health</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">本地学习资源健康检查</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          这里显示外部资源目录的扫描、导入和可用性状态。原始资料和生成的私有索引都不会提交到 GitHub。
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

      {health ? (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {expectedFolders.map((folder) => {
            const detected = health.detectedExpectedFolders.includes(folder);
            return (
              <div key={folder} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <FolderSearch className="text-indigo-600" size={22} />
                  {detected ? <CheckCircle2 className="text-emerald-600" size={20} /> : <AlertTriangle className="text-amber-600" size={20} />}
                </div>
                <h2 className="mt-4 text-base font-black text-slate-950">{folder}</h2>
                <p className="mt-2 text-xs font-bold text-slate-500">{detected ? "detected" : "missing"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{health.byFolder[folder] ?? 0} files</p>
              </div>
            );
          })}
        </section>
      ) : null}

      <VocabularyHealthSection health={vocabHealth} resourceHealth={health} />
      <ListeningHealthSection health={listeningHealth} />
      <ReadingHealthSection health={readingHealth} resourceHealth={health} />
      <ScenarioReadingHealthSection health={scenarioHealth} resourceHealth={health} />
    </AppShell>
  );
}

function VocabularyHealthSection({ health, resourceHealth }: { health: VocabularyImportHealth | null; resourceHealth: ResourceHealth | null }) {
  return (
    <HealthSection title="词汇导入健康状态" eyebrow="Vocabulary Import Health">
      {!health ? (
        <p className="text-sm text-slate-600">正在读取词汇导入报告...</p>
      ) : !health.imported ? (
        <Warning>Private vocabulary has not been imported yet. Run npm run import:vocabulary.</Warning>
      ) : (
        <StatsGrid>
          <Stat label="词汇资源文件" value={String(resourceHealth?.byType.ielts_vocabulary ?? 0)} />
          <Stat label="已解析文件" value={String(health.report?.parsedFiles ?? 0)} />
          <Stat label="不支持文件" value={String(health.report?.unsupportedFiles?.length ?? 0)} />
          <Stat label="词条总数" value={String(health.totalVocabularyItems)} />
          <Stat label="任务词汇可用" value={String(health.usableForLoadout)} />
          <Stat label="释义题可用" value={String(health.usableForMeaningQuiz)} />
          <Stat label="听写可用" value={String(health.usableForDictation)} />
          <Stat label="同义替换可用" value={String(health.usableForSynonymArena)} />
          <Stat label="需复查" value={String(health.needsReviewCount)} />
          <Stat label="已合并重复" value={String(health.duplicateCount)} />
        </StatsGrid>
      )}
      {health?.lastImportedAt ? <p className="mt-4 text-sm text-slate-500">最后导入：{health.lastImportedAt}</p> : null}
    </HealthSection>
  );
}

function ListeningHealthSection({ health }: { health: ListeningImportHealth | null }) {
  return (
    <HealthSection title="听力资源导入状态" eyebrow="Audio Import Health">
      {!health ? (
        <p className="text-sm text-slate-600">正在读取音频导入报告...</p>
      ) : !health.imported ? (
        <Warning>Audio has not been imported yet. Run npm run import:audio.</Warning>
      ) : (
        <>
          <StatsGrid>
            <Stat label="音频文件" value={String(health.audioTracks)} />
            <Stat label="Transcript 文件" value={String(health.transcripts)} />
            <Stat label="已匹配音频" value={String(health.matchedPairs)} />
            <Stat label="未匹配音频" value={String(health.unmatchedAudio)} />
            <Stat label="未匹配 Transcript" value={String(health.unmatchedTranscripts)} />
            <Stat label="听写题" value={String(health.dictationItems)} />
            <Stat label="需复查" value={String(health.needsReview)} />
          </StatsGrid>
          {health.report?.warnings?.length ? <Warning>{health.report.warnings[0]}</Warning> : null}
        </>
      )}
      {health?.lastImportedAt ? <p className="mt-4 text-sm text-slate-500">最后导入：{health.lastImportedAt}</p> : null}
    </HealthSection>
  );
}

function ReadingHealthSection({ health, resourceHealth }: { health: ReadingImportHealth | null; resourceHealth: ResourceHealth | null }) {
  const questionsWithoutAnswers = Math.max(0, (health?.questions ?? 0) - (health?.questionsWithAnswers ?? 0));
  return (
    <HealthSection title="阅读真题导入状态" eyebrow="Reading Import Health">
      {!health ? (
        <p className="text-sm text-slate-600">正在读取阅读导入报告...</p>
      ) : !health.imported ? (
        <Warning>Reading resources have not been imported yet. Run npm run import:reading.</Warning>
      ) : (
        <>
          <StatsGrid>
            <Stat label="阅读资源文件" value={String(resourceHealth?.byType.ielts_past_paper ?? 0)} />
            <Stat label="已检测阅读文件" value={String(health.report?.readingFilesDetected ?? 0)} />
            <Stat label="不支持文件" value={String(health.report?.unsupportedFiles?.length ?? 0)} />
            <Stat label="文章数" value={String(health.passages)} />
            <Stat label="题目数" value={String(health.questions)} />
            <Stat label="答案文件" value={String(health.report?.answerKeyFilesDetected ?? 0)} />
            <Stat label="有答案题目" value={String(health.questionsWithAnswers)} />
            <Stat label="无答案题目" value={String(questionsWithoutAnswers)} />
            <Stat label="有证据题目" value={String(health.questionsWithEvidence)} />
            <Stat label="可判分题目" value={String(health.readyQuestions)} />
            <Stat label="题目需复查" value={String(health.questionsNeedingReview)} />
            <Stat label="导入需复查" value={String(health.needsReview)} />
          </StatsGrid>
          {health.questionsWithAnswers === 0 ? <Warning>Passages imported, but question checking is limited without answer keys.</Warning> : null}
          {health.report?.warnings?.length ? <Warning>{health.report.warnings[0]}</Warning> : null}
        </>
      )}
      {health?.lastImportedAt ? <p className="mt-4 text-sm text-slate-500">最后导入：{health.lastImportedAt}</p> : null}
    </HealthSection>
  );
}

function ScenarioReadingHealthSection({ health, resourceHealth }: { health: ScenarioReadingHealth | null; resourceHealth: ResourceHealth | null }) {
  return (
    <HealthSection title="情景阅读导入状态" eyebrow="Scenario Reading Import Health">
      {!health ? (
        <p className="text-sm text-slate-600">正在读取情景阅读导入报告...</p>
      ) : !health.imported ? (
        <Warning>Scenario reading has not been imported yet. Run npm run import:scenario-reading.</Warning>
      ) : (
        <>
          <StatsGrid>
            <Stat label="外刊/阅读资源文件" value={String((resourceHealth?.byType.foreign_magazine ?? 0) + (resourceHealth?.byType.user_note ?? 0))} />
            <Stat label="已检测文件" value={String(health.report?.foreignReadingFilesDetected ?? 0)} />
            <Stat label="不支持文件" value={String(health.report?.unsupportedFiles?.length ?? 0)} />
            <Stat label="情景文章" value={String(health.articles)} />
            <Stat label="可用文章" value={String(health.readyArticles)} />
            <Stat label="需复查文章" value={String(health.articlesNeedingReview)} />
            <Stat label="情景词汇" value={String(health.keyVocabulary)} />
            <Stat label="可积累表达" value={String(health.usefulExpressions)} />
            <Stat label="长难句" value={String(health.difficultSentences)} />
            <Stat label="反思提示" value={String(health.scenarioPrompts)} />
            <Stat label="导入需复查" value={String(health.needsReview)} />
          </StatsGrid>
          {health.report?.warnings?.length ? <Warning>{health.report.warnings[0]}</Warning> : null}
        </>
      )}
      {health?.lastImportedAt ? <p className="mt-4 text-sm text-slate-500">最后导入：{health.lastImportedAt}</p> : null}
    </HealthSection>
  );
}

function HealthSection({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatsGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">{children}</div>;
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

function Warning({ children }: { children: ReactNode }) {
  return <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800">{children}</p>;
}
