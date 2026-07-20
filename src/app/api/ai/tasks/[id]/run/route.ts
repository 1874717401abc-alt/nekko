import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { executeAgentTaskRun } from "@/lib/agentTasks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  try {
    const run = await executeAgentTaskRun(id, user, controller.signal);
    if (!run) {
      return NextResponse.json({ error: "任务不存在。" }, { status: 404 });
    }

    return NextResponse.json({ run });
  } finally {
    clearTimeout(timeout);
  }
}
