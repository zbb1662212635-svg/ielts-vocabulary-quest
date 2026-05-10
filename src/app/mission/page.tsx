"use client";

import type { ReactNode } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  ClipboardList,
  FileText,
  Headphones,
  PackageCheck,
  Radio,
  Target,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getTodayIELTSMission, topicRouteLabels } from "@/data/ielts-missions.sample";
import { detectDictationError, isAnswerCorrect } from "@/lib/normalizer";
import { getReadingCoachFeedback, readingErrorType } from "@/lib/readingCoach";
import { applyAttempt } from "@/lib/scoring";
import { getProgressMap, saveAttempt, saveProgressMap, upsertReviewItem } from "@/lib/storage";
import type { ErrorType, IELTSMission, MissionStage, ReadingQuestion, TrainingAttempt } from "@/lib/types";

const CURRENT_MISSION_ID_KEY = "ielts-mission-lab:currentMissionId";
const CURRENT_STAGE_KEY = "ielts-mission-lab:currentMissionStage";
const COMPLETED_STAGES_KEY = "ielts-mission-lab:completedMissionStages";

const stageMeta: Record<MissionStage, { label: string; sublabel: string; icon: LucideIcon }> = {
  mission_brief: { label: "任务简报", sublabel: "进入场景", icon: Target },
  vocabulary_loadout: { label: "词汇装备", sublabel: "任务关键词", icon: PackageCheck },
  listening_scene: { label: "听力场景", sublabel: "听写关键信息", icon: Headphones },
  reading_task: { label: "阅读任务", sublabel: "用证据答题", icon: BookOpenCheck },
  foreign_press_extension: { label: "外刊拓展", sublabel: "长难句和观点", icon: FileText },
  debrief: { label: "任务复盘", sublabel: "错因进入复习", icon: ClipboardList },
};

const fallbackMission: IELTSMission = {
  id: "fallback_mission",
  title: "Sample IELTS Mission",
  topicRoute: "travel_daily_services",
  role: "New international student",
  scenario: "You need to understand a short accommodation notice and complete a simple IELTS-style task.",
  taskGoal: "Use the sample mission to confirm the learning flow is working.",
  level: "B1",
  estimatedMinutes: 15,
  targetSkills: ["vocabulary", "dictation", "detail_location"],
  vocabularyIds: ["accommodation"],
  dictationItemIds: ["accommodation"],
  readingArticleId: "fallback_reading",
  foreignPressArticleId: "fallback_press",
  stages: ["mission_brief", "vocabulary_loadout", "listening_scene", "reading_task", "foreign_press_extension", "debrief"],
  vocabularyLoadout: [
    {
      id: "fallback_vocab_accommodation",
      word: "accommodation",
      chineseMeaning: "住宿；住处",
      englishDefinition: "a place where someone lives or stays",
      exampleSentence: "Students need to apply for accommodation before the deadline.",
      synonyms: ["housing"],
      collocations: ["student accommodation"],
      ieltsUsageNote: "Listening Part 1 高频拼写词，注意双 c、双 m。",
      listeningRisk: "Double c and double m.",
    },
  ],
  listeningScene: {
    title: "Accommodation call",
    briefing: "Listen and type the keyword you hear.",
    items: [{ id: "fallback_listen_accommodation", prompt: "住宿关键词", answer: "accommodation", contextNote: "高危拼写词。" }],
  },
  readingTask: {
    id: "fallback_reading",
    title: "Accommodation Notice",
    text: "Students must submit their accommodation application before 31 July. A refundable deposit is required after a room has been accepted.",
    questions: [
      {
        id: "fallback_q1",
        articleId: "fallback_reading",
        type: "detail_location",
        prompt: "When must students submit the application?",
        options: ["Before 31 July", "After a room is accepted", "At the end of the contract", "After 10 p.m."],
        correctAnswer: "Before 31 July",
        explanation: "The date is stated directly in the first sentence.",
        evidenceText: "Students must submit their accommodation application before 31 July.",
        skillTags: ["detail location"],
        difficulty: 1,
      },
    ],
  },
  foreignPressExtension: {
    title: "Student housing pressure",
    articleId: "fallback_press",
    excerpt: "Student housing often becomes difficult when demand rises faster than the supply of affordable rooms.",
    difficultSentence: {
      id: "fallback_sentence",
      articleId: "fallback_press",
      paragraphId: "fallback_p1",
      sentence: "Student housing often becomes difficult when demand rises faster than the supply of affordable rooms.",
      structureNote: "when 引导时间/条件状语，说明住房变难的原因。",
      chineseExplanation: "当需求增长快于可负担房源供给时，学生住房常常会变得紧张。",
    },
    authorViewpoint: "The writer sees student housing as a problem of demand and limited supply.",
  },
};

