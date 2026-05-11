import type { IELTSTopicRoute } from "./types";

export type ContentGraphNodeType =
  | "topic"
  | "skill"
  | "vocabulary_item"
  | "dictation_item"
  | "audio_track"
  | "audio_segment"
  | "reading_passage"
  | "reading_question"
  | "scenario_article"
  | "scenario_expression"
  | "difficult_sentence"
  | "mistake"
  | "review_item"
  | "mission";

export type ContentGraphRelation =
  | "belongs_to_topic"
  | "appears_in"
  | "tests"
  | "reviews"
  | "used_in_mission"
  | "caused_mistake"
  | "synonym_of"
  | "audio_for"
  | "evidence_for"
  | "same_scenario_as"
  | "supports_skill"
  | "source_of";

export type ContentGraphNode = {
  id: string;
  type: ContentGraphNodeType;
  title: string;
  topicTags: IELTSTopicRoute[];
  skillTags: string[];
  sourceId?: string;
  status: "ready" | "needs_review" | "disabled";
  metadata?: Record<string, unknown>;
};

export type ContentGraphEdge = {
  id: string;
  from: string;
  to: string;
  relation: ContentGraphRelation;
  weight: number;
  metadata?: Record<string, unknown>;
};

export type ContentGraph = {
  generatedAt: string;
  nodes: ContentGraphNode[];
  edges: ContentGraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    byNodeType: Record<string, number>;
    byTopic: Record<string, number>;
    bySkill: Record<string, number>;
  };
};

export type ContentGraphReport = {
  generatedAt: string;
  totalNodes: number;
  totalEdges: number;
  warnings: string[];
  orphanVocabularyItems: number;
  readingPassagesWithoutQuestions: number;
  audioWithoutTranscript: number;
  scenarioArticlesWithoutTopic: number;
  missionsWithoutEnoughResources: number;
};
