"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { topicRouteLabels } from "@/data/ielts-missions.sample";
import { DEFAULT_SETTINGS, getAppSettings, saveAppSettings } from "@/lib/settings";
import {
  exportLearningData,
  getAttempts,
  getProgressMap,
  getReviewItems,
  importLearningData,
  type LearningDataBackup,
  resetLearningData,
  saveSelectedKnowledgeRoute,
} from "@/lib/storage";
import type { AppSettings, ErrorType, ReviewItem } from "@/lib/types";
import { useVocabulary } from "@/lib/useVocabulary";
import { analyzeVocabularyHealth } from "@/lib/vocabularyHealth";

const weakAreaOptions: { value: ErrorType; label: string }[] = [
  { value: "wrong_synonym", label: "Reading 同义替换" },
  { value: "context_misread", label: "Reading 语境误读" },
  { value: "spelling_error", label: "Listening 拼写" },
  { value: "plural_error", label: "Listening 单复数" },
  { value: "listening_not_recognized", label: "Listening 听不出来" },
  { value: "word_family_error", label: "词族识别" },
];

const magazineOptions = [
  { value: "economist", label: "Economist" },
  { value: "new_yorker", label: "New Yorker" },
  { value: "atlantic", label: "Atlantic" },
  { value: "wired", label: "Wired" },
];

const ieltsTopicOptions = [
  "science_technology",
  "art_culture",
  "environment_nature",
  "education_learning",
  "health_lifestyle",
  "work_business",
  "cities_transport",
  "media_communication",
  "history_society",
  "travel_daily_services",
] as const;

