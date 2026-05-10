import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getLiveResourceHealth } from "@/lib/resourcePaths";
import type { ResourceHealth } from "@/lib/resourceTypes";

export function GET() {
  const healthPath = path.join(process.cwd(), "data", "private", "resource-health.json");
  if (fs.existsSync(healthPath)) {
    try {
      return NextResponse.json(JSON.parse(fs.readFileSync(healthPath, "utf8")) as ResourceHealth);
    } catch {
      return NextResponse.json(getLiveResourceHealth());
    }
  }
  return NextResponse.json(getLiveResourceHealth());
}
