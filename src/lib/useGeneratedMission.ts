"use client";

import { useEffect, useState } from "react";
import { getSafeTodayMission } from "./missionLoader";
import type { MissionGenerationResult } from "./missionEngine";

function fallbackMissionResult(reason = "Mission engine failed; using sample mission."): MissionGenerationResult {
  return {
    mission: getSafeTodayMission(),
    warnings: [reason],
    usedFallbacks: ["sample_mission_fallback"],
  };
}

function isValidMissionResult(value: unknown): value is MissionGenerationResult {
  if (!value || typeof value !== "object") return false;
  const mission = (value as { mission?: { stages?: unknown } }).mission;
  return Boolean(mission && Array.isArray(mission.stages) && mission.stages.length);
}

export function useGeneratedMission() {
  const [data, setData] = useState<MissionGenerationResult>({
    mission: getSafeTodayMission(),
    warnings: [],
    usedFallbacks: ["client_initial_sample"],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadMission() {
      try {
        const response = await fetch("/api/today-mission");
        if (!response.ok) throw new Error(`Mission API failed: ${response.status}`);

        const payload: unknown = await response.json();
        if (!cancelled) {
          setData(isValidMissionResult(payload) ? payload : fallbackMissionResult("Mission API returned an invalid payload."));
        }
      } catch (error) {
        console.warn("Mission generation failed. Falling back to sample mission.", error);
        if (!cancelled) setData(fallbackMissionResult());
      }
    }

    loadMission();

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
