import { NextResponse } from "next/server";
import { getContentGraph } from "@/lib/contentGraphLoader";

export function GET() {
  return NextResponse.json(getContentGraph());
}
