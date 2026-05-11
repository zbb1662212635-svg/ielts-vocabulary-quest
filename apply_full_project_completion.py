#!/usr/bin/env python3
"""
IELTS Mission Lab full-flow completion patch.

Run from the repository root:
  python apply_full_project_completion.py
  npm install
  npm run build
  npm run dev

What this patch does:
- Gives every learning API a safe sample fallback so the app works even without private imports.
- Converts bundled Reading Lab sample articles into IELTS-style passages/questions/answer keys.
- Hardens client hooks against failed/invalid API payloads.
- Adds /api/app-health and /learning-check for quick end-to-end verification.
- Exposes the main feature pages in the sidebar.
- Adds lightweight smoke-test scripts for Codex/local verification.
"""
from __future__ import annotations

import json
import os
import shutil
from pathlib import Path

ROOT = Path.cwd()
BACKUP_DIR = ROOT / ".completion-patch-backup"


def ensure_repo_root() -> None:
    if not (ROOT / "package.json").exists() or not (ROOT / "src").exists():
        raise SystemExit("Please run this script from the project root. package.json and src/ were not found.")


def backup(path: Path) -> None:
    if path.exists():
        target = BACKUP_DIR / path.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)


def write(path: str, content: str) -> None:
    full_path = ROOT / path
    backup(full_path)
    full_path.parent.mkdir(parents=True, exist_ok=True)
    full_path.write_text(content.strip() + "\n", encoding="utf-8")
    print(f"wrote {path}")


def patch_package_json() -> None:
    path = ROOT / "package.json"
    backup(path)
    data = json.loads(path.read_text(encoding="utf-8"))
    scripts = data.setdefault("scripts", {})
    scripts.setdefault("check", "npm run lint && npm run build")
    scripts.setdefault("smoke:source", "node scripts/smoke-source.mjs")
    scripts.setdefault("smoke:http", "node scripts/smoke-http.mjs")
    scripts.setdefault("verify", "npm run smoke:source && npm run build")
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("patched package.json scripts")


