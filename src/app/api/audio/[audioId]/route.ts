import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAudioTracks } from "@/lib/audioLoader";
import { getResourceRoot, normalizeResourcePath } from "@/lib/resourcePaths";

const mimeByExtension: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
};

export async function GET(request: Request, context: { params: Promise<{ audioId: string }> }) {
  const { audioId } = await context.params;
  const audio = getAudioTracks().find((item) => item.id === audioId);
  if (!audio) return NextResponse.json({ error: "Audio not found" }, { status: 404 });

  const root = normalizeResourcePath(getResourceRoot());
  const audioPath = normalizeResourcePath(audio.absolutePath);
  if (!audioPath.startsWith(root) || !fs.existsSync(audioPath)) {
    return NextResponse.json({ error: "Audio file is unavailable" }, { status: 404 });
  }

  const stat = fs.statSync(audioPath);
  const range = request.headers.get("range");
  const contentType = mimeByExtension[path.extname(audioPath).toLowerCase()] ?? "application/octet-stream";

  if (range) {
    const [startText, endText] = range.replace(/bytes=/, "").split("-");
    const start = Number.parseInt(startText, 10);
    const end = endText ? Number.parseInt(endText, 10) : stat.size - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
      return new Response(null, { status: 416 });
    }
    const stream = fs.createReadStream(audioPath, { start, end });
    return new Response(stream as unknown as BodyInit, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  const stream = fs.createReadStream(audioPath);
  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Accept-Ranges": "bytes",
    },
  });
}
