import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readData, writeData } from "@/lib/store";
import { uploadDir, extFromDataUrl } from "@/lib/fileStorage";

const UPLOAD_DIR = uploadDir("hero");
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const SLOT_COUNT = 3;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const slot = Number(body?.slot);
  if (!Number.isInteger(slot) || slot < 0 || slot >= SLOT_COUNT) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const images = await readData<string[]>("hero");
  while (images.length < SLOT_COUNT) images.push("");

  if (body?.image === null) {
    images[slot] = "";
    await writeData("hero", images);
    return NextResponse.json(images);
  }

  const dataUrl = typeof body?.image === "string" ? body.image : null;
  const parsed = dataUrl ? extFromDataUrl(dataUrl) : null;
  if (!parsed) {
    return NextResponse.json({ error: "图片格式不支持" }, { status: 400 });
  }
  const buffer = Buffer.from(parsed.base64, "base64");
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: "图片太大了" }, { status: 400 });
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  for (const file of fs.readdirSync(UPLOAD_DIR)) {
    if (file.startsWith(`slide-${slot}-`)) {
      fs.unlinkSync(path.join(UPLOAD_DIR, file));
    }
  }
  const filename = `slide-${slot}-${Date.now()}.${parsed.ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

  images[slot] = `/api/uploads/hero/${filename}`;
  await writeData("hero", images);
  return NextResponse.json(images);
}