SAMPLE_READING_ASSETS = r'''
import sampleReadings from "@/data/readings.sample.json";
import type {
  IELTSQuestionType,
  IELTSReadingQuestion,
  IELTSTopicRoute,
  ReadingAnswerKey,
  ReadingArticle,
  ReadingPassage,
  ReadingQuestion,
} from "./types";

const articles = sampleReadings as unknown as ReadingArticle[];

const interestRouteMap: Record<ReadingArticle["interestRoute"], IELTSTopicRoute> = {
  society_ideas: "history_society",
  technology_civilization: "science_technology",
  world_order_power: "history_society",
  economics_globalization: "work_business",
  science_environment: "environment_nature",
  general: "education_learning",
};

const keywordTopicMap: Record<string, IELTSTopicRoute> = {
  technology: "science_technology",
  science: "science_technology",
  history: "history_society",
  society: "history_society",
  knowledge: "education_learning",
  education: "education_learning",
  politics: "history_society",
  diplomacy: "history_society",
  security: "history_society",
  urbanization: "cities_transport",
  migration: "cities_transport",
  inequality: "history_society",
  environment: "environment_nature",
  ecology: "environment_nature",
  business: "work_business",
  economy: "work_business",
};

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function mapTopicTags(article: ReadingArticle): IELTSTopicRoute[] {
  const fromInterestRoute = interestRouteMap[article.interestRoute] ?? "education_learning";
  const fromKeywords = (article.topicTags ?? [])
    .map((tag) => keywordTopicMap[String(tag).toLowerCase()])
    .filter(Boolean) as IELTSTopicRoute[];
  return unique([fromInterestRoute, ...fromKeywords]);
}

function articleText(article: ReadingArticle): string {
  if (article.paragraphs?.length) {
    return article.paragraphs.map((paragraph) => paragraph.text).join("\n\n");
  }
  return article.summary || article.title;
}

function mapQuestionType(type: ReadingQuestion["type"]): IELTSQuestionType {
  if (type === "tfng") return "tfng";
  if (type === "sentence_completion") return "sentence_completion";
  if (type === "multiple_choice" || type === "author_attitude" || type === "main_idea" || type === "synonym") {
    return "multiple_choice";
  }
  return "matching";
}

function mapSkillTags(question: ReadingQuestion): IELTSReadingQuestion["skillTags"] {
  const raw = [question.type, ...(question.skillTags ?? [])].map((tag) => String(tag).toLowerCase());
  const tags: IELTSReadingQuestion["skillTags"] = [];

  if (raw.some((tag) => tag.includes("main"))) tags.push("main_idea");
  if (raw.some((tag) => tag.includes("synonym") || tag.includes("paraphrase"))) tags.push("synonym");
  if (raw.some((tag) => tag.includes("tfng"))) tags.push("tfng");
  if (raw.some((tag) => tag.includes("sentence"))) tags.push("sentence_completion");
  if (raw.some((tag) => tag.includes("attitude") || tag.includes("author"))) tags.push("author_attitude");
  if (!tags.length) tags.push("detail_location");
  tags.push("reading");

  return unique(tags) as IELTSReadingQuestion["skillTags"];
}

function fallbackOptions(question: ReadingQuestion): string[] | undefined {
  if (question.options?.length) return question.options;
  if (question.type === "tfng") return ["True", "False", "Not Given"];
  return question.correctAnswer ? [question.correctAnswer] : undefined;
}

export function getSampleReadingPassages(): ReadingPassage[] {
  return articles.map((article) => ({
    id: article.id,
    title: article.title,
    sourceResourceId: article.sourceFileId,
    sourceFileName: article.publication ?? "Sample Reading Lab",
    sourcePath: article.sourcePath,
    text: articleText(article),
    paragraphs: (article.paragraphs ?? []).map((paragraph, index) => ({
      id: paragraph.id,
      index: typeof paragraph.index === "number" ? paragraph.index : index + 1,
      label: String.fromCharCode(65 + index),
      text: paragraph.text,
      mainIdea: paragraph.mainIdea,
    })),
    topicTags: mapTopicTags(article),
    skillTags: ["reading", "vocabulary", "review"],
    level: article.level ?? "B2",
    wordCount: article.wordCount ?? articleText(article).split(/\s+/).filter(Boolean).length,
    questions: (article.questions ?? []).map((question) => question.id),
    status: "ready",
    warnings: [],
  }));
}

export function getSampleIELTSReadingQuestions(): IELTSReadingQuestion[] {
  return articles.flatMap((article) =>
    (article.questions ?? []).map((question, index) => ({
      id: question.id,
      passageId: article.id,
      sourceResourceId: article.sourceFileId,
      sourceFileName: article.title,
      questionNumber: index + 1,
      questionType: mapQuestionType(question.type),
      prompt: question.prompt,
      options: fallbackOptions(question),
      correctAnswer: question.correctAnswer,
      acceptableAnswers: question.correctAnswer ? [question.correctAnswer] : undefined,
      evidenceText: question.evidenceText,
      evidenceParagraphId: question.paragraphId,
      explanation: question.explanation,
      topicTags: mapTopicTags(article),
      skillTags: mapSkillTags(question),
      difficulty: question.difficulty ?? 2,
      status: question.correctAnswer ? "ready" : "needs_review",
      warnings: question.correctAnswer ? [] : ["Sample question has no answer key."],
    })),
  );
}

export function getSampleReadingAnswerKeys(): ReadingAnswerKey[] {
  return articles.map((article) => ({
    id: `sample_answer_key_${article.id}`,
    sourceResourceId: article.sourceFileId,
    sourceFileName: article.title,
    passageId: article.id,
    answers: (article.questions ?? [])
      .map((question, index) => ({
        questionNumber: index + 1,
        answer: question.correctAnswer,
        alternativeAnswers: question.correctAnswer ? [question.correctAnswer] : undefined,
      }))
      .filter((item) => Boolean(item.answer)),
    status: "ready",
    warnings: [],
  }));
}
'''

READING_ASSET_LOADER = r'''
import fs from "node:fs";
import path from "node:path";
import { getSampleIELTSReadingQuestions, getSampleReadingAnswerKeys, getSampleReadingPassages } from "./sampleReadingAssets";
import type { IELTSReadingQuestion, ReadingAnswerKey, ReadingPassage } from "./types";

type ListPayload<T> = { generatedAt?: string; totalItems?: number; items?: T[] };

function privateFilePath(fileName: string) {
  return path.join(process.cwd(), "data", "private", fileName);
}

function readPrivateList<T>(fileName: string): T[] {
  const filePath = privateFilePath(fileName);
  if (!fs.existsSync(filePath)) return [];
  try {
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8")) as ListPayload<T>;
    return Array.isArray(payload.items) ? payload.items : [];
  } catch (error) {
    console.warn(`Failed to read private reading asset ${fileName}.`, error);
    return [];
  }
}

export function getReadingPassages(): ReadingPassage[] {
  const privateItems = readPrivateList<ReadingPassage>("reading-passages.generated.json");
  return privateItems.length ? privateItems : getSampleReadingPassages();
}

export function getIELTSReadingQuestions(): IELTSReadingQuestion[] {
  const privateItems = readPrivateList<IELTSReadingQuestion>("reading-questions.generated.json");
  return privateItems.length ? privateItems : getSampleIELTSReadingQuestions();
}

export function getReadingAnswerKeys(): ReadingAnswerKey[] {
  const privateItems = readPrivateList<ReadingAnswerKey>("reading-answer-keys.generated.json");
  return privateItems.length ? privateItems : getSampleReadingAnswerKeys();
}

export function getReadingAssetSource(): "private" | "sample" {
  return readPrivateList<ReadingPassage>("reading-passages.generated.json").length ? "private" : "sample";
}

export function getReadingImportReport() {
  const reportPath = privateFilePath("reading.import-report.json");
  if (!fs.existsSync(reportPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(reportPath, "utf8")) as Record<string, unknown>;
  } catch (error) {
    console.warn("Failed to read reading import report.", error);
    return null;
  }
}
'''

