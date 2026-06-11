import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { uploadDir, CONTENT_TYPES } from "@/lib/fileStorage";

const UPLOAD_DIR = uploadDir("hero");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const match = filename.match(/^[\w-]+\.(jpg|jpeg|png|webp)$/);
  if (!match) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  try {
    const data = fs.readFileSync(path.join(UPLOAD_DIR, filename));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[match[1]],
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
