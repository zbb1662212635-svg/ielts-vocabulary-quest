import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import type { ResourceIndex } from "@/lib/resourceTypes";

export function GET() {
  const indexPath = path.join(process.cwd(), "data", "private", "resources.index.json");
  if (!fs.existsSync(indexPath)) {
    return NextResponse.json<ResourceIndex>({
      metadata: {
        resourceRoot: "",
        scannedAt: "",
        count: 0,
        generatedBy: "missing",
      },
      items: [],
    });
  }

  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(indexPath, "utf8")) as ResourceIndex);
  } catch {
    return NextResponse.json<ResourceIndex>({
      metadata: {
        resourceRoot: "",
        scannedAt: "",
        count: 0,
        generatedBy: "invalid",
      },
      items: [],
    });
  }
}