CLIENT_FETCH = r'''
export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${url} failed with HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export function arrayOrFallback<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}
'''

USE_DICTATION_ITEMS = r'''
"use client";

import { useEffect, useState } from "react";
import listeningData from "@/data/listening-survival.sample.json";
import type { DictationItem, ListeningSurvivalItem } from "./types";
import { arrayOrFallback, fetchJson } from "./clientFetch";

type DictationPayload = { items?: DictationItem[] };

const fallbackItems: DictationItem[] = (listeningData as ListeningSurvivalItem[]).map((item) => ({
  id: `sample_${item.id}`,
  text: item.audioText || item.word,
  answer: item.word,
  chineseMeaning: item.category,
  topicTags: ["travel_daily_services"],
  skillTags: ["listening", "dictation", "spelling"],
  difficulty: Math.min(Math.max(Math.round(item.difficulty || 2), 1), 5) as 1 | 2 | 3 | 4 | 5,
  itemType: "word",
  source: "sample",
  commonMistakes: item.commonWrongSpellings,
  status: "ready",
  warnings: [],
}));

export function useDictationItems() {
  const [items, setItems] = useState<DictationItem[]>(fallbackItems);

  useEffect(() => {
    let cancelled = false;

    fetchJson<DictationPayload>("/api/dictation")
      .then((payload) => {
        if (!cancelled) {
          const next = arrayOrFallback<DictationItem>(payload.items, fallbackItems);
          setItems(next.length ? next : fallbackItems);
        }
      })
      .catch((error) => {
        console.warn("Dictation items failed to load; using sample dictation.", error);
        if (!cancelled) setItems(fallbackItems);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return items;
}
'''

USE_READING_ASSETS = r'''
"use client";

import { useEffect, useState } from "react";
import { getSampleIELTSReadingQuestions, getSampleReadingAnswerKeys, getSampleReadingPassages } from "./sampleReadingAssets";
import type { IELTSReadingQuestion, ReadingAnswerKey, ReadingPassage } from "./types";
import { arrayOrFallback, fetchJson } from "./clientFetch";

type ReadingAssets = {
  source?: "private" | "sample" | "sample_fallback";
  passages?: ReadingPassage[];
  questions?: IELTSReadingQuestion[];
  answerKeys?: ReadingAnswerKey[];
};

const fallbackAssets = {
  source: "sample_fallback" as const,
  passages: getSampleReadingPassages(),
  questions: getSampleIELTSReadingQuestions(),
  answerKeys: getSampleReadingAnswerKeys(),
};

export function useReadingAssets() {
  const [assets, setAssets] = useState(fallbackAssets);

  useEffect(() => {
    let cancelled = false;

    fetchJson<ReadingAssets>("/api/reading-assets")
      .then((payload) => {
        if (cancelled) return;
        const passages = arrayOrFallback<ReadingPassage>(payload.passages, fallbackAssets.passages);
        const questions = arrayOrFallback<IELTSReadingQuestion>(payload.questions, fallbackAssets.questions);
        const answerKeys = arrayOrFallback<ReadingAnswerKey>(payload.answerKeys, fallbackAssets.answerKeys);
        setAssets({
          source: payload.source ?? "sample_fallback",
          passages: passages.length ? passages : fallbackAssets.passages,
          questions: questions.length ? questions : fallbackAssets.questions,
          answerKeys: answerKeys.length ? answerKeys : fallbackAssets.answerKeys,
        });
      })
      .catch((error) => {
        console.warn("Reading assets failed to load; using bundled sample reading assets.", error);
        if (!cancelled) setAssets(fallbackAssets);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return assets;
}
'''

