"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  getSavedExpressions,
  getSavedScenarioSentences,
  getSavedScenarioWords,
  getScenarioTakeaways,
} from "@/lib/scenarioReadingStorage";

export default function ScenarioReadingReviewPage() {
  const savedWords = typeof window === "undefined" ? [] : getSavedScenarioWords();
  const expressions = typeof window === "undefined" ? [] : getSavedExpressions();
  const sentences = typeof window === "undefined" ? [] : getSavedScenarioSentences();
  const takeaways = typeof window === "undefined" ? [] : getScenarioTakeaways();

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Scenario Reading Review</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">情景阅读沉淀</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          这里复盘你从真实语境中保存的词、表达、长难句和 takeaway。它不是错题本，而是语言资产库。
        </p>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Stat label="保存词汇" value={savedWords.length} />
        <Stat label="保存表达" value={expressions.length} />
        <Stat label="长难句" value={sentences.length} />
        <Stat label="Takeaway" value={takeaways.length} />
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Saved Vocabulary">
          {savedWords.length ? (
            savedWords.slice(0, 20).map((word) => (
              <Item key={word.id} title={word.word} subtitle={word.chineseMeaning ?? "Scenario word"} text={word.sourceSentence} />
            ))
          ) : (
            <Empty text="还没有保存情景词汇。" />
          )}
        </Panel>

        <Panel title="Useful Expressions">
          {expressions.length ? (
            expressions.slice(0, 20).map((expression) => (
              <Item
                key={expression.id}
                title={expression.expression}
                subtitle={expression.chineseMeaning ?? expression.usageNote ?? "Useful expression"}
                text={expression.sourceSentence}
              />
            ))
          ) : (
            <Empty text="还没有保存可积累表达。" />
          )}
        </Panel>

        <Panel title="Difficult Sentences">
          {sentences.length ? (
            sentences.slice(0, 12).map((sentence) => (
              <Item key={sentence.id} title={sentence.sentence} subtitle={sentence.structureNote} text={sentence.chineseExplanation ?? ""} />
            ))
          ) : (
            <Empty text="还没有保存长难句。" />
          )}
        </Panel>

        <Panel title="Mission Takeaways">
          {takeaways.length ? (
            takeaways.slice(0, 12).map((takeaway) => (
              <Item key={takeaway.id} title={takeaway.text} subtitle={takeaway.createdAt.slice(0, 10)} text={takeaway.missionId ?? takeaway.articleId} />
            ))
          ) : (
            <Empty text="还没有保存 takeaway。" />
          )}
        </Panel>
      </section>

      <Link href="/reading-lab" className="mt-6 inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">
        返回情景阅读库
      </Link>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-3xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function Item({ title, subtitle, text }: { title: string; subtitle: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="font-black text-slate-950">{title}</div>
      <div className="mt-1 text-sm font-semibold text-indigo-700">{subtitle}</div>
      {text ? <div className="mt-2 text-sm leading-6 text-slate-600">{text}</div> : null}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm leading-6 text-slate-600">{text}</p>;
}
