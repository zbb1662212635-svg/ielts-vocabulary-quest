import { fallbackMission } from "@/data/fallback-mission";
import { ieltsMissions } from "@/data/ielts-missions.sample";
import type { IELTSMission } from "@/lib/types";

export function getSafeTodayMission(): IELTSMission {
  const mission = ieltsMissions[0] ?? fallbackMission;
  return normalizeMission(mission);
}

export function isFallbackMission(mission: IELTSMission): boolean {
  return mission.id === fallbackMission.id;
}

export function normalizeMission(mission: Partial<IELTSMission>): IELTSMission {
  return {
    ...fallbackMission,
    ...mission,
    stages: mission.stages && mission.stages.length ? mission.stages : fallbackMission.stages,
    vocabularyLoadout:
      mission.vocabularyLoadout && mission.vocabularyLoadout.length
        ? mission.vocabularyLoadout
        : fallbackMission.vocabularyLoadout,
    listeningScene: mission.listeningScene ?? fallbackMission.listeningScene,
    readingTask: mission.readingTask ?? fallbackMission.readingTask,
    foreignPressExtension: mission.foreignPressExtension ?? fallbackMission.foreignPressExtension,
  };
}