USE_READINGS = r'''
"use client";

import { useEffect, useState } from "react";
import sampleReadings from "@/data/readings.sample.json";
import type { ReadingArticle } from "./types";
import { arrayOrFallback, fetchJson } from "./clientFetch";

type ReadingsResponse = {
  source: "sample" | "private" | "sample_fallback";
  metadata?: { count?: number; source?: string; generatedAt?: string; note?: string };
  articles: ReadingArticle[];
};

const sampleArticles = sampleReadings as ReadingArticle[];

function fallbackReadings(note = "Using bundled sample readings."): ReadingsResponse {
  return {
    source: "sample_fallback",
    metadata: { count: sampleArticles.length, source: "sample", note },
    articles: sampleArticles,
  };
}

export function useReadings() {
  const [data, setData] = useState<ReadingsResponse>({
    source: "sample",
    metadata: { count: sampleArticles.length, source: "sample" },
    articles: sampleArticles,
  });

  useEffect(() => {
    let cancelled = false;

    fetchJson<Partial<ReadingsResponse>>("/api/readings")
      .then((payload) => {
        if (cancelled) return;
        const articles = arrayOrFallback<ReadingArticle>(payload.articles, sampleArticles);
        setData({
          source: payload.source ?? "sample_fallback",
          metadata: payload.metadata ?? { count: articles.length, source: payload.source ?? "sample" },
          articles: articles.length ? articles : sampleArticles,
        });
      })
      .catch((error) => {
        console.warn("Readings failed to load; using sample readings.", error);
        if (!cancelled) setData(fallbackReadings("Readings API failed."));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
'''

USE_SCENARIO_READINGS = r'''
"use client";

import { useEffect, useState } from "react";
import { sampleScenarioReadings } from "@/data/scenario-readings.sample";
import type { ScenarioReadingArticle } from "./types";
import { arrayOrFallback, fetchJson } from "./clientFetch";

type ScenarioPayload = {
  source?: "sample" | "private" | "sample_fallback";
  articles?: ScenarioReadingArticle[];
  metadata?: { count?: number; generatedAt?: string; note?: string };
};

const fallback = {
  source: "sample_fallback" as const,
  articles: sampleScenarioReadings,
  metadata: { count: sampleScenarioReadings.length, note: "Using bundled scenario readings." },
};

export function useScenarioReadings() {
  const [data, setData] = useState(fallback);

  useEffect(() => {
    let cancelled = false;

    fetchJson<ScenarioPayload>("/api/scenario-readings")
      .then((payload) => {
        if (cancelled) return;
        const articles = arrayOrFallback<ScenarioReadingArticle>(payload.articles, sampleScenarioReadings);
        setData({
          source: payload.source ?? "sample_fallback",
          articles: articles.length ? articles : sampleScenarioReadings,
          metadata: payload.metadata ?? { count: articles.length },
        });
      })
      .catch((error) => {
        console.warn("Scenario readings failed to load; using sample scenario readings.", error);
        if (!cancelled) setData(fallback);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
'''

READING_ASSETS_ROUTE = r'''
import { NextResponse } from "next/server";
import {
  getIELTSReadingQuestions,
  getReadingAnswerKeys,
  getReadingAssetSource,
  getReadingPassages,
} from "@/lib/readingAssetLoader";
import { getSampleIELTSReadingQuestions, getSampleReadingAnswerKeys, getSampleReadingPassages } from "@/lib/sampleReadingAssets";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const passages = getReadingPassages();
    const questions = getIELTSReadingQuestions();
    const answerKeys = getReadingAnswerKeys();
    const source = getReadingAssetSource();

    return NextResponse.json({
      source,
      metadata: {
        passages: passages.length,
        questions: questions.length,
        answerKeys: answerKeys.length,
        generatedAt: new Date().toISOString(),
      },
      passages,
      questions,
      answerKeys,
    });
  } catch (error) {
    console.warn("Reading assets API failed; returning sample assets.", error);
    const passages = getSampleReadingPassages();
    const questions = getSampleIELTSReadingQuestions();
    const answerKeys = getSampleReadingAnswerKeys();
    return NextResponse.json({
      source: "sample_fallback",
      metadata: {
        passages: passages.length,
        questions: questions.length,
        answerKeys: answerKeys.length,
        note: "API fallback returned bundled sample reading assets.",
        generatedAt: new Date().toISOString(),
      },
      passages,
      questions,
      answerKeys,
    });
  }
}
'''

