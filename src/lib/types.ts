export type SkillTag = "reading" | "listening" | "writing" | "speaking";

export type SourceLayer =
  | "private_vocabulary"
  | "topic_vocabulary"
  | "academic_word_list"
  | "listening_survival"
  | "reading_paraphrase"
  | "foreign_press_reading"
  | "collocation";

export type ErrorType =
  | "meaning_unknown"
  | "slow_recall"
  | "wrong_synonym"
  | "spelling_error"
  | "plural_error"
  | "spacing_error"
  | "hyphen_error"
  | "word_order_error"
  | "word_family_error"
  | "context_misread"
  | "listening_not_recognized"
  | "main_idea_error"
  | "tfng_error"
  | "detail_location_error"
  | "sentence_completion_error"
  | "author_attitude_error"
  | "difficult_sentence_error";

export type ExampleSentence = {
  sentence: string;
  translation?: string;
  context: "reading" | "listening" | "general";
  targetWord: string;
  source?: string;
};

export type ListeningRisk = {
  spellingRisk: boolean;
  homophoneRisk: boolean;
  weakFormRisk: boolean;
  pluralRisk: boolean;
  commonWrongSpellings?: string[];
};

export type VocabularyItem = {
  id: string;
  word: string;
  normalizedWord?: string;
  partOfSpeech: string[];
  chineseMeaning: string;
  englishDefinition?: string;
  cefrLevel?: "A2" | "B1" | "B2" | "C1";
  topicTags: string[];
  skillTags: SkillTag[];
  sourceLayers: SourceLayer[];
  examples: ExampleSentence[];
  synonyms: string[];
  antonyms?: string[];
  collocations: string[];
  wordFamily: string[];
  commonMistakes?: string[];
  listeningRisk?: ListeningRisk;
  sourceResourceId?: string;
  sourceFileName?: string;
  sourcePath?: string;
  importWarnings?: string[];
};

export type TrainingAttempt = {
  id: string;
  wordId: string;
  mode:
    | "word_encounter"
    | "synonym_arena"
    | "dictation"
    | "context_puzzle"
    | "review"
    | "reading_lab";
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  errorType?: ErrorType;
  createdAt: string;
};

export type UserProgress = {
  wordId: string;
  seenCount: number;
  correctCount: number;
  wrongCount: number;
  mastery: number;
  lastSeenAt?: string;
  nextReviewAt?: string;
  errorTypes: ErrorType[];
  trainingHistory: TrainingAttempt[];
};

export type DailyMission = {
  id: string;
  date: string;
  title: string;
  estimatedMinutes: number;
  newWordIds: string[];
  synonymPairIds: string[];
  dictationWordIds: string[];
  reviewWordIds: string[];
  completed: boolean;
};

export type StudyGoalSettings = {
  examType: "Academic" | "General Training";
  targetListeningBand: string;
  targetReadingBand: string;
  currentListeningBand: string;
  currentReadingBand: string;
  examDate: string;
  dailyStudyMinutes: number;
  weakAreas: ErrorType[];
};

export type DailyMissionSettings = {
  newWordsPerDay: number;
  synonymBattlesPerDay: number;
  dictationItemsPerDay: number;
  reviewLimitPerDay: number;
  difficultyLevel: "foundation" | "band7" | "challenge";
};

export type InterestProfileSettings = {
  preferredRoutes: string[];
  contentLevel: "B1_B2" | "B2_C1" | "C1";
  explanationLanguage: "zh" | "en" | "mixed";
  politicalContentStyle: "conceptual" | "historical" | "current";
};

export type DictationSettings = {
  accent: "en-GB" | "en-US";
  playbackSpeed: number;
  allowReplay: boolean;
  showHintAfterMistakes: number;
  strictPluralCheck: boolean;
  strictSpellingCheck: boolean;
};

export type ReviewSettings = {
  reviewPressure: "light" | "balanced" | "intensive";
  dailyReviewCap: number;
  highRiskThreshold: number;
  masteryHideThreshold: number;
};

export type MagazineSourceName =
  | "economist"
  | "new_yorker"
  | "atlantic"
  | "wired"
  | "guardian"
  | "unknown";