export default function MissionPage() {
  return (
    <Suspense fallback={<MissionFallback />}>
      <MissionExperience />
    </Suspense>
  );
}

function MissionExperience() {
  const loadedMission = getTodayIELTSMission();
  const mission = loadedMission ?? fallbackMission;
  const missionLoadFailed = !loadedMission;
  const route = topicRouteLabels[mission.topicRoute];
  const router = useRouter();
  const searchParams = useSearchParams();
  const [completedStages, setCompletedStages] = useState<MissionStage[]>(() => readCompletedStages());
  const [vocabAnswers, setVocabAnswers] = useState<Record<string, string>>({});
  const [vocabSubmitted, setVocabSubmitted] = useState<Record<string, boolean>>({});
  const [dictationAnswers, setDictationAnswers] = useState<Record<string, string>>({});
  const [dictationSubmitted, setDictationSubmitted] = useState<Record<string, boolean>>({});
  const [readingAnswers, setReadingAnswers] = useState<Record<string, string>>({});
  const [readingSubmitted, setReadingSubmitted] = useState<Record<string, boolean>>({});
  const [foreignAnswer, setForeignAnswer] = useState("");
  const [foreignSubmitted, setForeignSubmitted] = useState(false);

  const stageParam = searchParams.get("stage");
  const activeStage = getActiveStage(stageParam, mission.stages);
  const stageIndex = Math.max(0, mission.stages.indexOf(activeStage));
  const progressPercent = Math.round(((stageIndex + 1) / mission.stages.length) * 100);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedMissionId = window.localStorage.getItem(CURRENT_MISSION_ID_KEY);
    const savedStage = window.localStorage.getItem(CURRENT_STAGE_KEY);

    if (!stageParam || !isMissionStage(stageParam) || !mission.stages.includes(stageParam)) {
      const resumeStage =
        savedMissionId === mission.id && isMissionStage(savedStage) && mission.stages.includes(savedStage)
          ? savedStage
          : "mission_brief";
      router.replace(`/mission?stage=${resumeStage}`, { scroll: false });
      return;
    }

    window.localStorage.setItem(CURRENT_MISSION_ID_KEY, mission.id);
    window.localStorage.setItem(CURRENT_STAGE_KEY, activeStage);
  }, [activeStage, mission.id, mission.stages, router, stageParam]);

  const vocabResults = useMemo(
    () =>
      mission.vocabularyLoadout.map((word) => {
        const answer = vocabAnswers[word.id] ?? "";
        const correctAnswer = word.synonyms[0] ?? word.englishDefinition;
        return {
          word,
          answer,
          correctAnswer,
          submitted: Boolean(vocabSubmitted[word.id]),
          isCorrect: vocabSubmitted[word.id] ? isAnswerCorrect(answer, correctAnswer) : false,
        };
      }),
    [mission.vocabularyLoadout, vocabAnswers, vocabSubmitted],
  );

  const dictationResults = useMemo(
    () =>
      mission.listeningScene.items.map((item) => {
        const answer = dictationAnswers[item.id] ?? "";
        return {
          item,
          answer,
          submitted: Boolean(dictationSubmitted[item.id]),
          isCorrect: dictationSubmitted[item.id] ? isAnswerCorrect(answer, item.answer) : false,
        };
      }),
    [dictationAnswers, dictationSubmitted, mission.listeningScene.items],
  );

  const readingResults = useMemo(
    () =>
      mission.readingTask.questions.map((question) => {
        const answer = readingAnswers[question.id] ?? "";
        return {
          question,
          answer,
          submitted: Boolean(readingSubmitted[question.id]),
          isCorrect: readingSubmitted[question.id] ? isAnswerCorrect(answer, question.correctAnswer) : false,
        };
      }),
    [mission.readingTask.questions, readingAnswers, readingSubmitted],
  );

  const foreignCorrectAnswer = mission.foreignPressExtension.authorViewpoint;
  const foreignIsCorrect = foreignSubmitted && isAnswerCorrect(foreignAnswer, foreignCorrectAnswer);

  const vocabAccuracy = percent(countCorrect(vocabResults), countSubmitted(vocabResults));
  const dictationAccuracy = percent(countCorrect(dictationResults), countSubmitted(dictationResults));
  const readingAccuracy = percent(
    countCorrect(readingResults) + (foreignIsCorrect ? 1 : 0),
    countSubmitted(readingResults) + (foreignSubmitted ? 1 : 0),
  );
  const mistakeCount =
    countSubmitted(vocabResults) -
    countCorrect(vocabResults) +
    countSubmitted(dictationResults) -
    countCorrect(dictationResults) +
    countSubmitted(readingResults) -
    countCorrect(readingResults) +
    (foreignSubmitted && !foreignIsCorrect ? 1 : 0);

  function nextStage() {
    goToStage(Math.min(stageIndex + 1, mission.stages.length - 1));
  }

  function goToStage(index: number) {
    const stage = mission.stages[index] ?? "mission_brief";
    persistStageProgress(mission.id, activeStage, stage);
    setCompletedStages(readCompletedStages());
    router.push(`/mission?stage=${stage}`, { scroll: false });
  }

  function playWord(word: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-GB";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  function saveAttemptWithProgress(attempt: TrainingAttempt, errorType?: ErrorType) {
    const progress = getProgressMap();
    progress[attempt.wordId] = applyAttempt(progress[attempt.wordId], attempt, errorType);
    saveProgressMap(progress);
    saveAttempt(attempt);
    if (errorType) upsertReviewItem(attempt.wordId, errorType);
  }

  function submitVocabulary(wordId: string) {
    const result = vocabResults.find((item) => item.word.id === wordId);
    if (!result || result.submitted || !result.answer) return;
    const isCorrect = isAnswerCorrect(result.answer, result.correctAnswer);
    const errorType: ErrorType | undefined = isCorrect ? undefined : "wrong_synonym";
    const createdAt = new Date().toISOString();
    saveAttemptWithProgress(
      {
        id: `mission_vocab_${createdAt}_${result.word.id}`,
        wordId: `mission_${mission.id}_${result.word.word}`,
        mode: "word_encounter",
        prompt: `Choose the IELTS paraphrase for ${result.word.word}`,
        userAnswer: result.answer,
        correctAnswer: result.correctAnswer,
        isCorrect,
        errorType,
        createdAt,
      },
      errorType,
    );
    setVocabSubmitted((current) => ({ ...current, [wordId]: true }));
  }

  function submitDictation(itemId: string) {
    const item = mission.listeningScene.items.find((entry) => entry.id === itemId);
    if (!item || dictationSubmitted[item.id]) return;
    const answer = dictationAnswers[item.id] ?? "";
    if (!answer.trim()) return;
    const isCorrect = isAnswerCorrect(answer, item.answer);
    const errorType = detectDictationError(answer, item.answer);
    const createdAt = new Date().toISOString();
    saveAttemptWithProgress(
      {
        id: `mission_dictation_${createdAt}_${item.id}`,
        wordId: `mission_${mission.id}_${item.answer}`,
        mode: "dictation",
        prompt: item.prompt,
        userAnswer: answer,
        correctAnswer: item.answer,
        isCorrect,
        errorType,
        createdAt,
      },
      errorType,
    );
    setDictationSubmitted((current) => ({ ...current, [item.id]: true }));
  }

  function submitReading(question: ReadingQuestion) {
    if (readingSubmitted[question.id]) return;
    const answer = readingAnswers[question.id] ?? "";
    if (!answer.trim()) return;
    const isCorrect = isAnswerCorrect(answer, question.correctAnswer);
    const errorType = isCorrect ? undefined : (readingErrorType(question) as ErrorType);
    const createdAt = new Date().toISOString();
    saveAttemptWithProgress(
      {
        id: `mission_reading_${createdAt}_${question.id}`,
        wordId: `mission_${mission.id}_${question.id}`,
        mode: "reading_lab",
        prompt: question.prompt,
        userAnswer: answer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        errorType,
        createdAt,
      },
      errorType,
    );
    setReadingSubmitted((current) => ({ ...current, [question.id]: true }));
  }

  function submitForeignPress() {
    if (!foreignAnswer || foreignSubmitted) return;
    const isCorrect = isAnswerCorrect(foreignAnswer, foreignCorrectAnswer);
    const errorType: ErrorType | undefined = isCorrect ? undefined : "author_attitude_error";
    const createdAt = new Date().toISOString();
    saveAttemptWithProgress(
      {
        id: `mission_foreign_${createdAt}_${mission.id}`,
        wordId: `mission_${mission.id}_foreign_press`,
        mode: "reading_lab",
        prompt: "Choose the writer's viewpoint in the foreign press extension.",
        userAnswer: foreignAnswer,
        correctAnswer: foreignCorrectAnswer,
        isCorrect,
        errorType,
        createdAt,
      },
      errorType,
    );
    setForeignSubmitted(true);
  }

  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {missionLoadFailed && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            Mission data failed to load. Using sample fallback mission.
          </div>
        )}

        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">
              今日雅思场景任务 · {route.title}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{mission.title}</h1>
            <p className="mt-2 text-sm font-bold text-slate-600">
              当前阶段：{stageMeta[activeStage].label} · 你的身份：{mission.role} · {mission.estimatedMinutes} 分钟 · {mission.level}
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{mission.scenario}</p>
          </div>
          <div className="rounded-2xl bg-indigo-50 p-4 text-sm font-bold text-indigo-800">{route.subtitle}</div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>学习进度</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <button onClick={nextStage} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">
            Next Stage
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <div className="mt-6 grid gap-2 md:grid-cols-6">
        {mission.stages.map((stage, index) => {
          const Icon = stageMeta[stage].icon;
          const completed = completedStages.includes(stage);
          return (
            <button
              key={stage}
              onClick={() => goToStage(index)}
              className={`rounded-2xl border p-4 text-left text-sm font-bold ${
                stage === activeStage
                  ? "border-indigo-200 bg-indigo-600 text-white"
                  : completed
                    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <Icon size={18} />
              <div className="mt-3">{stageMeta[stage].label}</div>
              <div className="mt-1 text-xs opacity-75">{stageMeta[stage].sublabel}</div>
            </button>
          );
        })}
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {activeStage === "mission_brief" && (
          <StageSection eyebrow="Mission Brief" title="任务简报" onNext={nextStage}>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <Panel title="任务目标">{mission.taskGoal}</Panel>
              <div className="rounded-2xl bg-indigo-50 p-5">
                <div className="text-sm font-black text-indigo-950">本任务训练的 IELTS 能力</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mission.targetSkills.map((skill) => (
                    <span key={skill} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </StageSection>
        )}

        {activeStage === "vocabulary_loadout" && (
          <StageSection eyebrow="Vocabulary Loadout" title="词汇装备：用场景词完成任务准备" onNext={nextStage}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {vocabResults.map((result) => {
                const options = [result.correctAnswer, "opposite meaning", "unrelated detail"];
                return (
                  <div key={result.word.id} className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="text-xl font-black text-slate-950">{result.word.word}</h3>
                    <p className="mt-1 text-sm font-bold text-indigo-700">{result.word.chineseMeaning}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{result.word.englishDefinition}</p>
                    <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                      {result.word.exampleSentence}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{result.word.ieltsUsageNote}</p>
                    <p className="mt-4 text-sm font-bold text-slate-950">IELTS Reading 中，哪个表达可以替换它？</p>
                    <div className="mt-3 grid gap-2">
                      {options.map((option) => (
                        <button
                          key={option}
                          disabled={result.submitted}
                          onClick={() => setVocabAnswers((current) => ({ ...current, [result.word.id]: option }))}
                          className={`rounded-2xl border px-3 py-2 text-left text-sm font-bold ${
                            result.answer === option
                              ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                              : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => submitVocabulary(result.word.id)}
                      disabled={!result.answer || result.submitted}
                      className="mt-3 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
                    >
                      提交
                    </button>
                    {result.submitted && (
                      <Feedback
                        ok={result.isCorrect}
                        text={
                          result.isCorrect
                            ? "已建立同义替换反应。雅思阅读中，这会帮助你更快定位原文。"
                            : `正确替换是：${result.correctAnswer}。这类错误会进入 Review Room 复盘。`
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </StageSection>
        )}

        {activeStage === "listening_scene" && (
          <StageSection eyebrow="Listening Scene" title={mission.listeningScene.title} onNext={nextStage}>
            <p className="mb-5 text-sm leading-6 text-slate-600">{mission.listeningScene.briefing}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {dictationResults.map((result) => (
                <div key={result.item.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-slate-950">{result.item.prompt}</div>
                    <button
                      onClick={() => playWord(result.item.answer)}
                      className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
                    >
                      <Radio size={16} className="mr-1 inline" />
                      播放
                    </button>
                  </div>
                  <input
                    value={result.answer}
                    disabled={result.submitted}
                    onChange={(event) =>
                      setDictationAnswers((current) => ({ ...current, [result.item.id]: event.target.value }))
                    }
                    className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-300"
                    placeholder="输入你听到的单词"
                  />
                  <button
                    onClick={() => submitDictation(result.item.id)}
                    disabled={!result.answer || result.submitted}
                    className="mt-3 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
                  >
                    提交
                  </button>
                  {result.submitted && (
                    <Feedback
                      ok={result.isCorrect}
                      text={
                        result.isCorrect
                          ? `拼写正确。${result.item.contextNote}`
                          : `正确答案：${result.item.answer}。${result.item.contextNote} Listening 填空题中拼写错误不得分。`
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </StageSection>
        )}

        {activeStage === "reading_task" && (
          <StageSection eyebrow="Reading Task" title={mission.readingTask.title} onNext={nextStage}>
            <p className="rounded-2xl bg-slate-50 p-5 text-base leading-8 text-slate-800">{mission.readingTask.text}</p>
            <div className="mt-5 space-y-4">
              {readingResults.map((result) => (
                <div key={result.question.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="text-sm font-black text-slate-950">{result.question.prompt}</div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {(result.question.options ?? []).map((option) => (
                      <button
                        key={option}
                        disabled={result.submitted}
                        onClick={() => setReadingAnswers((current) => ({ ...current, [result.question.id]: option }))}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold ${
                          result.answer === option
                            ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => submitReading(result.question)}
                    disabled={!result.answer || result.submitted}
                    className="mt-4 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
                  >
                    提交
                  </button>
                  {result.submitted && (
                    <div
                      className={`mt-4 rounded-2xl p-4 text-sm leading-6 ${
                        result.isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"
                      }`}
                    >
                      <div className="font-black">
                        {result.isCorrect ? "答对了" : `正确答案：${result.question.correctAnswer}`}
                      </div>
                      <p className="mt-1">{getReadingCoachFeedback(result.question, result.isCorrect)}</p>
                      <p className="mt-2 font-semibold">证据句：{result.question.evidenceText}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </StageSection>
        )}

        {activeStage === "foreign_press_extension" && (
          <StageSection eyebrow="Foreign Press Extension" title={mission.foreignPressExtension.title} onNext={nextStage}>
            <p className="rounded-2xl bg-slate-50 p-5 text-base leading-8 text-slate-800">
              {mission.foreignPressExtension.excerpt}
            </p>
            <div className="mt-5 rounded-2xl bg-indigo-50 p-5">
              <div className="text-sm font-black text-indigo-950">长难句拆解</div>
              <p className="mt-2 text-base font-bold leading-7 text-slate-950">
                {mission.foreignPressExtension.difficultSentence.sentence}
              </p>
              <p className="mt-2 text-sm leading-6 text-indigo-900">
                {mission.foreignPressExtension.difficultSentence.structureNote}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {mission.foreignPressExtension.difficultSentence.chineseExplanation}
              </p>
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 p-5">
              <div className="text-sm font-black text-slate-950">作者观点更接近哪一项？</div>
              <div className="mt-3 grid gap-2">
                {[
                  foreignCorrectAnswer,
                  "The writer focuses only on entertainment.",
                  "The writer rejects the topic completely.",
                ].map((option) => (
                  <button
                    key={option}
                    disabled={foreignSubmitted}
                    onClick={() => setForeignAnswer(option)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold ${
                      foreignAnswer === option
                        ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <button
                onClick={submitForeignPress}
                disabled={!foreignAnswer || foreignSubmitted}
                className="mt-4 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
              >
                提交
              </button>
              {foreignSubmitted && (
                <Feedback
                  ok={foreignIsCorrect}
                  text={foreignIsCorrect ? "作者观点判断正确。" : `正确观点：${foreignCorrectAnswer}`}
                />
              )}
            </div>
          </StageSection>
        )}

        {activeStage === "debrief" && (
          <StageSection eyebrow="Debrief Report" title={`任务完成：${mission.title}`} onNext={nextStage} nextLabel="保持在复盘页">
            <div className="grid gap-4 md:grid-cols-4">
              <ReportStat label="词汇正确率" value={vocabAccuracy} suffix="%" />
              <ReportStat label="听写正确率" value={dictationAccuracy} suffix="%" />
              <ReportStat label="阅读正确率" value={readingAccuracy} suffix="%" />
              <ReportStat label="新增错因" value={mistakeCount} />
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">
              <div className="font-black text-slate-950">下一步</div>
              <p className="mt-1">
                系统已经把本任务中的错词、听写错误、阅读错因写入 Review Room。下次学习时，先复盘这些项目，再进入新的 IELTS 场景任务。
              </p>
            </div>
            <Link href="/review" className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">
              查看 Review Room
            </Link>
          </StageSection>
        )}
      </section>
    </AppShell>
  );
}

function MissionFallback() {
  return (
    <AppShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-bold text-indigo-600">正在加载今日任务...</p>
      </section>
    </AppShell>
  );
}

function StageSection({
  eyebrow,
  title,
  children,
  onNext,
  nextLabel = "Next Stage",
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
      <button onClick={onNext} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">
        {nextLabel}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="text-sm font-black text-slate-950">{title}</div>
      <p className="mt-2 text-sm leading-7 text-slate-700">{children}</p>
    </div>
  );
}

function Feedback({ ok, text }: { ok: boolean; text: string }) {
  return <p className={`mt-3 rounded-2xl p-3 text-sm font-bold ${ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{text}</p>;
}

function ReportStat({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="text-3xl font-black text-slate-950">
        {value}
        {suffix}
      </div>
      <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
    </div>
  );
}

function getActiveStage(value: string | null, stages: MissionStage[]): MissionStage {
  if (isMissionStage(value) && stages.includes(value)) return value;
  return "mission_brief";
}

function isMissionStage(value: string | null): value is MissionStage {
  return (
    value === "mission_brief" ||
    value === "vocabulary_loadout" ||
    value === "listening_scene" ||
    value === "reading_task" ||
    value === "foreign_press_extension" ||
    value === "debrief"
  );
}

function persistStageProgress(missionId: string, completedStage: MissionStage, nextStage: MissionStage) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CURRENT_MISSION_ID_KEY, missionId);
  window.localStorage.setItem(CURRENT_STAGE_KEY, nextStage);
  const completed = new Set(readCompletedStages());
  completed.add(completedStage);
  window.localStorage.setItem(COMPLETED_STAGES_KEY, JSON.stringify([...completed]));
}

function readCompletedStages(): MissionStage[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COMPLETED_STAGES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isMissionStage) : [];
  } catch {
    return [];
  }
}

function countSubmitted(items: { submitted: boolean }[]) {
  return items.filter((item) => item.submitted).length;
}

function countCorrect(items: { submitted: boolean; isCorrect: boolean }[]) {
  return items.filter((item) => item.submitted && item.isCorrect).length;
}

function percent(correct: number, total: number) {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}
