import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  deleteAiConversation,
  getAiConversation,
  listAiMessages,
} from "@/lib/aiConversations";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const conversation = getAiConversation(id, user.id);
  if (!conversation) {
    return NextResponse.json({ error: "对话不存在。" }, { status: 404 });
  }

  return NextResponse.json({
    conversation,
    messages: listAiMessages(conversation.id, user.id),
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const ok = deleteAiConversation(id, user.id);
  if (!ok) {
    return NextResponse.json({ error: "对话不存在。" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
