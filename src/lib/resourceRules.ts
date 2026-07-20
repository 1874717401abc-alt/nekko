import { randomUUID } from "crypto";
import type {
  CheckIn,
  InspirationItem,
  LibraryItem,
  ProgressComment,
  ProgressLogEntry,
  ProgressTask,
  Project,
  TaskPriority,
  TaskStatus,
  User,
} from "@/lib/types";
import type { ItemResourceName, ResourceItem } from "@/lib/store";

type Body = Record<string, unknown>;
type RuleResult<T extends { id: string }> = { item: T } | { error: string; status: number };

const TASK_STATUSES: TaskStatus[] = ["todo", "doing", "done"];
const TASK_PRIORITIES: TaskPriority[] = ["low", "normal", "high"];

function text(body: Body, key: string): string {
  return typeof body[key] === "string" ? body[key].trim() : "";
}

function optionalText(body: Body, key: string): string | undefined {
  const value = text(body, key);
  return value || undefined;
}

function stringList(body: Body, key: string): string[] {
  if (!Array.isArray(body[key])) return [];
  return body[key]
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function projectId(body: Body): string | undefined {
  return optionalText(body, "projectId");
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function bad(message: string, status = 400) {
  return { error: message, status };
}

function taskStatus(value: unknown): TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus) ? (value as TaskStatus) : "todo";
}

function taskPriority(value: unknown): TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority) ? (value as TaskPriority) : "normal";
}

function dueDate(body: Body): string | undefined {
  const value = optionalText(body, "dueDate");
  if (!value) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function ensureUrl(value: string | undefined, required: boolean): RuleResult<ResourceItem> | null {
  if (!value) return required ? bad("请填写链接地址") : null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return bad("链接地址需要以 http:// 或 https:// 开头");
    }
  } catch {
    return bad("链接地址格式不正确");
  }
  return null;
}

export function createResourceItem(
  resource: ItemResourceName,
  body: Body,
  user: User
): RuleResult<ResourceItem> {
  if (resource === "projects") {
    const name = text(body, "name");
    if (!name) return bad("项目名称不能为空");
    return {
      item: {
        id: `proj-${randomUUID()}`,
        name,
        description: optionalText(body, "description"),
        tags: stringList(body, "tags"),
        createdAt: new Date().toISOString(),
        createdBy: user.displayName,
        createdById: user.id,
      } satisfies Project,
    };
  }

  if (resource === "progress") {
    const title = text(body, "title");
    if (!title) return bad("任务名称不能为空");
    return {
      item: {
        id: `task-${randomUUID()}`,
        title,
        description: optionalText(body, "description"),
        status: taskStatus(body.status),
        priority: taskPriority(body.priority),
        dueDate: dueDate(body),
        assignee: optionalText(body, "assignee") ?? "未分配",
        createdAt: new Date().toISOString(),
        createdBy: user.displayName,
        createdById: user.id,
        projectId: projectId(body),
        logs: [],
        comments: [],
      } satisfies ProgressTask,
    };
  }

  if (resource === "inspiration") {
    const title = text(body, "title");
    const type = body.type === "link" || body.type === "image" ? body.type : "note";
    const url = optionalText(body, "url");
    if (!title) return bad("标题不能为空");
    const urlError = ensureUrl(url, type === "link" || type === "image");
    if (urlError) return urlError;
    return {
      item: {
        id: `insp-${randomUUID()}`,
        title,
        type,
        url,
        note: optionalText(body, "note"),
        tags: stringList(body, "tags"),
        createdAt: new Date().toISOString(),
        createdBy: user.displayName,
        createdById: user.id,
        projectId: projectId(body),
      } satisfies InspirationItem,
    };
  }

  if (resource === "library") {
    const title = text(body, "title");
    const url = optionalText(body, "url");
    if (!title) return bad("标题不能为空");
    const urlError = ensureUrl(url, true);
    if (urlError) return urlError;
    return {
      item: {
        id: `lib-${randomUUID()}`,
        title,
        type: body.type === "video" ? "video" : "doc",
        url: url!,
        category: optionalText(body, "category") ?? "未分类",
        note: optionalText(body, "note"),
        addedAt: new Date().toISOString(),
        createdBy: user.displayName,
        createdById: user.id,
        projectId: projectId(body),
      } satisfies LibraryItem,
    };
  }

  const note = optionalText(body, "note");
  return {
    item: {
      id: `checkin-${randomUUID()}`,
      userId: user.id,
      memberName: user.displayName,
      date: todayKey(),
      time: new Date().toISOString(),
      note,
    } satisfies CheckIn,
  };
}

