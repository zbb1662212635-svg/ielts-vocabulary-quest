import type { IELTSMission, IELTSTopicRoute } from "@/lib/types";

export const topicRouteLabels: Record<IELTSTopicRoute, { title: string; subtitle: string }> = {
  science_technology: { title: "Science & Technology", subtitle: "科学与技术" },
  art_culture: { title: "Art & Culture", subtitle: "艺术与文化" },
  environment_nature: { title: "Environment & Nature", subtitle: "环境与自然" },
  education_learning: { title: "Education & Learning", subtitle: "教育与学习" },
  health_lifestyle: { title: "Health & Lifestyle", subtitle: "健康与生活方式" },
  work_business: { title: "Work & Business", subtitle: "工作与商业" },
  cities_transport: { title: "Cities & Transport", subtitle: "城市与交通" },
  media_communication: { title: "Media & Communication", subtitle: "媒体与交流" },
  history_society: { title: "History & Society", subtitle: "历史与社会" },
  travel_daily_services: { title: "Travel & Daily Services", subtitle: "旅行与日常服务" },
};

const standardStages: IELTSMission["stages"] = [
  "mission_brief",
  "vocabulary_loadout",
  "listening_scene",
  "reading_task",
  "foreign_press_extension",
  "debrief",
];

export const ieltsMissions: IELTSMission[] = [
  {
    id: "finding_student_accommodation",
    title: "Finding Student Accommodation",
    topicRoute: "travel_daily_services",
    role: "New international student",
    scenario:
      "You have just arrived at a university in the UK. You need to call the accommodation office, understand housing rules, and complete your application.",
    taskGoal: "完成住宿申请：听懂关键信息，读懂住宿规则，并准确记录日期、押金和设施信息。",
    level: "B1",
    estimatedMinutes: 22,
    targetSkills: ["vocabulary", "dictation", "spelling", "detail_location", "sentence_completion"],
    vocabularyIds: ["accommodation", "deposit", "facility", "contract"],
    dictationItemIds: ["accommodation", "deposit", "laundry"],
    readingArticleId: "mission_reading_accommodation",
    foreignPressArticleId: "mission_fp_accommodation",
    stages: standardStages,
    vocabularyLoadout: [
      {
        id: "mv_accommodation",
        word: "accommodation",
        chineseMeaning: "住宿；住处",
        englishDefinition: "a place where someone lives or stays",
        exampleSentence: "Students must apply for accommodation before the end of July.",
        synonyms: ["housing", "lodging"],
        collocations: ["student accommodation", "temporary accommodation"],
        ieltsUsageNote: "Listening Part 1 高频拼写词，注意 double c and double m。",
        listeningRisk: "Double c and double m.",
      },
      {
        id: "mv_deposit",
        word: "deposit",
        chineseMeaning: "押金；订金",
        englishDefinition: "money paid in advance to secure a room or service",
        exampleSentence: "A deposit of 200 pounds is required when the contract is signed.",
        synonyms: ["advance payment"],
        collocations: ["pay a deposit", "refundable deposit"],
        ieltsUsageNote: "常和金额、日期一起出现，适合训练听力细节定位。",
      },
      {
        id: "mv_facility",
        word: "facility",
        chineseMeaning: "设施；设备",
        englishDefinition: "a service or place provided for a particular purpose",
        exampleSentence: "The hall has shared kitchen facilities and a laundry room.",
        synonyms: ["service", "amenity"],
        collocations: ["shared facilities", "sports facilities"],
        ieltsUsageNote: "Reading 中常被 amenity 或 service 替换。",
      },
    ],
    listeningScene: {
      title: "Calling the accommodation office",
      briefing: "You are listening to a housing officer explain application details. Type the key word you hear.",
      items: [
        {
          id: "ml_accommodation",
          prompt: "Type the housing keyword.",
          answer: "accommodation",
          contextNote: "High-risk spelling word: double c and double m.",
        },
        {
          id: "ml_deposit",
          prompt: "Type the payment keyword.",
          answer: "deposit",
          contextNote: "Often appears with an amount.",
        },
        {
          id: "ml_laundry",
          prompt: "Type the facility keyword.",
          answer: "laundry",
          contextNote: "Common student housing facility.",
        },
      ],
    },
    readingTask: {
      id: "mission_reading_accommodation",
      title: "University Housing Rules",
      text:
        "Students who want university accommodation must submit an online application before 31 July. Rooms are offered in the order in which applications are received, although priority is given to first-year international students. A refundable deposit is required after a room has been accepted. The deposit will be returned at the end of the contract if no damage is found. Each hall provides shared kitchen facilities, laundry rooms and study areas. Visitors are allowed before 10 p.m., but overnight guests must be registered with the accommodation office.",
      questions: [
        {
          id: "mq_acc_1",
          articleId: "mission_reading_accommodation",
          type: "detail_location",
          prompt: "When must students submit the accommodation application?",
          options: ["Before 31 July", "After 10 p.m.", "At the end of the contract", "During the first week of class"],
          correctAnswer: "Before 31 July",
          explanation: "The date is explicitly stated in the first sentence.",
          evidenceText: "Students who want university accommodation must submit an online application before 31 July.",
          skillTags: ["detail location"],
          difficulty: 1,
        },
        {
          id: "mq_acc_2",
          articleId: "mission_reading_accommodation",
          type: "sentence_completion",
          prompt: "The deposit is returned if no ____ is found.",
          options: ["damage", "visitor", "application", "priority"],
          correctAnswer: "damage",
          explanation: "This is a direct sentence completion from the housing rules.",
          evidenceText: "The deposit will be returned at the end of the contract if no damage is found.",
          skillTags: ["sentence completion"],
          difficulty: 1,
        },
      ],
    },
    foreignPressExtension: {
      title: "Housing and student mobility",
      articleId: "mission_fp_accommodation",
      excerpt:
        "In many university towns, student housing has become a pressure point. Demand rises quickly at the beginning of the academic year, while the supply of affordable rooms changes slowly.",
      difficultSentence: {
        id: "fp_acc_s1",
        articleId: "mission_fp_accommodation",
        paragraphId: "fp_acc_p1",
        sentence:
          "Demand rises quickly at the beginning of the academic year, while the supply of affordable rooms changes slowly.",
        structureNote: "while 表示对比：需求快速上升，但供给变化缓慢。",
        chineseExplanation: "学年开始时，学生住房需求迅速增加，而可负担房间的供给增长很慢。",
      },
      authorViewpoint: "The writer treats student housing as a practical pressure caused by demand and limited supply.",
    },
  },
];

export function getTodayIELTSMission() {
  return ieltsMissions[0];
}

export function getIELTSMission(id: string) {
  return ieltsMissions.find((mission) => mission.id === id);
}
