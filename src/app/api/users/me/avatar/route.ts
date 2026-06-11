import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateUserAvatar } from "@/lib/users";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "avatars");
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const dataUrl = typeof body?.image === "string" ? body.image : null;
  const match = dataUrl?.match(/^data:image\/jpeg;base64,(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "图片格式不支持" }, { status: 400 });
  }

  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: "图片太大了" }, { status: 400 });
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  // Remove any previous avatar files for this user before writing the new one.
  for (const file of fs.readdirSync(UPLOAD_DIR)) {
    if (file.startsWith(`${user.id}-`)) {
      fs.unlinkSync(path.join(UPLOAD_DIR, file));
    }
  }

  const filename = `${user.id}-${Date.now()}.jpg`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

  const avatarUrl = `/api/avatars/${filename}`;
  const updated = updateUserAvatar(user.id, avatarUrl);
  return NextResponse.json(updated);
}