export type ReadingSourceSettings = {
  enableReadingLab: boolean;
  enableGithubCrawler: boolean;
  selectedSources: string[];
  preferredMagazines: MagazineSourceName[];
  preferredRoutes: string[];
  defaultReadingLevel: "B1" | "B2" | "C1";
  dailyReadingMinutes: number;
  maxArticlesPerSync: number;
  maxFileSizeMB: number;
  showChineseExplanation: boolean;
  highlightDifficultSentences: boolean;
  autoAddVocabularyToReview: boolean;
  autoGenerateQuestions: boolean;
};

export type AppSettings = {
  studyGoal: StudyGoalSettings;
  dailyMission: DailyMissionSettings;
  interestProfile: InterestProfileSettings;
  dictation: DictationSettings;
  review: ReviewSettings;
  readingSources: ReadingSourceSettings;
};

export type ReviewItem = {
  id: string;
  wordId: string;
  errorType: ErrorType;
  dueAt: string;
  intervalDays: number;
  ease: number;
  lastResult?: "again" | "hard" | "good" | "easy";
};

export type SynonymPair = {
  id: string;
  stemWord: string;
  targetSynonyms: string[];
  distractors: string[];
  topicTags: string[];
  difficulty: number;
  example: {
    questionStem: string;
    passagePhrase: string;
  };
};

export type ListeningSurvivalItem = {
  id: string;
  word: string;
  category: string;
  commonWrongSpellings: string[];
  audioText: string;
  difficulty: number;
  tip: string;
};

export type CollocationItem = {
  id: string;
  phrase: string;
  chineseMeaning: string;
  topicTags: string[];
  example: string;
};

export type SkillMetric = {
  label: string;
  value: number;
  helper: string;
};

export type KnowledgeRoute = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  interestTags: string[];
  recommendedLevel: "B1" | "B2" | "C1";
  missions: KnowledgeMission[];
};

export type KnowledgeMission = {
  id: string;
  routeId: string;
  title: string;
  subtitle: string;
  difficulty: 1 | 2 | 3;
  estimatedMinutes: number;
  themeWords: string[];
  targetSkills: (
    | "synonym"
    | "context"
    | "dictation"
    | "main_idea"
    | "tfng"
    | "word_family"
  )[];
  miniPassage: MiniPassage;
  knowledgeNote: KnowledgeNote;
};

export type MiniPassage = {
  id: string;
  title: string;
  text: string;
  level: "B1" | "B2" | "C1";
  wordCount: number;
  questions: MiniPassageQuestion[];
};

export type MiniPassageQuestion = {
  id: string;
  type: "synonym" | "main_idea" | "tfng" | "context_meaning";
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  targetWord?: string;
};

export type KnowledgeNote = {
  id: string;
  title: string;
  content: string;
  chineseSummary: string;
  relatedIELTSSkill: string;
};

export type SourceLicenseInfo = {
  sourceRepo: string;
  sourceUrl: string;
  licenseName?: string;
  licenseUrl?: string;
  licenseTextSnapshot?: string;
  crawledAt: string;
  commitSha?: string;
  branch?: string;
  attributionRequired?: boolean;
  notes?: string;
};

export type ReadingSource = {
  id: string;
  name: string;
  type: "github_repo" | "github_release" | "raw_url" | "local_folder";
  repoOwner?: string;
  repoName?: string;
  branch?: string;
  baseUrl: string;
  enabled: boolean;
  licenseInfo?: SourceLicenseInfo;
  allowedPaths: string[];
  allowedExtensions: string[];
  lastSyncedAt?: string;
};

export type ReadingRawFile = {
  id: string;
  sourceId: string;
  sourceRepo: string;
  sourcePath: string;
  sourceUrl: string;
  downloadUrl?: string;
  sha?: string;
  fileName: string;
  extension: ".epub" | ".pdf" | ".mobi" | ".txt" | ".md";
  sizeBytes?: number;
  magazine?: MagazineSourceName;
  issueDate?: string;
  downloadedAt: string;
  localPath: string;
  licenseInfo?: SourceLicenseInfo;
};

