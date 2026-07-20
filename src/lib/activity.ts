import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import type { ActivityEvent, ActivityType, User } from "@/lib/types";

const MAX_ACTIVITY = 300;

const resourceLabels: Record<string, string> = {
  projects: "项目",
  progress: "任务",
  inspiration: "灵感",
  library: "资料",
  checkins: "打卡",
};

const actionLabels: Record<ActivityType, string> = {
  create: "新建了",
  update: "更新了",
  delete: "删除了",
  log: "记录了进度",
  comment: "评论了",
  checkin: "完成了",
};

type ActivityInput = {
  type: ActivityType;
  resource: string;
  resourceId?: string;
  title?: string;
  summary?: string;
  projectId?: string;
  user: User | Pick<User, "id" | "displayName">;
};

function readActivity(): ActivityEvent[] {
  const db = getDb();
  const row = db
    .prepare("SELECT data FROM app_data WHERE resource = 'activity'")
    .get() as { data: string } | undefined;
  if (!row) return [];
  try {
    const parsed = JSON.parse(row.data);
    return Array.isArray(parsed) ? (parsed as ActivityEvent[]) : [];
  } catch {
    return [];
  }
}

function titleFromItem(item: Record<string, unknown>): string {
  for (const key of ["title", "name", "note"]) {
    if (typeof item[key] === "string" && item[key].trim()) return item[key].trim();
  }
  return "未命名";
}

function projectIdFromItem(item: Record<string, unknown>): string | undefined {
  return typeof item.projectId === "string" ? item.projectId : undefined;
}

export function recordActivity(input: ActivityInput): ActivityEvent {
  const label = resourceLabels[input.resource] ?? input.resource;
  const title = input.title ?? label;
  const summary =
    input.summary ??
    `${input.user.displayName} ${actionLabels[input.type]}${label}「${title}」`;
  const event: ActivityEvent = {
    id: `activity-${randomUUID()}`,
    type: input.type,
    resource: input.resource,
    resourceId: input.resourceId,
    title,
    summary,
    userId: input.user.id,
    memberName: input.user.displayName,
    projectId: input.projectId,
    createdAt: new Date().toISOString(),
  };

  const db = getDb();
  const next = [event, ...readActivity()].slice(0, MAX_ACTIVITY);
  db.prepare(
    `INSERT INTO app_data (resource, data) VALUES ('activity', ?)
     ON CONFLICT(resource) DO UPDATE SET data = excluded.data`
  ).run(JSON.stringify(next));
  return event;
}

export function recordItemActivity(
  type: ActivityType,
  resource: string,
  item: Record<string, unknown>,
  user: User
) {
  recordActivity({
    type,
    resource,
    resourceId: typeof item.id === "string" ? item.id : undefined,
    title: titleFromItem(item),
    projectId: projectIdFromItem(item),
    user,
  });
}
