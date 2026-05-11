"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, BookmarkPlus, CheckCircle2, Lightbulb } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import {
  saveExpression,
  saveScenarioSentence,
  saveScenarioTakeaway,
  saveScenarioWord,
} from "@/lib/scenarioReadingStorage";
import type { ScenarioDifficultSentence, ScenarioVocabularyItem, UsefulExpression } from "@/lib/types";
import { useScenarioReadings } from "@/lib/useScenarioReadings";

const stages = ["Preview", "Read", "Words", "Expressions", "Sentence", "Takeaway"];

export default function ScenarioReadingArticlePage() {
  const params = useParams<{ articleId: string }>();
  const scenario = useScenarioReadings();
  const article = scenario.articles.find((item) => item.id === params.articleId);
  const [stageIndex, setStageIndex] = useState(0);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [takeaway, setTakeaway] = useState("");
  const [takeawaySaved, setTakeawaySaved] = useState(false);

  if (!article) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">情景阅读加载中或未找到</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">可以返回素材库重新打开。</p>
          <Link href="/reading-lab/articles" className="mt-5 inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">
            返回情景阅读素材库
          </Link>
        </section>
      </AppShell>
    );
  }

  const activeArticle = article;

  function markSaved(id: string) {
    setSaved((current) => ({ ...current, [id]: true }));
  }

  function saveWord(word: ScenarioVocabularyItem) {
    saveScenarioWord(word);
    markSaved(word.id);
  }

  function saveExpr(expression: UsefulExpression) {
    saveExpression(expression);
    markSaved(expression.id);
  }

  function saveSentence(sentence: ScenarioDifficultSentence) {
    saveScenarioSentence(sentence);
    markSaved(sentence.id);
  }

  function saveTakeaway() {
    if (!takeaway.trim()) return;
    saveScenarioTakeaway({ articleId: activeArticle.id, text: takeaway.trim() });
    setTakeawaySaved(true);
  }

  return (
    <AppShell>
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">
          Scenario Reading · {article.level} · {article.estimatedMinutes} min
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{activeArticle.title}</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">{activeArticle.subtitle}</p>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{activeArticle.backgroundNote}</p>
      </section>

      <div className="mb-6 grid gap-2 md:grid-cols-6">
        {stages.map((stage, index) => (
          <button
            key={stage}
            onClick={() => setStageIndex(index)}
            className={`rounded-2xl px-3 py-3 text-xs font-bold ${
              index === stageIndex ? "bg-indigo-600 text-white" : index < stageIndex ? "bg-emerald-50 text-emerald-700" : "bg-white text-slate-600"
            }`}
          >
            {stage}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {stageIndex === 0 ? (
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Preview</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">真实语境预读</h2>
            <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">{article.summary}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <MiniStat label="段落" value={activeArticle.paragraphs.length} />
              <MiniStat label="情景词" value={activeArticle.keyVocabulary.length} />
              <MiniStat label="表达" value={activeArticle.usefulExpressions.length} />
              <MiniStat label="长难句" value={activeArticle.difficultSentences.length} />
            </div>
            <NextButton label="开始阅读摘录" onClick={() => setStageIndex(1)} />
          </div>
        ) : null}

        {stageIndex === 1 ? (
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Contextual Reading</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">读真实材料，不做考试题</h2>
            <div className="mt-5 space-y-4">
              {activeArticle.paragraphs.map((paragraph) => (
                <div key={paragraph.id} className="rounded-2xl bg-slate-50 p-5">
                  <div className="text-xs font-black uppercase tracking-wide text-indigo-600">
                    P{paragraph.index} · {paragraph.functionTag ?? "context"}
                  </div>
                  <p className="mt-3 text-base leading-8 text-slate-800">{paragraph.text}</p>
                  {paragraph.gist ? <p className="mt-3 text-sm font-bold text-slate-600">Gist: {paragraph.gist}</p> : null}
                </div>
              ))}
            </div>
            <NextButton label="提取情景词汇" onClick={() => setStageIndex(2)} />
          </div>
        ) : null}

        {stageIndex === 2 ? (
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Vocabulary in Context</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">从语境里保存有用词</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {activeArticle.keyVocabulary.map((word) => (
                <SaveCard
                  key={word.id}
                  title={word.word}
                  subtitle={word.chineseMeaning ?? word.englishDefinition ?? "Context word"}
                  body={word.sourceSentence}
                  saved={Boolean(saved[word.id])}
                  onSave={() => saveWord(word)}
                />
              ))}
            </div>
            <NextButton label="查看可积累表达" onClick={() => setStageIndex(3)} />
          </div>
        ) : null}

        {stageIndex === 3 ? (
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Useful Expressions</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">保存可以迁移到其他话题的表达</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {activeArticle.usefulExpressions.map((expression) => (
                <SaveCard
                  key={expression.id}
                  title={expression.expression}
                  subtitle={expression.chineseMeaning ?? expression.usageNote ?? "Reusable expression"}
                  body={expression.sourceSentence}
                  saved={Boolean(saved[expression.id])}
                  onSave={() => saveExpr(expression)}
                />
              ))}
            </div>
            <NextButton label="拆一个长难句" onClick={() => setStageIndex(4)} />
          </div>
        ) : null}

        {stageIndex === 4 ? (
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Difficult Sentence Awareness</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">长难句意识</h2>
            <div className="mt-5 space-y-4">
              {activeArticle.difficultSentences.map((sentence) => (
                <div key={sentence.id} className="rounded-2xl bg-indigo-50 p-5">
                  <p className="text-base font-bold leading-8 text-slate-950">{sentence.sentence}</p>
                  <p className="mt-3 text-sm leading-6 text-indigo-900">{sentence.structureNote}</p>
                  {sentence.chineseExplanation ? <p className="mt-2 text-sm leading-6 text-slate-700">{sentence.chineseExplanation}</p> : null}
                  <button
                    onClick={() => saveSentence(sentence)}
                    className="mt-4 rounded-2xl bg-white px-4 py-2 text-sm font-black text-indigo-700"
                  >
                    {saved[sentence.id] ? "已保存" : "保存长难句"}
                  </button>
                </div>
              ))}
            </div>
            <NextButton label="写下本次 takeaway" onClick={() => setStageIndex(5)} />
          </div>
        ) : null}

        {stageIndex === 5 ? (
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Takeaway</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">这段真实材料给今天任务补充了什么？</h2>
            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <Lightbulb size={18} className="text-indigo-600" />
                Reflection prompts
              </div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                {activeArticle.readingPrompts.map((prompt) => (
                  <p key={prompt.id}>· {prompt.prompt}</p>
                ))}
              </div>
            </div>
            <textarea
              value={takeaway}
              onChange={(event) => setTakeaway(event.target.value)}
              className="mt-5 min-h-32 w-full rounded-2xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-indigo-300"
              placeholder="写 1-2 句：你从这段真实语境里学到了什么？"
            />
            <button
              onClick={saveTakeaway}
              disabled={!takeaway.trim() || takeawaySaved}
              className="mt-4 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:bg-slate-300"
            >
              {takeawaySaved ? "Takeaway 已保存" : "保存 Takeaway"}
            </button>
            <Link href="/reading-lab/review" className="ml-3 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">
              查看表达复盘
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

function SaveCard({
  title,
  subtitle,
  body,
  saved,
  onSave,
}: {
  title: string;
  subtitle: string;
  body: string;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">{subtitle}</p>
        </div>
        <button onClick={onSave} className="rounded-xl bg-indigo-50 p-2 text-indigo-700" title="保存">
          {saved ? <CheckCircle2 size={18} /> : <BookmarkPlus size={18} />}
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

function NextButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-6 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">
      {label}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-2xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}
