export type ResourceType =
  | "ielts_past_paper"
  | "ielts_listening_audio"
  | "ielts_transcript"
  | "ielts_vocabulary"
  | "foreign_magazine"
  | "answer_key"
  | "user_note"
  | "unknown";

export type ResourceFileKind =
  | "document"
  | "ebook"
  | "audio"
  | "text"
  | "structured_data"
  | "unknown";

export type LearningResource = {
  id: string;
  title: string;
  fileName: string;
  extension: string;
  type: ResourceType;
  fileKind: ResourceFileKind;
  absolutePath: string;
  relativePath: string;
  folder: string;
  sizeBytes: number;
  modifiedAt: string;
  importedAt: string;
  topicTags: string[];
  skillTags: ("listening" | "reading" | "vocabulary" | "review")[];
  level?: "B1" | "B2" | "C1";
  status: "raw" | "indexed" | "ready" | "needs_review";
  warnings: string[];
};

export type ResourceHealth = {
  resourceRoot: string;
  scannedAt: string;
  rootExists: boolean;
  totalFiles: number;
  byType: Record<string, number>;
  byFileKind: Record<string, number>;
  byFolder: Record<string, number>;
  missingExpectedFolders: string[];
  detectedExpectedFolders: string[];
  warnings: string[];
};

export type ResourceIndex = {
  metadata: {
    resourceRoot: string;
    scannedAt: string;
    count: number;
    generatedBy: string;
  };
  items: LearningResource[];
};
