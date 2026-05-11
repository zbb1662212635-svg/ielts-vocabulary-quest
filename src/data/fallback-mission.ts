import type { IELTSMission } from "@/lib/types";

export const fallbackMission: IELTSMission = {
  id: "fallback_mission",
  title: "Sample IELTS Mission",
  topicRoute: "travel_daily_services",
  role: "New international student",
  scenario: "You need to understand a short accommodation notice and complete a simple IELTS-style learning task.",
  taskGoal: "Use this sample mission to confirm the learning flow is working from start to finish.",
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
      ieltsUsageNote: "Listening Part 1 高频拼写词，注意 double c and double m。",
      listeningRisk: "Double c and double m.",
    },
  ],
  listeningScene: {
    title: "Accommodation call",
    briefing: "Listen and type the keyword you hear.",
    items: [
      {
        id: "fallback_listen_accommodation",
        prompt: "Type the housing keyword.",
        answer: "accommodation",
        contextNote: "High-risk spelling word.",
      },
    ],
  },
  readingTask: {
    id: "fallback_reading",
    title: "Accommodation Notice",
    text:
      "Students must submit their accommodation application before 31 July. A refundable deposit is required after a room has been accepted.",
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
      structureNote: "when 引导时间/条件状语，说明住房变紧张的原因。",
      chineseExplanation: "当需求增长快于可负担房源供给时，学生住房常常会变得紧张。",
    },
    authorViewpoint: "The writer sees student housing as a problem of demand and limited supply.",
  },
};
