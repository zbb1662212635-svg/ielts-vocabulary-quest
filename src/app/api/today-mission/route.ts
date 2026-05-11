import { NextResponse } from "next/server";
import { generateTodayMission } from "@/lib/missionEngine";

export function GET() {
  const result = generateTodayMission({
    dailyMinutes: 25,
    includeReview: true,
    includeScenarioReading: true,
  });

  return NextResponse.json(result);
}
