import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAiConversation, listAiConversations } from "@/lib/aiConversations";
import type { AiMode } from "@/lib/types";

export const dynamic = "force-dynamic";

const modes = new Set<AiMode>(["strategy", "content", "review", "deep"]);

function cleanMode(value: unknown): AiMode {
  return typeof value === "string" && modes.has(value as AiMode)
    ? (value as AiMode)
    : "strategy";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  return NextResponse.json({ conversations: listAiConversations(user.id) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const title =
    typeof (body as Record<string, unknown> | null)?.title === "string"
      ? ((body as Record<string, unknown>).title as string)
      : "新的 AI 对话";
  const mode = cleanMode((body as Record<string, unknown> | null)?.mode);
  const conversation = createAiConversation({ userId: user.id, title, mode });

  return NextResponse.json({ conversation });
}
