import { fallbackMission } from "@/data/fallback-mission";
import { ieltsMissions } from "@/data/ielts-missions.sample";
import type { IELTSMission, MissionStage } from "@/lib/types";

const allowedStages: MissionStage[] = [
  "mission_brief",
  "vocabulary_loadout",
  "listening_scene",
  "reading_task",
  "foreign_press_extension",
  "debrief",
];

function nonEmptyArray<T>(value: T[] | undefined, fallback: T[]): T[] {
  return Array.isArray(value) && value.length ? value : fallback;
}

function validStages(value: MissionStage[] | undefined): MissionStage[] {
  const stages = nonEmptyArray(value, fallbackMission.stages).filter((stage) => allowedStages.includes(stage));
  return stages.length ? stages : fallbackMission.stages;
}

export function getSafeTodayMission(): IELTSMission {
  const mission = ieltsMissions[0] ?? fallbackMission;
  return normalizeMission(mission);
}

export function isFallbackMission(mission: IELTSMission): boolean {
  return mission.id === fallbackMission.id;
}

export function normalizeMission(mission: Partial<IELTSMission> | undefined | null): IELTSMission {
  const source = mission ?? {};
  const listeningScene = source.listeningScene ?? fallbackMission.listeningScene;
  const readingTask = source.readingTask ?? fallbackMission.readingTask;
  const foreignPressExtension = source.foreignPressExtension ?? fallbackMission.foreignPressExtension;

  return {
    ...fallbackMission,
    ...source,
    targetSkills: nonEmptyArray(source.targetSkills, fallbackMission.targetSkills),
    vocabularyIds: nonEmptyArray(source.vocabularyIds, fallbackMission.vocabularyIds),
    dictationItemIds: nonEmptyArray(source.dictationItemIds, fallbackMission.dictationItemIds),
    stages: validStages(source.stages),
    vocabularyLoadout: nonEmptyArray(source.vocabularyLoadout, fallbackMission.vocabularyLoadout),
    listeningScene: {
      ...fallbackMission.listeningScene,
      ...listeningScene,
      items: nonEmptyArray(listeningScene.items, fallbackMission.listeningScene.items),
    },
    readingTask: {
      ...fallbackMission.readingTask,
      ...readingTask,
      text: readingTask.text || fallbackMission.readingTask.text,
      questions: nonEmptyArray(readingTask.questions, fallbackMission.readingTask.questions),
    },
    foreignPressExtension: {
      ...fallbackMission.foreignPressExtension,
      ...foreignPressExtension,
      difficultSentence: foreignPressExtension.difficultSentence ?? fallbackMission.foreignPressExtension.difficultSentence,
      authorViewpoint: foreignPressExtension.authorViewpoint || fallbackMission.foreignPressExtension.authorViewpoint,
    },
  };
}