READING_HEALTH_ROUTE = r'''
import { NextResponse } from "next/server";
import {
  getIELTSReadingQuestions,
  getReadingAssetSource,
  getReadingImportReport,
  getReadingPassages,
} from "@/lib/readingAssetLoader";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const passages = getReadingPassages();
    const questions = getIELTSReadingQuestions();
    const report = getReadingImportReport();
    const source = getReadingAssetSource();
    const readyQuestions = questions.filter((question) => question.status === "ready").length;
    const questionsWithAnswers = questions.filter((question) => Boolean(question.correctAnswer)).length;
    const questionsWithEvidence = questions.filter((question) => Boolean(question.evidenceText)).length;
    const questionsNeedingReview = questions.filter((question) => question.status === "needs_review").length;

    return NextResponse.json({
      imported: source === "private",
      source,
      sampleFallbackActive: source === "sample",
      passages: passages.length,
      questions: questions.length,
      readyQuestions,
      questionsWithAnswers,
      questionsWithEvidence,
      questionsNeedingReview,
      needsReview: questionsNeedingReview + passages.filter((passage) => passage.status === "needs_review").length,
      lastImportedAt: typeof report?.generatedAt === "string" ? report.generatedAt : null,
    });
  } catch (error) {
    console.warn("Reading health failed.", error);
    return NextResponse.json({
      imported: false,
      source: "sample_fallback",
      sampleFallbackActive: true,
      passages: 0,
      questions: 0,
      readyQuestions: 0,
      questionsWithAnswers: 0,
      questionsWithEvidence: 0,
      questionsNeedingReview: 0,
      needsReview: 0,
      lastImportedAt: null,
      error: "reading_health_failed",
    });
  }
}
'''

DICTATION_ROUTE = r'''
import { NextResponse } from "next/server";
import { getDictationItems } from "@/lib/audioLoader";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const items = getDictationItems();
    return NextResponse.json({
      source: items.some((item) => item.source !== "sample") ? "private_or_sample" : "sample",
      metadata: { count: items.length, generatedAt: new Date().toISOString() },
      items,
    });
  } catch (error) {
    console.warn("Dictation API failed.", error);
    return NextResponse.json({ source: "sample_fallback", metadata: { count: 0 }, items: [] });
  }
}
'''

LISTENING_HEALTH_ROUTE = r'''
import { NextResponse } from "next/server";
import { getAudioImportReport, getAudioTracks, getDictationItems, getTranscripts } from "@/lib/audioLoader";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const audioTracks = getAudioTracks();
    const transcripts = getTranscripts();
    const dictationItems = getDictationItems();
    const report = getAudioImportReport();
    const matchedPairs = audioTracks.filter((track) => Boolean(track.matchedTranscriptId)).length;
    const needsReview = dictationItems.filter((item) => item.status === "needs_review").length;

    return NextResponse.json({
      imported: audioTracks.length > 0 || transcripts.length > 0,
      audioTracks: audioTracks.length,
      transcripts: transcripts.length,
      matchedPairs,
      unmatchedAudio: Math.max(audioTracks.length - matchedPairs, 0),
      unmatchedTranscripts: transcripts.filter((transcript) => !transcript.matchedAudioId).length,
      dictationItems: dictationItems.length,
      needsReview,
      sampleFallbackActive: dictationItems.some((item) => item.source === "sample"),
      lastImportedAt: typeof report?.generatedAt === "string" ? report.generatedAt : null,
    });
  } catch (error) {
    console.warn("Listening health failed.", error);
    return NextResponse.json({
      imported: false,
      audioTracks: 0,
      transcripts: 0,
      matchedPairs: 0,
      unmatchedAudio: 0,
      unmatchedTranscripts: 0,
      dictationItems: 0,
      needsReview: 0,
      sampleFallbackActive: true,
      lastImportedAt: null,
      error: "listening_health_failed",
    });
  }
}
'''

READINGS_ROUTE = r'''
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import sampleReadings from "@/data/readings.sample.json";
import type { ReadingArticle } from "@/lib/types";

export const dynamic = "force-dynamic";

const sampleArticles = sampleReadings as ReadingArticle[];
const privateFile = path.join(process.cwd(), "data", "private", "reading-articles.generated.json");

function readPrivateArticles(): ReadingArticle[] {
  if (!fs.existsSync(privateFile)) return [];
  const payload = JSON.parse(fs.readFileSync(privateFile, "utf8"));
  const articles = Array.isArray(payload?.articles)
    ? payload.articles
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];
  return articles.filter(Boolean) as ReadingArticle[];
}

export function GET() {
  try {
    const privateArticles = readPrivateArticles();
    const articles = privateArticles.length ? privateArticles : sampleArticles;
    const source = privateArticles.length ? "private" : "sample";
    return NextResponse.json({
      source,
      metadata: { count: articles.length, source, generatedAt: new Date().toISOString() },
      articles,
    });
  } catch (error) {
    console.warn("Readings API failed; returning sample readings.", error);
    return NextResponse.json({
      source: "sample_fallback",
      metadata: { count: sampleArticles.length, source: "sample", note: "API fallback returned bundled sample readings." },
      articles: sampleArticles,
    });
  }
}
'''

