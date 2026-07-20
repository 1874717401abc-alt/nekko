import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { extractAttachmentFromFile } from "@/lib/aiSources";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "没有收到文件。" }, { status: 400 });
  }

  try {
    const attachment = await extractAttachmentFromFile(file);
    return NextResponse.json({ attachment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "文件解析失败。" },
      { status: 400 }
    );
  }
}
