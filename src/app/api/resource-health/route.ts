import { NextResponse } from "next/server";
import { getResourceHealth } from "@/lib/resourcePaths";

export function GET() {
  return NextResponse.json(getResourceHealth());
}
