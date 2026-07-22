import { open, stat } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listDataItems } from "@/lib/store";
import type { ProjectAsset } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "project-assets");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { filename } = await params;
  if (filename !== path.basename(filename)) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
  const asset = listDataItems<ProjectAsset>("assets").find((item) => item.storedName === filename);
  if (!asset) return NextResponse.json({ error: "文件不存在" }, { status: 404 });

  const filePath = path.join(UPLOAD_DIR, filename);
  try {
    const info = await stat(filePath);
    const range = req.headers.get("range");
    let start = 0;
    let end = info.size - 1;
    let status = 200;
    if (range) {
      const match = range.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        start = match[1] ? Number(match[1]) : 0;
        end = match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
        status = 206;
      }
    }
    if (start < 0 || end < start || start >= info.size) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    }
    const handle = await open(filePath, "r");
    try {
      const buffer = Buffer.alloc(end - start + 1);
      await handle.read(buffer, 0, buffer.length, start);
      return new NextResponse(buffer, {
        status,
        headers: {
          "Content-Type": asset.mimeType,
          "Content-Length": String(buffer.length),
          "Accept-Ranges": "bytes",
          "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(asset.fileName)}`,
          ...(status === 206 ? { "Content-Range": `bytes ${start}-${end}/${info.size}` } : {}),
        },
      });
    } finally {
      await handle.close();
    }
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
}