SCENARIO_READINGS_ROUTE = r'''
import { NextResponse } from "next/server";
import { sampleScenarioReadings } from "@/data/scenario-readings.sample";
import { getScenarioReadingArticles } from "@/lib/scenarioReadingLoader";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const articles = getScenarioReadingArticles();
    const source = articles.length && articles !== sampleScenarioReadings ? "private" : "sample";
    return NextResponse.json({
      source,
      metadata: { count: articles.length, generatedAt: new Date().toISOString() },
      articles: articles.length ? articles : sampleScenarioReadings,
    });
  } catch (error) {
    console.warn("Scenario readings API failed; returning sample scenario readings.", error);
    return NextResponse.json({
      source: "sample_fallback",
      metadata: { count: sampleScenarioReadings.length, note: "API fallback returned bundled scenario readings." },
      articles: sampleScenarioReadings,
    });
  }
}
'''

TODAY_MISSION_ROUTE = r'''
import { NextResponse } from "next/server";
import { generateTodayMission, type MissionGenerationResult } from "@/lib/missionEngine";
import { getSafeTodayMission } from "@/lib/missionLoader";

export const dynamic = "force-dynamic";

function fallbackResult(reason: string): MissionGenerationResult {
  return {
    mission: getSafeTodayMission(),
    warnings: [reason],
    usedFallbacks: ["today_mission_api_fallback"],
  };
}

export function GET() {
  try {
    const result = generateTodayMission({
      dailyMinutes: 25,
      includeReview: true,
      includeScenarioReading: true,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.warn("Today mission API failed; returning safe mission.", error);
    return NextResponse.json(fallbackResult("Mission engine failed; using safe bundled mission."));
  }
}
'''

VOCABULARY_ROUTE = r'''
import { NextResponse } from "next/server";
import sampleVocabulary from "@/data/vocabulary.sample.json";
import { getVocabularyItems, getVocabularySource } from "@/lib/vocabularyLoader";
import type { VocabularyItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const sampleItems = sampleVocabulary as VocabularyItem[];

export async function GET() {
  try {
    const items = getVocabularyItems();
    const source = getVocabularySource();
    return NextResponse.json({
      source,
      metadata: { count: items.length, source, generatedAt: new Date().toISOString() },
      items: items.length ? items : sampleItems,
    });
  } catch (error) {
    console.warn("Vocabulary API failed; returning sample vocabulary.", error);
    return NextResponse.json({
      source: "sample_fallback",
      metadata: { count: sampleItems.length, source: "sample", note: "API fallback returned bundled sample vocabulary." },
      items: sampleItems,
    });
  }
}
'''

APP_HEALTH_ROUTE = r'''
import { NextResponse } from "next/server";
import { getDictationItems } from "@/lib/audioLoader";
import { generateTodayMission } from "@/lib/missionEngine";
import { getIELTSReadingQuestions, getReadingPassages } from "@/lib/readingAssetLoader";
import { getScenarioReadingArticles } from "@/lib/scenarioReadingLoader";
import { getVocabularyItems } from "@/lib/vocabularyLoader";

export const dynamic = "force-dynamic";

type Check = {
  key: string;
  label: string;
  ok: boolean;
  count?: number;
  error?: string;
};

function countCheck<T>(key: string, label: string, getter: () => T[], minimum = 1): Check {
  try {
    const items = getter();
    return { key, label, ok: items.length >= minimum, count: items.length };
  } catch (error) {
    return { key, label, ok: false, count: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

export function GET() {
  const checks: Check[] = [
    countCheck("vocabulary", "Vocabulary items", getVocabularyItems),
    countCheck("dictation", "Dictation items", getDictationItems),
    countCheck("reading_passages", "Reading passages", getReadingPassages),
    countCheck("reading_questions", "Reading questions", getIELTSReadingQuestions),
    countCheck("scenario_readings", "Scenario reading articles", getScenarioReadingArticles),
  ];

  try {
    const result = generateTodayMission({ dailyMinutes: 25, includeReview: true, includeScenarioReading: true });
    checks.push({
      key: "mission",
      label: "Generated mission",
      ok: Boolean(result.mission?.stages?.length && result.mission?.vocabularyLoadout?.length),
      count: result.mission?.stages?.length ?? 0,
    });
  } catch (error) {
    checks.push({
      key: "mission",
      label: "Generated mission",
      ok: false,
      count: 0,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return NextResponse.json({
    ok: checks.every((check) => check.ok),
    generatedAt: new Date().toISOString(),
    checks,
    routes: [
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
      "/review",
      "/settings",
    ],
  });
}
'''

