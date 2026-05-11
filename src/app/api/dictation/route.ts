import { NextResponse } from "next/server";
import { getDictationItems } from "@/lib/audioLoader";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const items = getDictationItems();
    return NextResponse.json({
      source: items.some((item) => item.source !== "sample") ? "private_or_sample" : "sample",
      metadata: { count: items.length, generatedAt: new Date().toISOString() },
      items,
    });
  } catch (error) {
    console.warn("Dictation API failed.", error);
    return NextResponse.json({ source: "sample_fallback", metadata: { count: 0 }, items: [] });
  }
}
