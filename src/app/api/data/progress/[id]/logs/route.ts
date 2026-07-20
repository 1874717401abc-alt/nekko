import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { updateDataItem } from "@/lib/store";
import { createProgressLog } from "@/lib/resourceRules";
import type { ProgressTask } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const result = createProgressLog(body as Record<string, unknown>, user);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { id } = await params;
  const updated = updateDataItem<ProgressTask>("progress", id, (task) => ({
    ...task,
    logs: [...(task.logs ?? []), result.item],
  }));

  if (!updated) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  recordActivity({
    type: "log",
    resource: "progress",
    resourceId: updated.id,
    title: updated.title,
    projectId: updated.projectId,
    user,
  });

  return NextResponse.json(result.item, { status: 201 });
}