LEARNING_CHECK_PAGE = r'''
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
            <Link key={route} href={route} className="rounded-2xl border border-slate-100 p-4 text-sm font-black text-slate-700 hover:border-indigo-200 hover:text-indigo-700">
              {route}
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
'''

SIDEBAR = r'''
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  CalendarCheck,
  Database,
  FileCheck2,
  Headphones,
  LayoutDashboard,
  Map,
  Newspaper,
  PackageCheck,
  RotateCcw,
  Settings,
  Swords,
} from "lucide-react";

const navItems = [
  { href: "/", label: "学习首页", icon: LayoutDashboard },
  { href: "/mission", label: "今日任务", icon: CalendarCheck },
  { href: "/quest", label: "任务地图", icon: Map },
  { href: "/vocabulary", label: "词汇装备库", icon: PackageCheck },
  { href: "/synonym-arena", label: "同义替换", icon: Swords },
  { href: "/dictation", label: "听写训练", icon: Headphones },
  { href: "/listening/studio", label: "听力工作室", icon: Headphones },
  { href: "/reading/dossier", label: "阅读档案", icon: BookOpenCheck },
  { href: "/reading-lab", label: "情景阅读", icon: Newspaper },
  { href: "/resource-library", label: "资源库", icon: Database },
  { href: "/review", label: "错因复盘", icon: RotateCcw },
  { href: "/learning-check", label: "功能自检", icon: FileCheck2 },
  { href: "/settings", label: "设置与数据", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur lg:block">
      <Link href="/" className="block rounded-3xl bg-slate-950 p-5 text-white">
        <div className="text-lg font-black">IELTS Mission Lab</div>
        <div className="mt-1 text-xs font-bold leading-5 text-slate-300">雅思沉浸式学习场景系统</div>
      </Link>

      <nav className="mt-5 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
                active ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
'''

APPSHELL = r'''
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <TopBar />
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
'''

TOPBAR = r'''
"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, Headphones, Menu } from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 lg:hidden" aria-label="Open navigation">
            <Menu size={18} />
          </button>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">目标</div>
            <div className="text-sm font-black text-slate-950">IELTS Listening 7.0 / Reading 7.0</div>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/dictation" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:border-indigo-200 hover:text-indigo-700">
            <Headphones size={16} /> 听写
          </Link>
          <Link href="/reading/dossier" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:border-indigo-200 hover:text-indigo-700">
            <BookOpenCheck size={16} /> 阅读
          </Link>
          <Link href="/mission" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700">
            继续今日任务 <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}
'''

NOT_FOUND = r'''
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

export default function NotFound() {
  return (
    <AppShell>
      <section className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-indigo-600">404</p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">页面不存在</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">请回到学习首页或功能自检页面继续。</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">学习首页</Link>
          <Link href="/learning-check" className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white">功能自检</Link>
        </div>
      </section>
    </AppShell>
  );
}
'''

LOADING = r'''
export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-indigo-600">Loading</p>
        <h1 className="mt-3 text-2xl font-black">正在加载学习任务...</h1>
      </div>
    </div>
  );
}
'''

GLOBAL_ERROR = r'''
"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="zh-CN">
      <body>
        <main className="min-h-screen bg-slate-950 p-8 text-white">
          <section className="mx-auto max-w-3xl rounded-3xl bg-white/10 p-8">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-rose-200">Runtime Error</p>
            <h1 className="mt-3 text-3xl font-black">学习流程出现异常</h1>
            <p className="mt-3 text-sm leading-7 text-slate-200">{error.message}</p>
            <button onClick={reset} className="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">
              重新加载
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
'''

SMOKE_SOURCE = r'''
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "src/app/page.tsx",
  "src/app/mission/page.tsx",
  "src/app/vocabulary/page.tsx",
  "src/app/synonym-arena/page.tsx",
  "src/app/dictation/page.tsx",
  "src/app/listening/studio/page.tsx",
  "src/app/reading/dossier/page.tsx",
  "src/app/reading/passages/page.tsx",
  "src/app/reading/questions/page.tsx",
  "src/app/reading-lab/page.tsx",
  "src/app/review/page.tsx",
  "src/app/settings/page.tsx",
  "src/app/learning-check/page.tsx",
  "src/app/api/app-health/route.ts",
  "src/lib/sampleReadingAssets.ts",
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error("Missing required files:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
for (const script of ["build", "lint", "smoke:source", "smoke:http", "verify"]) {
  if (!pkg.scripts?.[script]) {
    console.error(`Missing package script: ${script}`);
    process.exit(1);
  }
}

console.log("Source smoke check passed.");
'''