export type ReadingParagraph = {
  id: string;
  articleId: string;
  index: number;
  text: string;
  mainIdea?: string;
  functionTag?:
    | "background"
    | "claim"
    | "evidence"
    | "contrast"
    | "example"
    | "conclusion"
    | "problem"
    | "solution";
};

export type DifficultSentence = {
  id: string;
  articleId: string;
  paragraphId: string;
  sentence: string;
  structureNote: string;
  chineseExplanation: string;
  targetGrammar?: string[];
};

export type ReadingVocabularyItem = {
  id: string;
  articleId: string;
  paragraphId?: string;
  word: string;
  phrase?: string;
  chineseMeaning?: string;
  englishDefinition?: string;
  sourceSentence: string;
  synonyms: string[];
  topicTags: string[];
  skillTags: ("reading" | "listening")[];
  addToVocabularyQuest: boolean;
};

export type ReadingQuestion = {
  id: string;
  articleId: string;
  paragraphId?: string;
  type:
    | "main_idea"
    | "synonym"
    | "tfng"
    | "multiple_choice"
    | "detail_location"
    | "sentence_completion"
    | "author_attitude"
    | "paragraph_function";
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  evidenceText?: string;
  skillTags: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
};

export type ReadingArticle = {
  id: string;
  sourceFileId: string;
  title: string;
  subtitle?: string;
  author?: string;
  publication?: string;
  publishedAt?: string;
  issueDate?: string;
  sourceUrl?: string;
  sourcePath?: string;
  sourceLicense?: SourceLicenseInfo;
  topicTags: string[];
  interestRoute:
    | "society_ideas"
    | "technology_civilization"
    | "world_order_power"
    | "economics_globalization"
    | "science_environment"
    | "general";
  level: "B1" | "B2" | "C1";
  estimatedMinutes: number;
  wordCount: number;
  summary: string;
  paragraphs: ReadingParagraph[];
  keyVocabulary: ReadingVocabularyItem[];
  difficultSentences: DifficultSentence[];
  questions: ReadingQuestion[];
  importedAt: string;
  readingStatus?: "not_started" | "in_progress" | "completed";
};

export type IELTSTopicRoute =
  | "science_technology"
  | "art_culture"
  | "environment_nature"
  | "education_learning"
  | "health_lifestyle"
  | "work_business"
  | "cities_transport"
  | "media_communication"
  | "history_society"
  | "travel_daily_services";

export type MissionStage =
  | "mission_brief"
  | "vocabulary_loadout"
  | "listening_scene"
  | "reading_task"
  | "foreign_press_extension"
  | "debrief";

export type MissionSkill =
  | "vocabulary"
  | "dictation"
  | "spelling"
  | "synonym"
  | "main_idea"
  | "tfng"
  | "detail_location"
  | "sentence_completion"
  | "author_attitude"
  | "difficult_sentence"
  | "context_meaning"
  | "listening_details";

export type MissionVocabularyLoadoutItem = {
  id: string;
  word: string;
  chineseMeaning: string;
  englishDefinition: string;
  exampleSentence: string;
  synonyms: string[];
  collocations: string[];
  ieltsUsageNote: string;
  listeningRisk?: string;
};

export type MissionListeningItem = {
  id: string;
  prompt: string;
  answer: string;
  contextNote: string;
  audioId?: string;
  audioStart?: number;
  audioEnd?: number;
};

export type MissionReadingPassage = {
  id: string;
  title: string;
  text: string;
  questions: ReadingQuestion[];
};

export type IELTSMission = {
  id: string;
  title: string;
  topicRoute: IELTSTopicRoute;
  role: string;
  scenario: string;
  taskGoal: string;
  level: "B1" | "B2" | "C1";
  estimatedMinutes: number;
  targetSkills: MissionSkill[];
  vocabularyIds: string[];
  dictationItemIds: string[];
  readingArticleId?: string;
  foreignPressArticleId?: string;
  stages: MissionStage[];
  vocabularyLoadout: MissionVocabularyLoadoutItem[];
  listeningScene: {
    title: string;
    briefing: string;
    items: MissionListeningItem[];
  };
  readingTask: MissionReadingPassage;
  foreignPressExtension: {
    title: string;
    articleId?: string;
    excerpt: string;
    difficultSentence: DifficultSentence;
    authorViewpoint: string;
  };
};