export default function SettingsPage() {
  const vocabulary = useVocabulary();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [backupStatus, setBackupStatus] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setSettings(getAppSettings());
      setReviewItems(getReviewItems());
    });
  }, []);

  const health = useMemo(
    () => analyzeVocabularyHealth(vocabulary.items, reviewItems),
    [vocabulary.items, reviewItems],
  );

  function updateSettings(next: AppSettings) {
    setSettings(next);
    saveAppSettings(next);
    const firstPreferredRoute = next.interestProfile.preferredRoutes[0];
    if (firstPreferredRoute) saveSelectedKnowledgeRoute(firstPreferredRoute);
  }

  function patchSettings<K extends keyof AppSettings>(section: K, value: Partial<AppSettings[K]>) {
    updateSettings({
      ...settings,
      [section]: {
        ...settings[section],
        ...value,
      },
    });
  }

  function toggleWeakArea(value: ErrorType) {
    const current = new Set(settings.studyGoal.weakAreas);
    if (current.has(value)) current.delete(value);
    else current.add(value);
    patchSettings("studyGoal", { weakAreas: [...current] });
  }

  function toggleRoute(routeId: string) {
    const current = new Set(settings.interestProfile.preferredRoutes);
    if (current.has(routeId)) current.delete(routeId);
    else current.add(routeId);
    const preferredRoutes = ieltsTopicOptions
      .map((route) => route)
      .filter((id) => current.has(id));
    patchSettings("interestProfile", {
      preferredRoutes: preferredRoutes.length ? preferredRoutes : [routeId],
    });
  }

  function toggleMagazine(magazine: string) {
    const current = new Set(settings.readingSources.preferredMagazines);
    const typedMagazine = magazine as AppSettings["readingSources"]["preferredMagazines"][number];
    if (current.has(typedMagazine)) current.delete(typedMagazine);
    else current.add(typedMagazine);
    patchSettings("readingSources", {
      preferredMagazines: [...current].length ? [...current] : [typedMagazine],
    });
  }

  function exportData() {
    const payload = exportLearningData(settings);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ielts-vocabulary-quest-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setBackupStatus("学习数据已导出。");
  }

  function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result)) as LearningDataBackup;
        const importedSettings = importLearningData(payload);
        if (!importedSettings) throw new Error("Invalid backup");
        saveAppSettings(importedSettings);
        setSettings(importedSettings);
        setReviewItems(getReviewItems());
        setBackupStatus("学习数据已导入。");
      } catch {
        setBackupStatus("导入失败：文件格式不正确。");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  }

  function resetProgress() {
    const confirmed = window.confirm("确定要清空学习记录、错题和任务历史吗？设置会保留。");
    if (!confirmed) return;
    resetLearningData();
    setReviewItems([]);
    setBackupStatus("学习记录已清空，设置仍然保留。");
  }

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Settings</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">个人雅思学习配置</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          这里控制每日任务量、兴趣路线、听写规则、复习压力和本地数据备份。所有设置只保存在你的浏览器本地。
        </p>
      </section>

      <div className="mt-6 grid gap-6">
        <SettingsSection title="Study Goal 学习目标" subtitle="让任务围绕你的 IELTS Listening / Reading 7.0 目标生成。">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SelectField
              label="考试类型"
              value={settings.studyGoal.examType}
              options={["Academic", "General Training"]}
              onChange={(value) => patchSettings("studyGoal", { examType: value as AppSettings["studyGoal"]["examType"] })}
            />
            <SelectField
              label="目标 Listening"
              value={settings.studyGoal.targetListeningBand}
              options={["6.5", "7.0", "7.5", "8.0"]}
              onChange={(value) => patchSettings("studyGoal", { targetListeningBand: value })}
            />
            <SelectField
              label="目标 Reading"
              value={settings.studyGoal.targetReadingBand}
              options={["6.5", "7.0", "7.5", "8.0"]}
              onChange={(value) => patchSettings("studyGoal", { targetReadingBand: value })}
            />
            <NumberField
              label="每日学习分钟"
              value={settings.studyGoal.dailyStudyMinutes}
              options={[10, 20, 25, 30, 45]}
              onChange={(value) => patchSettings("studyGoal", { dailyStudyMinutes: value })}
            />
            <SelectField
              label="当前 Listening"
              value={settings.studyGoal.currentListeningBand}
              options={["5.5", "6.0", "6.5", "7.0"]}
              onChange={(value) => patchSettings("studyGoal", { currentListeningBand: value })}
            />
            <SelectField
              label="当前 Reading"
              value={settings.studyGoal.currentReadingBand}
              options={["5.5", "6.0", "6.5", "7.0"]}
              onChange={(value) => patchSettings("studyGoal", { currentReadingBand: value })}
            />
            <label className="block lg:col-span-2">
              <span className="text-xs font-bold text-slate-500">考试日期</span>
              <input
                type="date"
                value={settings.studyGoal.examDate}
                onChange={(event) => patchSettings("studyGoal", { examDate: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300"
              />
            </label>
          </div>
          <ChipGroup
            title="主要弱项"
            items={weakAreaOptions}
            selected={settings.studyGoal.weakAreas}
            onToggle={(value) => toggleWeakArea(value as ErrorType)}
          />
        </SettingsSection>

        <SettingsSection title="Daily Mission 每日任务" subtitle="控制每天任务量，避免复习压力过大。">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <NumberField label="新词" value={settings.dailyMission.newWordsPerDay} options={[6, 10, 15, 20]} onChange={(value) => patchSettings("dailyMission", { newWordsPerDay: value })} />
            <NumberField label="同义替换题" value={settings.dailyMission.synonymBattlesPerDay} options={[5, 8, 10, 15]} onChange={(value) => patchSettings("dailyMission", { synonymBattlesPerDay: value })} />
            <NumberField label="听写题" value={settings.dailyMission.dictationItemsPerDay} options={[4, 6, 8, 12]} onChange={(value) => patchSettings("dailyMission", { dictationItemsPerDay: value })} />
            <NumberField label="复习上限" value={settings.dailyMission.reviewLimitPerDay} options={[6, 10, 12, 20]} onChange={(value) => patchSettings("dailyMission", { reviewLimitPerDay: value })} />
            <SelectField
              label="难度"
              value={settings.dailyMission.difficultyLevel}
              options={["foundation", "band7", "challenge"]}
              onChange={(value) => patchSettings("dailyMission", { difficultyLevel: value as AppSettings["dailyMission"]["difficultyLevel"] })}
            />
          </div>
        </SettingsSection>

        <SettingsSection title="IELTS Topic Profile 雅思话题路线" subtitle="让每日任务优先使用雅思高频话题，而不是宽泛学科分类。">
          <ChipGroup
            title="Preferred IELTS topic routes"
            items={ieltsTopicOptions.map((route) => ({
              value: route,
              label: `${topicRouteLabels[route].subtitle} ${topicRouteLabels[route].title}`,
            }))}
            selected={settings.interestProfile.preferredRoutes}
            onToggle={toggleRoute}
          />
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <SelectField
              label="内容难度"
              value={settings.interestProfile.contentLevel}
              options={["B1_B2", "B2_C1", "C1"]}
              onChange={(value) => patchSettings("interestProfile", { contentLevel: value as AppSettings["interestProfile"]["contentLevel"] })}
            />
            <SelectField
              label="解释语言"
              value={settings.interestProfile.explanationLanguage}
              options={["zh", "mixed", "en"]}
              onChange={(value) => patchSettings("interestProfile", { explanationLanguage: value as AppSettings["interestProfile"]["explanationLanguage"] })}
            />
            <SelectField
              label="政治内容风格"
              value={settings.interestProfile.politicalContentStyle}
              options={["conceptual", "historical", "current"]}
              onChange={(value) => patchSettings("interestProfile", { politicalContentStyle: value as AppSettings["interestProfile"]["politicalContentStyle"] })}
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Dictation Settings 听写与发音" subtitle="Listening 填空题里，拼写和单复数仍然严格判分。">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SelectField label="发音" value={settings.dictation.accent} options={["en-GB", "en-US"]} onChange={(value) => patchSettings("dictation", { accent: value as AppSettings["dictation"]["accent"] })} />
            <NumberField label="播放速度" value={settings.dictation.playbackSpeed} options={[0.8, 1, 1.2]} onChange={(value) => patchSettings("dictation", { playbackSpeed: value })} />
            <NumberField label="错几次显示提示" value={settings.dictation.showHintAfterMistakes} options={[0, 1, 2, 3]} onChange={(value) => patchSettings("dictation", { showHintAfterMistakes: value })} />
            <ToggleField label="允许重复播放" checked={settings.dictation.allowReplay} onChange={(value) => patchSettings("dictation", { allowReplay: value })} />
            <ToggleField label="严格检查单复数" checked={settings.dictation.strictPluralCheck} onChange={(value) => patchSettings("dictation", { strictPluralCheck: value })} />
            <ToggleField label="严格检查拼写" checked={settings.dictation.strictSpellingCheck} onChange={(value) => patchSettings("dictation", { strictSpellingCheck: value })} />
          </div>
        </SettingsSection>

        <SettingsSection title="Review Settings 复习压力" subtitle="控制 Review Room 的每日上限，避免错词积压造成压力。">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SelectField
              label="复习压力"
              value={settings.review.reviewPressure}
              options={["light", "balanced", "intensive"]}
              onChange={(value) => patchSettings("review", { reviewPressure: value as AppSettings["review"]["reviewPressure"] })}
            />
            <NumberField label="每日复习上限" value={settings.review.dailyReviewCap} options={[6, 10, 12, 20]} onChange={(value) => patchSettings("review", { dailyReviewCap: value })} />
            <NumberField label="高危阈值" value={settings.review.highRiskThreshold} options={[2, 3, 4]} onChange={(value) => patchSettings("review", { highRiskThreshold: value })} />
            <NumberField label="掌握度隐藏阈值" value={settings.review.masteryHideThreshold} options={[80, 85, 90, 95]} onChange={(value) => patchSettings("review", { masteryHideThreshold: value })} />
          </div>
        </SettingsSection>

        <SettingsSection title="Reading Source Settings 外刊来源" subtitle="控制外刊精读实验室、GitHub 爬虫和同步规模。">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ToggleField label="启用 Reading Lab" checked={settings.readingSources.enableReadingLab} onChange={(value) => patchSettings("readingSources", { enableReadingLab: value })} />
            <ToggleField label="启用 GitHub 爬虫" checked={settings.readingSources.enableGithubCrawler} onChange={(value) => patchSettings("readingSources", { enableGithubCrawler: value })} />
            <NumberField label="每日阅读分钟" value={settings.readingSources.dailyReadingMinutes} options={[10, 20, 30, 45]} onChange={(value) => patchSettings("readingSources", { dailyReadingMinutes: value })} />
            <NumberField label="每次同步文件数" value={settings.readingSources.maxArticlesPerSync} options={[5, 10, 20, 50]} onChange={(value) => patchSettings("readingSources", { maxArticlesPerSync: value })} />
            <NumberField label="最大文件 MB" value={settings.readingSources.maxFileSizeMB} options={[20, 50, 80, 150]} onChange={(value) => patchSettings("readingSources", { maxFileSizeMB: value })} />
            <SelectField
              label="默认阅读难度"
              value={settings.readingSources.defaultReadingLevel}
              options={["B1", "B2", "C1"]}
              onChange={(value) => patchSettings("readingSources", { defaultReadingLevel: value as AppSettings["readingSources"]["defaultReadingLevel"] })}
            />
            <ToggleField label="显示中文解释" checked={settings.readingSources.showChineseExplanation} onChange={(value) => patchSettings("readingSources", { showChineseExplanation: value })} />
            <ToggleField label="自动生成题目" checked={settings.readingSources.autoGenerateQuestions} onChange={(value) => patchSettings("readingSources", { autoGenerateQuestions: value })} />
          </div>
          <ChipGroup
            title="Preferred magazines"
            items={magazineOptions}
            selected={settings.readingSources.preferredMagazines}
            onToggle={toggleMagazine}
          />
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            GitHub source 需要在 Reading Lab Sources 页面勾选使用确认。同步默认小批量执行，不会全量抓取仓库。
          </p>
        </SettingsSection>

        <SettingsSection title="Data Health 词库健康检查" subtitle="确认私有词库哪些字段能用于具体训练。">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <HealthStat label="总词数" value={health.total} />
            <HealthStat label="新词初遇可用" value={health.wordEncounterUsable} tone="emerald" />
            <HealthStat label="同义替换可用" value={health.synonymUsable} tone="indigo" />
            <HealthStat label="听写可用" value={health.dictationUsable} tone="indigo" />
            <HealthStat label="今日复盘" value={health.reviewDue} tone="amber" />
            <HealthStat label="无效词条" value={health.invalidCount} tone="rose" />
          </div>
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            当前数据源：<span className="font-black text-indigo-700">{vocabulary.source}</span>。如果私有词库不存在，系统会自动回退到 sample 数据。Word Encounter 只需要 word + 中文释义；Synonym Arena 需要 synonyms；Dictation 需要听写风险、listening 标签或 listening_survival 来源。
          </p>
          {health.invalidReasons.length > 0 && (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-rose-50 p-4">
                <div className="text-sm font-black text-rose-900">主要无效原因</div>
                <div className="mt-3 space-y-2">
                  {health.invalidReasons.slice(0, 6).map((item) => (
                    <div key={item.reason} className="flex justify-between text-sm text-rose-900">
                      <span>{item.reason}</span>
                      <span className="font-black">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-black text-slate-950">样例无效词条</div>
                <div className="mt-3 space-y-2">
                  {health.sampleInvalidEntries.map((item) => (
                    <div key={`${item.id}_${item.word}`} className="text-sm text-slate-700">
                      <span className="font-bold">{item.word || item.id || "未知词条"}</span>：{item.reasons.join("、")}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SettingsSection>

        <SettingsSection title="Data Backup 数据备份" subtitle="localStorage 可能被浏览器清理，建议定期导出学习记录。">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={exportData} className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">
              导出学习数据
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700">
              导入学习数据
            </button>
            <button onClick={resetProgress} className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700">
              清空学习记录
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={importData} />
          <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
            <StatusCard label="已记录尝试" value={getAttempts().length} />
            <StatusCard label="进度词条" value={Object.keys(getProgressMap()).length} />
            <StatusCard label="复习队列" value={reviewItems.length} />
          </div>
          {backupStatus && <p className="mt-4 text-sm font-bold text-indigo-700">{backupStatus}</p>}
        </SettingsSection>
      </div>
    </AppShell>
  );
}

function SettingsSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <select
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-[70px] items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function ChipGroup({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="mt-5">
      <div className="text-xs font-bold text-slate-500">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => {
          const active = selected.includes(item.value);
          return (
            <button
              key={item.value}
              onClick={() => onToggle(item.value)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HealthStat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "indigo" | "amber" | "rose";
}) {
  const colors = {
    slate: "bg-slate-50 text-slate-950",
    emerald: "bg-emerald-50 text-emerald-700",
    indigo: "bg-indigo-50 text-indigo-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <div className={`rounded-2xl p-4 ${colors[tone]}`}>
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-xs font-bold">{label}</div>
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-2xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}