SMOKE_HTTP = r'''
const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";

const endpoints = [
  "/api/app-health",
  "/api/vocabulary",
  "/api/dictation",
  "/api/reading-assets",
  "/api/readings",
  "/api/scenario-readings",
  "/api/today-mission",
  "/",
  "/mission",
  "/vocabulary",
  "/dictation",
  "/reading/dossier",
  "/learning-check",
];

let failed = 0;
for (const endpoint of endpoints) {
  const url = `${baseUrl}${endpoint}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      failed += 1;
      console.error(`${endpoint} -> HTTP ${response.status}`);
    } else {
      console.log(`${endpoint} -> OK`);
    }
  } catch (error) {
    failed += 1;
    console.error(`${endpoint} -> ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) {
  console.error(`${failed} smoke checks failed. Start the app first with: npm run dev`);
  process.exit(1);
}

console.log("HTTP smoke check passed.");
'''

README_COMPLETION = r'''
# Completion Patch Notes

This patch makes the project runnable as a complete IELTS learning app even when private resources have not been imported yet.

## Verify locally

```bash
npm install
npm run smoke:source
npm run build
npm run dev
```

Then open:

- `/learning-check` for app health
- `/mission` for the full mission flow
- `/vocabulary` for vocabulary library
- `/synonym-arena` for paraphrase practice
- `/dictation` for listening spelling practice
- `/reading/dossier`, `/reading/passages`, `/reading/questions` for IELTS reading assets
- `/reading-lab` for scenario reading
- `/review` for spaced review

## Runtime fallback strategy

- Vocabulary uses private generated data when available, otherwise bundled sample data.
- Dictation uses private transcript/audio-generated items when available, otherwise sample listening-survival words.
- Reading assets use private generated passages/questions when available, otherwise bundled Reading Lab articles converted into IELTS-style passages, questions, and answer keys.
- Scenario reading uses private imported articles when available, otherwise bundled sample scenario readings.
- `/api/app-health` checks that all core data sources are usable.
'''


def main() -> None:
    ensure_repo_root()

    write("src/lib/sampleReadingAssets.ts", SAMPLE_READING_ASSETS)
    write("src/lib/readingAssetLoader.ts", READING_ASSET_LOADER)
    write("src/lib/clientFetch.ts", CLIENT_FETCH)
    write("src/lib/useDictationItems.ts", USE_DICTATION_ITEMS)
    write("src/lib/useReadingAssets.ts", USE_READING_ASSETS)
    write("src/lib/useReadings.ts", USE_READINGS)
    write("src/lib/useScenarioReadings.ts", USE_SCENARIO_READINGS)

    write("src/app/api/reading-assets/route.ts", READING_ASSETS_ROUTE)
    write("src/app/api/reading-health/route.ts", READING_HEALTH_ROUTE)
    write("src/app/api/dictation/route.ts", DICTATION_ROUTE)
    write("src/app/api/listening-health/route.ts", LISTENING_HEALTH_ROUTE)
    write("src/app/api/readings/route.ts", READINGS_ROUTE)
    write("src/app/api/scenario-readings/route.ts", SCENARIO_READINGS_ROUTE)
    write("src/app/api/today-mission/route.ts", TODAY_MISSION_ROUTE)
    write("src/app/api/vocabulary/route.ts", VOCABULARY_ROUTE)
    write("src/app/api/app-health/route.ts", APP_HEALTH_ROUTE)

    write("src/app/learning-check/page.tsx", LEARNING_CHECK_PAGE)
    write("src/components/layout/Sidebar.tsx", SIDEBAR)
    write("src/components/layout/AppShell.tsx", APPSHELL)
    write("src/components/layout/TopBar.tsx", TOPBAR)
    write("src/app/not-found.tsx", NOT_FOUND)
    write("src/app/loading.tsx", LOADING)
    write("src/app/global-error.tsx", GLOBAL_ERROR)

    write("scripts/smoke-source.mjs", SMOKE_SOURCE)
    write("scripts/smoke-http.mjs", SMOKE_HTTP)
    write("COMPLETION_PATCH.md", README_COMPLETION)
    patch_package_json()

    print("\nCompletion patch applied.")
    print("Next commands:")
    print("  npm install")
    print("  npm run smoke:source")
    print("  npm run build")
    print("  npm run dev")
    print("Then open http://localhost:3000/learning-check")


if __name__ == "__main__":
    main()