export function patchResourceItem(
  resource: ItemResourceName,
  item: ResourceItem,
  body: Body
): RuleResult<ResourceItem> {
  if (resource === "projects") {
    const existing = item as Project;
    const name = text(body, "name") || existing.name;
    return {
      item: {
        ...existing,
        name,
        description: "description" in body ? optionalText(body, "description") : existing.description,
        tags: "tags" in body ? stringList(body, "tags") : existing.tags,
      } satisfies Project,
    };
  }

  if (resource === "progress") {
    const existing = item as ProgressTask;
    const title = "title" in body ? text(body, "title") : existing.title;
    if (!title) return bad("任务名称不能为空");
    return {
      item: {
        ...existing,
        title,
        description: "description" in body ? optionalText(body, "description") : existing.description,
        status: "status" in body ? taskStatus(body.status) : existing.status,
        priority: "priority" in body ? taskPriority(body.priority) : existing.priority,
        dueDate: "dueDate" in body ? dueDate(body) : existing.dueDate,
        assignee:
          "assignee" in body ? optionalText(body, "assignee") ?? "未分配" : existing.assignee,
        projectId: "projectId" in body ? projectId(body) : existing.projectId,
      } satisfies ProgressTask,
    };
  }

  if (resource === "inspiration") {
    const existing = item as InspirationItem;
    const type =
      body.type === "link" || body.type === "image" || body.type === "note"
        ? body.type
        : existing.type;
    const title = "title" in body ? text(body, "title") : existing.title;
    if (!title) return bad("标题不能为空");
    const url = "url" in body ? optionalText(body, "url") : existing.url;
    const urlError = ensureUrl(url, type === "link" || type === "image");
    if (urlError) return urlError;
    return {
      item: {
        ...existing,
        title,
        type,
        url,
        note: "note" in body ? optionalText(body, "note") : existing.note,
        tags: "tags" in body ? stringList(body, "tags") : existing.tags,
        projectId: "projectId" in body ? projectId(body) : existing.projectId,
      } satisfies InspirationItem,
    };
  }

  if (resource === "library") {
    const existing = item as LibraryItem;
    const title = "title" in body ? text(body, "title") : existing.title;
    const url = "url" in body ? optionalText(body, "url") : existing.url;
    if (!title) return bad("标题不能为空");
    const urlError = ensureUrl(url, true);
    if (urlError) return urlError;
    return {
      item: {
        ...existing,
        title,
        type: body.type === "video" ? "video" : body.type === "doc" ? "doc" : existing.type,
        url: url!,
        category:
          "category" in body ? optionalText(body, "category") ?? "未分类" : existing.category,
        note: "note" in body ? optionalText(body, "note") : existing.note,
        projectId: "projectId" in body ? projectId(body) : existing.projectId,
      } satisfies LibraryItem,
    };
  }

  return bad("打卡记录不支持编辑", 405);
}

export function canUpdateResourceItem(resource: ItemResourceName, item: ResourceItem, user: User) {
  if (user.isAdmin) return true;
  if (resource === "checkins") return item.userId === user.id;
  return true;
}

export function canDeleteResourceItem(resource: ItemResourceName, item: ResourceItem, user: User) {
  if (user.isAdmin) return true;
  if (resource === "checkins") return item.userId === user.id;
  return item.createdById === user.id || item.createdBy === user.displayName;
}

export function createProgressLog(body: Body, user: User): RuleResult<ProgressLogEntry> {
  const content = text(body, "content");
  if (!content) return bad("进度内容不能为空");
  return {
    item: {
      id: `log-${randomUUID()}`,
      userId: user.id,
      memberName: user.displayName,
      content,
      createdAt: new Date().toISOString(),
    },
  };
}

export function createProgressComment(body: Body, user: User): RuleResult<ProgressComment> {
  const content = text(body, "content");
  if (!content) return bad("评论内容不能为空");
  return {
    item: {
      id: `comment-${randomUUID()}`,
      userId: user.id,
      memberName: user.displayName,
      content,
      createdAt: new Date().toISOString(),
    },
  };
}
