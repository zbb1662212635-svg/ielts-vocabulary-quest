"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, BookmarkPlus, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { isAnswerCorrect } from "@/lib/normalizer";
import { getReadingCoachFeedback, readingErrorType } from "@/lib/readingCoach";
import { saveReadingProgress, saveReadingWord } from "@/lib/readingStorage";
import { applyAttempt } from "@/lib/scoring";
import { getProgressMap, saveAttempt, saveProgressMap, upsertReviewItem } from "@/lib/storage";
import type { ErrorType, ReadingArticle, ReadingQuestion, TrainingAttempt } from "@/lib/types";
import { useReadings } from "@/lib/useReadings";

const stages = ["预读", "关键词", "段落阅读", "题目训练", "长难句", "总结"];

export default function ReadingArticlePage() {
  const params = useParams<{ articleId: string }>();
  const readings = useReadings();
  const article = readings.articles.find((item) => item.id === params.articleId);
  const [stageIndex, setStageIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [savedWords, setSavedWords] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState(false);

  const activeArticle = article as ReadingArticle | undefined;
  const results = useMemo(() => {
    if (!activeArticle) return [];
    return activeArticle.questions.map((question) => ({
      question,
      answer: answers[question.id] ?? "",
      isCorrect: submitted[question.id] ? isAnswerCorrect(answers[question.id] ?? "", question.correctAnswer) : false,
    }));
  }, [activeArticle, answers, submitted]);

  if (!activeArticle) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">文章加载中或未找到</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            如果刚切换到私有外刊库，请稍等页面完成加载。也可以返回文章库重新打开。
          </p>
          <Link href="/reading-lab/articles" className="mt-5 inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">
            返回文章库
          </Link>
        </section>
      </AppShell>
    );
  }

  function submitQuestion(question: ReadingQuestion) {
    const answer = answers[question.id] ?? "";
    if (!answer || submitted[question.id] || !activeArticle) return;
    const isCorrect = isAnswerCorrect(answer, question.correctAnswer);
    const errorType = isCorrect ? undefined : (readingErrorType(question) as ErrorType);
    const createdAt = new Date().toISOString();
    const attempt: TrainingAttempt = {
      id: `reading_${createdAt}_${question.id}`,
      wordId: `reading_${activeArticle.id}_${question.id}`,
      mode: "reading_lab",
      prompt: question.prompt,
      userAnswer: answer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      errorType,
      createdAt,
    };
    const progress = getProgressMap();
    progress[attempt.wordId] = applyAttempt(progress[attempt.wordId], attempt, errorType);
    saveProgressMap(progress);
    saveAttempt(attempt);
    if (errorType) upsertReviewItem(attempt.wordId, errorType);
    setSubmitted((current) => ({ ...current, [question.id]: true }));
  }

  function completeArticle() {
    if (!activeArticle) return;
    const wrong = results.filter((result) => submitted[result.question.id] && !result.isCorrect).map((result) => result.question);
    saveReadingProgress(activeArticle, wrong);
    setCompleted(true);
    setStageIndex(5);
  }

  return (
    <AppShell>
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">
          {activeArticle.publication} · {activeArticle.level} · {activeArticle.estimatedMinutes} min
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{activeArticle.title}</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">{activeArticle.subtitle}</p>
      </section>

      <div className="mb-6 grid gap-2 md:grid-cols-6">
        {stages.map((stage, index) => (
          <button
            key={stage}
            onClick={() => setStageIndex(index)}
            className={`rounded-2xl px-3 py-3 text-xs font-bold ${
              index === stageIndex
                ? "bg-indigo-600 text-white"
                : index < stageIndex
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-white text-slate-600"
            }`}
          >
            {stage}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {stageIndex === 0 && (
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Preview</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">预读背景</h2>
            <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">{activeArticle.summary}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <MiniStat label="段落" value={activeArticle.paragraphs.length} />
              <MiniStat label="关键词" value={activeArticle.keyVocabulary.length} />
              <MiniStat label="题目" value={activeArticle.questions.length} />
              <MiniStat label="长难句" value={activeArticle.difficultSentences.length} />
            </div>
            <NextButton label="进入关键词" onClick={() => setStageIndex(1)} />
          </div>
        )}

        {stageIndex === 1 && (
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Key Vocabulary</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">外刊关键词</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {activeArticle.keyVocabulary.map((word) => (
                <div key={word.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">{word.word}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{word.chineseMeaning}</p>
                    </div>
                    <button
                      onClick={() => {
                        saveReadingWord(word);
                        setSavedWords((current) => ({ ...current, [word.id]: true }));
                      }}
                      className="rounded-xl bg-indigo-50 p-2 text-indigo-700"
                      title="保存到外刊生词"
                    >
                      {savedWords[word.id] ? <CheckCircle2 size={18} /> : <BookmarkPlus size={18} />}
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{word.sourceSentence}</p>
                  <p className="mt-2 text-xs font-bold text-indigo-700">Synonyms: {word.synonyms.join(" / ")}</p>
                </div>
              ))}
            </div>
            <NextButton label="进入段落阅读" onClick={() => setStageIndex(2)} />
          </div>
        )}

        {stageIndex === 2 && (
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Paragraph Reading</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">段落主旨与功能</h2>
            <div className="mt-5 space-y-4">
              {activeArticle.paragraphs.map((paragraph) => (
                <div key={paragraph.id} className="rounded-2xl bg-slate-50 p-5">
                  <div className="text-xs font-black uppercase tracking-wide text-indigo-600">
                    P{paragraph.index} · {paragraph.functionTag}
                  </div>
                  <p className="mt-3 text-base leading-8 text-slate-800">{paragraph.text}</p>
                  <p className="mt-3 text-sm font-bold text-slate-600">主旨：{paragraph.mainIdea}</p>
                </div>
              ))}
            </div>
            <NextButton label="开始题目训练" onClick={() => setStageIndex(3)} />
          </div>
        )}

        {stageIndex === 3 && (
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">IELTS-style Questions</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">题目训练</h2>
            <div className="mt-5 space-y-4">
              {activeArticle.questions.map((question) => {
                const didSubmit = submitted[question.id];
                const answer = answers[question.id] ?? "";
                const isCorrect = didSubmit && isAnswerCorrect(answer, question.correctAnswer);
                return (
                  <div key={question.id} className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{question.type}</Badge>
                      <Badge>difficulty {question.difficulty}</Badge>
                    </div>
                    <h3 className="mt-3 text-base font-black text-slate-950">{question.prompt}</h3>
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {(question.options ?? []).map((option) => (
                        <button
                          key={option}
                          onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold ${
                            answer === option
                              ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                              : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => submitQuestion(question)}
                      disabled={!answer || didSubmit}
                      className="mt-4 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
                    >
                      提交
                    </button>
                    {didSubmit && (
                      <div className={`mt-4 rounded-2xl p-4 text-sm leading-6 ${isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
                        <div className="font-black">{isCorrect ? "Correct" : `Correct answer: ${question.correctAnswer}`}</div>
                        <p className="mt-1">{getReadingCoachFeedback(question, isCorrect)}</p>
                        <p className="mt-2 font-semibold">Evidence: {question.evidenceText}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <NextButton label="查看长难句" onClick={() => setStageIndex(4)} />
          </div>
        )}

        {stageIndex === 4 && (
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Difficult Sentences</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">长难句拆解</h2>
            <div className="mt-5 space-y-4">
              {activeArticle.difficultSentences.map((sentence) => (
                <div key={sentence.id} className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-base font-bold leading-8 text-slate-950">{sentence.sentence}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">结构：{sentence.structureNote}</p>
                  <p className="mt-2 text-sm leading-6 text-indigo-950">中文：{sentence.chineseExplanation}</p>
                </div>
              ))}
            </div>
            <button onClick={completeArticle} className="mt-6 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">
              完成阅读并生成总结
            </button>
          </div>
        )}

        {stageIndex === 5 && (
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-600">Summary</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{completed ? "阅读完成" : "阅读总结"}</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <MiniStat label="题目总数" value={activeArticle.questions.length} />
              <MiniStat label="已提交" value={Object.keys(submitted).length} />
              <MiniStat label="已保存生词" value={Object.keys(savedWords).length} />
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-600">
              错题已按主旨、同义替换、TFNG 或作者态度错误进入 Review Room。保存的生词会留在 Reading Lab Review，用于后续加入词汇训练。
            </p>
            <Link href="/reading-lab/review" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">
              查看阅读复盘
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>
    </AppShell>
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

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{children}</span>;
}
