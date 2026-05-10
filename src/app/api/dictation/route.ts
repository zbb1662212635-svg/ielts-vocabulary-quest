import { NextResponse } from "next/server";
import { getDictationItems } from "@/lib/audioLoader";

export function GET() {
  return NextResponse.json({
    source: "private_or_sample",
    items: getDictationItems(),
  });
}