export type AudioFileFormat = "mp3" | "m4a" | "wav" | "flac" | "aac" | "unknown";

export type TranscriptFormat = "txt" | "md" | "srt" | "vtt" | "json" | "csv" | "unknown";

export type AudioTrack = {
  id: string;
  title: string;
  fileName: string;
  extension: string;
  format: AudioFileFormat;
  absolutePath: string;
  relativePath: string;
  sizeBytes: number;
  modifiedAt: string;
  importedAt: string;
  durationSeconds?: number;
  sourceResourceId?: string;
  matchedTranscriptId?: string;
  topicTags: IELTSTopicRoute[];
  skillTags: ("listening" | "dictation" | "spelling")[];
  status: "indexed" | "matched" | "ready" | "needs_review";
  warnings: string[];
};

export type Transcript = {
  id: string;
  title: string;
  fileName: string;
  format: TranscriptFormat;
  absolutePath: string;
  relativePath: string;
  text: string;
  segments: TranscriptSegment[];
  matchedAudioId?: string;
  topicTags: IELTSTopicRoute[];
  skillTags: ("listening" | "reading" | "dictation")[];
  status: "indexed" | "parsed" | "matched" | "ready" | "needs_review";
  warnings: string[];
};

export type TranscriptSegment = {
  id: string;
  transcriptId: string;
  audioId?: string;
  index: number;
  startTime?: number;
  endTime?: number;
  speaker?: string;
  text: string;
};

export type DictationItem = {
  id: string;
  audioId?: string;
  transcriptId?: string;
  segmentId?: string;
  text: string;
  answer: string;
  acceptableAnswers?: string[];
  chineseMeaning?: string;
  audioStart?: number;
  audioEnd?: number;
  topicTags: IELTSTopicRoute[];
  skillTags: ("listening" | "dictation" | "spelling")[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  itemType: "word" | "phrase" | "sentence" | "number" | "date" | "address" | "name" | "form_field";
  source: "private_audio" | "private_transcript" | "vocabulary_fallback" | "sample";
  commonMistakes?: string[];
  status: "ready" | "needs_review";
  warnings: string[];
};

export type IELTSQuestionType =
  | "multiple_choice"
  | "matching"
  | "tfng"
  | "ynng"
  | "sentence_completion"
  | "summary_completion"
  | "table_completion"
  | "flow_chart_completion"
  | "diagram_labeling"
  | "short_answer"
  | "matching_headings"
  | "matching_information"
  | "matching_features"
  | "matching_sentence_endings"
  | "unknown";

export type ReadingPassage = {
  id: string;
  title: string;
  sourceResourceId?: string;
  sourceFileName?: string;
  sourcePath?: string;
  text: string;
  paragraphs: {
    id: string;
    index: number;
    label?: string;
    text: string;
    mainIdea?: string;
  }[];
  topicTags: IELTSTopicRoute[];
  skillTags: ("reading" | "vocabulary" | "review")[];
  level: "B1" | "B2" | "C1";
  wordCount: number;
  questions: string[];
  status: "ready" | "needs_review";
  warnings: string[];
};

export type IELTSReadingQuestion = {
  id: string;
  passageId?: string;
  sourceResourceId?: string;
  sourceFileName?: string;
  questionNumber?: number;
  questionType: IELTSQuestionType;
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  acceptableAnswers?: string[];
  evidenceText?: string;
  evidenceParagraphId?: string;
  explanation?: string;
  topicTags: IELTSTopicRoute[];
  skillTags: (
    | "main_idea"
    | "synonym"
    | "tfng"
    | "detail_location"
    | "sentence_completion"
    | "author_attitude"
    | "difficult_sentence"
    | "reading"
  )[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  status: "ready" | "needs_review";
  warnings: string[];
};

export type ReadingAnswerKey = {
  id: string;
  sourceResourceId?: string;
  sourceFileName?: string;
  passageId?: string;
  answers: {
    questionNumber: number;
    answer: string;
    alternativeAnswers?: string[];
  }[];
  status: "ready" | "needs_review";
  warnings: string[];
};
