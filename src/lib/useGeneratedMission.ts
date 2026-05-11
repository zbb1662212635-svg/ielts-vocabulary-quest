"use client";

import { useEffect, useState } from "react";
import { getSafeTodayMission } from "./missionLoader";
import type { MissionGenerationResult } from "./missionEngine";

export function useGeneratedMission() {
  const [data, setData] = useState<MissionGenerationResult>({
    mission: getSafeTodayMission(),
    warnings: [],
    usedFallbacks: ["client_initial_sample"],
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/today-mission")
      .then((response) => response.json())
      .then((payload: MissionGenerationResult) => {
        if (!cancelled && payload?.mission) setData(payload);
      })
      .catch(() => {
        if (!cancelled) {
          setData({
            mission: getSafeTodayMission(),
            warnings: ["Mission engine failed; using sample mission."],
            usedFallbacks: ["sample_mission_fallback"],
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
