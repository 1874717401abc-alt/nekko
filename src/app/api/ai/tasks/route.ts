import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAndRunAgentTask, listAgentTaskRuns } from "@/lib/agentTasks";
import type { AiMode } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  return NextResponse.json({ runs: listAgentTaskRuns(user.id) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const prompt =
    body && typeof body === "object" && typeof body.prompt === "string"
      ? body.prompt.trim().slice(0, 5000)
      : "";
  if (!prompt) {
    return NextResponse.json({ error: "任务内容不能为空。" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  try {
    const run = await createAndRunAgentTask({
      prompt,
      mode: cleanMode(body && typeof body === "object" ? body.mode : undefined),
      user,
      signal: controller.signal,
    });
    return NextResponse.json({ run }, { status: 201 });
  } finally {
    clearTimeout(timeout);
  }
}
