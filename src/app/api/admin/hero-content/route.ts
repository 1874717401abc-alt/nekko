import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { writeData } from "@/lib/store";
import { mergeHeroContent } from "@/lib/heroContent";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || !Array.isArray(body.slides) || body.slides.length !== 3) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const content = mergeHeroContent(body);
  await writeData("heroContent", content);
  return NextResponse.json(content);
}
