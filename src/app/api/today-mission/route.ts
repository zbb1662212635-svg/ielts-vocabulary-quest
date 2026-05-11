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
