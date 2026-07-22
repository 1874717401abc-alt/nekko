import { randomUUID } from "crypto";
import { nextAutomationRun } from "@/lib/automations";
import type {
  AutomationAction,
  AutomationCadence,
  AutomationRule,
  CheckIn,
  CostItem,
  CostStatus,
  Deliverable,
  DeliverableStatus,
  InspirationItem,
  LibraryItem,
  MilestoneStatus,
  NotificationItem,
  NotificationType,
  PerformanceRecord,
  ProgressComment,
  ProgressLogEntry,
  ProgressTask,
  Project,
  ProjectAsset,
  ProjectAssetKind,
  ProjectMilestone,
  ProjectStage,
  PublishPlatform,
  ScriptScene,
  ScriptSceneStatus,
  ScriptSceneType,
  ScriptReview,
  ScriptVersion,
  ScriptVersionStatus,
  TaskPriority,
  TaskStatus,
  User,
} from "@/lib/types";
import type { ItemResourceName, ResourceItem } from "@/lib/store";

type Body = Record<string, unknown>;
type RuleResult<T extends { id: string }> = { item: T } | { error: string; status: number };

const TASK_STATUSES: TaskStatus[] = ["todo", "doing", "done"];
const TASK_PRIORITIES: TaskPriority[] = ["low", "normal", "high"];
const SCRIPT_TYPES: ScriptSceneType[] = ["hook", "narration", "broll", "interview", "outro"];
const SCRIPT_STATUSES: ScriptSceneStatus[] = ["draft", "ready", "shot"];
const COST_STATUSES: CostStatus[] = ["planned", "approved", "paid"];
const MILESTONE_STATUSES: MilestoneStatus[] = ["planned", "doing", "done"];
const PROJECT_STAGES: ProjectStage[] = [
  "idea", "research", "script", "shooting", "editing", "review", "publishing", "published", "retrospective",
];
const VERSION_STATUSES: ScriptVersionStatus[] = ["draft", "in_review", "approved", "locked"];
const ASSET_KINDS: ProjectAssetKind[] = ["image", "video", "document", "contract", "invoice", "other"];
const PUBLISH_PLATFORMS: PublishPlatform[] = ["bilibili", "xiaohongshu", "douyin", "wechat", "other"];
const DELIVERABLE_STATUSES: DeliverableStatus[] = ["draft", "scheduled", "published"];
const AUTOMATION_ACTIONS: AutomationAction[] = ["content_radar", "topic_digest", "deadline_scan"];
const AUTOMATION_CADENCES: AutomationCadence[] = ["daily", "weekly"];
const NOTIFICATION_TYPES: NotificationType[] = ["deadline", "budget", "review", "publish", "automation"];

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

function numeric(body: Body, key: string): number | undefined {
  const raw = body[key];
  const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : undefined;
}

function dateValue(body: Body, key: string): string | undefined {
  const value = optionalText(body, key);
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function dateTimeValue(body: Body, key: string): string | undefined {
  const value = optionalText(body, key);
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function booleanValue(body: Body, key: string, fallback = false): boolean {
  const value = body[key];
  return typeof value === "boolean" ? value : fallback;
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
  return dateValue(body, "dueDate");
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
        budget: Math.max(0, numeric(body, "budget") ?? 0),
        stage: PROJECT_STAGES.includes(body.stage as ProjectStage)
          ? (body.stage as ProjectStage)
          : "idea",
        stageOwner: optionalText(body, "stageOwner"),
        blockedReason: optionalText(body, "blockedReason"),
        template:
          body.template === "talking" || body.template === "interview" || body.template === "store" || body.template === "documentary"
            ? body.template
            : "blank",
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

  if (resource === "scripts") {
    const title = text(body, "title");
    const linkedProjectId = projectId(body);
    if (!linkedProjectId) return bad("请选择项目");
    if (!title) return bad("镜头标题不能为空");
    return {
      item: {
        id: `scene-${randomUUID()}`,
        projectId: linkedProjectId,
        order: Math.max(0, Math.round(numeric(body, "order") ?? 0)),
        title,
        type: SCRIPT_TYPES.includes(body.type as ScriptSceneType)
          ? (body.type as ScriptSceneType)
          : "narration",
        duration: Math.max(1, Math.min(3600, Math.round(numeric(body, "duration") ?? 15))),
        script: text(body, "script"),
        visual: optionalText(body, "visual"),
        assignee: optionalText(body, "assignee"),
        status: SCRIPT_STATUSES.includes(body.status as ScriptSceneStatus)
          ? (body.status as ScriptSceneStatus)
          : "draft",
        createdAt: new Date().toISOString(),
        createdBy: user.displayName,
        createdById: user.id,
      } satisfies ScriptScene,
    };
  }

  if (resource === "costs") {
    const title = text(body, "title");
    const linkedProjectId = projectId(body);
    const amount = numeric(body, "amount");
    if (!linkedProjectId) return bad("请选择项目");
    if (!title) return bad("费用名称不能为空");
    if (amount === undefined || amount < 0) return bad("请输入正确的金额");
    return {
      item: {
        id: `cost-${randomUUID()}`,
        projectId: linkedProjectId,
        title,
        category: optionalText(body, "category") ?? "其他",
        amount: Math.round(amount * 100) / 100,
        status: COST_STATUSES.includes(body.status as CostStatus)
          ? (body.status as CostStatus)
          : "planned",
        vendor: optionalText(body, "vendor"),
        date: dateValue(body, "date"),
        note: optionalText(body, "note"),
        createdAt: new Date().toISOString(),
        createdBy: user.displayName,
        createdById: user.id,
      } satisfies CostItem,
    };
  }

  if (resource === "milestones") {
    const title = text(body, "title");
    const linkedProjectId = projectId(body);
    const date = dateValue(body, "date");
    if (!linkedProjectId) return bad("请选择项目");
    if (!title) return bad("里程碑名称不能为空");
    if (!date) return bad("请选择日期");
    return {
      item: {
        id: `milestone-${randomUUID()}`,
        projectId: linkedProjectId,
        title,
        date,
        status: MILESTONE_STATUSES.includes(body.status as MilestoneStatus)
          ? (body.status as MilestoneStatus)
          : "planned",
        assignee: optionalText(body, "assignee"),
        note: optionalText(body, "note"),
        createdAt: new Date().toISOString(),
        createdBy: user.displayName,
        createdById: user.id,
      } satisfies ProjectMilestone,
    };
  }

  if (resource === "scriptVersions") {
    const linkedProjectId = projectId(body);
    const sceneId = optionalText(body, "sceneId");
    const title = text(body, "title");
    if (!linkedProjectId || !sceneId) return bad("请选择项目和镜头");
    if (!title) return bad("版本标题不能为空");
    return {
      item: {
        id: `version-${randomUUID()}`,
        projectId: linkedProjectId,
        sceneId,
        version: Math.max(1, Math.round(numeric(body, "version") ?? 1)),
        title,
        script: text(body, "script"),
        visual: optionalText(body, "visual"),
        duration: Math.max(1, Math.round(numeric(body, "duration") ?? 1)),
        status: VERSION_STATUSES.includes(body.status as ScriptVersionStatus)
          ? (body.status as ScriptVersionStatus)
          : "draft",
        note: optionalText(body, "note"),
        createdAt: new Date().toISOString(),
        createdBy: user.displayName,
        createdById: user.id,
      } satisfies ScriptVersion,
    };
  }

  if (resource === "scriptReviews") {
    const linkedProjectId = projectId(body);
    const sceneId = optionalText(body, "sceneId");
    const content = text(body, "content");
    if (!linkedProjectId || !sceneId) return bad("请选择项目和镜头");
    if (!content) return bad("审阅意见不能为空");
    return {
      item: {
        id: `review-${randomUUID()}`,
        projectId: linkedProjectId,
        sceneId,
        versionId: optionalText(body, "versionId"),
        content,
        resolved: booleanValue(body, "resolved"),
        createdAt: new Date().toISOString(),
        createdBy: user.displayName,
        createdById: user.id,
      } satisfies ScriptReview,
    };
  }

  if (resource === "assets") {
    const linkedProjectId = projectId(body);
    const title = text(body, "title");
    const storedName = text(body, "storedName");
    if (!linkedProjectId || !title || !storedName) return bad("素材信息不完整");
    return {
      item: {
        id: `asset-${randomUUID()}`,
        projectId: linkedProjectId,
        title,
        kind: ASSET_KINDS.includes(body.kind as ProjectAssetKind)
          ? (body.kind as ProjectAssetKind)
          : "other",
        fileName: text(body, "fileName") || title,
        storedName,
        mimeType: text(body, "mimeType") || "application/octet-stream",
        size: Math.max(0, Math.round(numeric(body, "size") ?? 0)),
        url: text(body, "url"),
        tags: stringList(body, "tags"),
        version: Math.max(1, Math.round(numeric(body, "version") ?? 1)),
        note: optionalText(body, "note"),
        extractedText: optionalText(body, "extractedText"),
        createdAt: new Date().toISOString(),
        createdBy: user.displayName,
        createdById: user.id,
      } satisfies ProjectAsset,
    };
  }

  if (resource === "deliverables") {
    const linkedProjectId = projectId(body);
    const title = text(body, "title");
    if (!linkedProjectId || !title) return bad("请选择项目并填写发布标题");
    return {
      item: {
        id: `deliverable-${randomUUID()}`,
        projectId: linkedProjectId,
        platform: PUBLISH_PLATFORMS.includes(body.platform as PublishPlatform)
          ? (body.platform as PublishPlatform)
          : "other",
        title,
        caption: optionalText(body, "caption"),
        coverUrl: optionalText(body, "coverUrl"),
        status: DELIVERABLE_STATUSES.includes(body.status as DeliverableStatus)
          ? (body.status as DeliverableStatus)
          : "draft",
        scheduledAt: dateTimeValue(body, "scheduledAt"),
        publishedAt: dateTimeValue(body, "publishedAt"),
        url: optionalText(body, "url"),
        createdAt: new Date().toISOString(),
        createdBy: user.displayName,
        createdById: user.id,
      } satisfies Deliverable,
    };
  }

  if (resource === "performance") {
    const linkedProjectId = projectId(body);
    const recordedAt = dateValue(body, "recordedAt");
    if (!linkedProjectId || !recordedAt) return bad("请选择项目和记录日期");
    const metric = (key: string) => Math.max(0, numeric(body, key) ?? 0);
    return {
      item: {
        id: `performance-${randomUUID()}`,
        projectId: linkedProjectId,
        deliverableId: optionalText(body, "deliverableId"),
        recordedAt,
        views: Math.round(metric("views")),
        likes: Math.round(metric("likes")),
        comments: Math.round(metric("comments")),
        saves: Math.round(metric("saves")),
        shares: Math.round(metric("shares")),
        followers: Math.round(metric("followers")),
        completionRate: Math.min(100, metric("completionRate")),
        revenue: Math.round(metric("revenue") * 100) / 100,
        note: optionalText(body, "note"),
        createdAt: new Date().toISOString(),
        createdBy: user.displayName,
        createdById: user.id,
      } satisfies PerformanceRecord,
    };
  }

  if (resource === "automations") {
    const title = text(body, "title");
    const time = text(body, "time");
    if (!title || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return bad("请填写名称和正确的执行时间");
    const action = AUTOMATION_ACTIONS.includes(body.action as AutomationAction)
      ? (body.action as AutomationAction)
      : "deadline_scan";
    const cadence = AUTOMATION_CADENCES.includes(body.cadence as AutomationCadence)
      ? (body.cadence as AutomationCadence)
      : "daily";
    const weekday = Math.max(0, Math.min(6, Math.round(numeric(body, "weekday") ?? 1)));
    return {
      item: {
        id: `automation-${randomUUID()}`,
        title,
        action,
        cadence,
        time,
        weekday,
        enabled: booleanValue(body, "enabled", true),
        lastRunAt: dateTimeValue(body, "lastRunAt"),
        nextRunAt: dateTimeValue(body, "nextRunAt") ?? nextAutomationRun({ cadence, time, weekday }),
        createdAt: new Date().toISOString(),
        createdBy: user.displayName,
        createdById: user.id,
      } satisfies AutomationRule,
    };
  }

  if (resource === "notifications") {
    const title = text(body, "title");
    const message = text(body, "message");
    if (!title || !message) return bad("通知内容不能为空");
    return {
      item: {
        id: `notification-${randomUUID()}`,
        key: optionalText(body, "key"),
        userId: optionalText(body, "userId"),
        projectId: projectId(body),
        type: NOTIFICATION_TYPES.includes(body.type as NotificationType)
          ? (body.type as NotificationType)
          : "automation",
        title,
        message,
        href: optionalText(body, "href"),
        readAt: dateTimeValue(body, "readAt"),
        createdAt: new Date().toISOString(),
        createdBy: user.displayName,
        createdById: user.id,
      } satisfies NotificationItem,
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
        budget:
          "budget" in body ? Math.max(0, numeric(body, "budget") ?? 0) : existing.budget,
        stage: PROJECT_STAGES.includes(body.stage as ProjectStage)
          ? (body.stage as ProjectStage)
          : existing.stage ?? "idea",
        stageOwner: "stageOwner" in body ? optionalText(body, "stageOwner") : existing.stageOwner,
        blockedReason:
          "blockedReason" in body ? optionalText(body, "blockedReason") : existing.blockedReason,
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

  if (resource === "scripts") {
    const existing = item as ScriptScene;
    const title = "title" in body ? text(body, "title") : existing.title;
    if (!title) return bad("镜头标题不能为空");
    return {
      item: {
        ...existing,
        title,
        order:
          "order" in body
            ? Math.max(0, Math.round(numeric(body, "order") ?? existing.order))
            : existing.order,
        type: SCRIPT_TYPES.includes(body.type as ScriptSceneType)
          ? (body.type as ScriptSceneType)
          : existing.type,
        duration:
          "duration" in body
            ? Math.max(1, Math.min(3600, Math.round(numeric(body, "duration") ?? existing.duration)))
            : existing.duration,
        script: "script" in body ? text(body, "script") : existing.script,
        visual: "visual" in body ? optionalText(body, "visual") : existing.visual,
        assignee: "assignee" in body ? optionalText(body, "assignee") : existing.assignee,
        status: SCRIPT_STATUSES.includes(body.status as ScriptSceneStatus)
          ? (body.status as ScriptSceneStatus)
          : existing.status,
      } satisfies ScriptScene,
    };
  }

  if (resource === "costs") {
    const existing = item as CostItem;
    const title = "title" in body ? text(body, "title") : existing.title;
    const amount = "amount" in body ? numeric(body, "amount") : existing.amount;
    if (!title) return bad("费用名称不能为空");
    if (amount === undefined || amount < 0) return bad("请输入正确的金额");
    return {
      item: {
        ...existing,
        title,
        category:
          "category" in body ? optionalText(body, "category") ?? "其他" : existing.category,
        amount: Math.round(amount * 100) / 100,
        status: COST_STATUSES.includes(body.status as CostStatus)
          ? (body.status as CostStatus)
          : existing.status,
        vendor: "vendor" in body ? optionalText(body, "vendor") : existing.vendor,
        date: "date" in body ? dateValue(body, "date") : existing.date,
        note: "note" in body ? optionalText(body, "note") : existing.note,
      } satisfies CostItem,
    };
  }

  if (resource === "milestones") {
    const existing = item as ProjectMilestone;
    const title = "title" in body ? text(body, "title") : existing.title;
    const date = "date" in body ? dateValue(body, "date") : existing.date;
    if (!title) return bad("里程碑名称不能为空");
    if (!date) return bad("请选择日期");
    return {
      item: {
        ...existing,
        title,
        date,
        status: MILESTONE_STATUSES.includes(body.status as MilestoneStatus)
          ? (body.status as MilestoneStatus)
          : existing.status,
        assignee: "assignee" in body ? optionalText(body, "assignee") : existing.assignee,
        note: "note" in body ? optionalText(body, "note") : existing.note,
      } satisfies ProjectMilestone,
    };
  }

  if (resource === "scriptVersions") {
    const existing = item as ScriptVersion;
    return {
      item: {
        ...existing,
        status: VERSION_STATUSES.includes(body.status as ScriptVersionStatus)
          ? (body.status as ScriptVersionStatus)
          : existing.status,
        note: "note" in body ? optionalText(body, "note") : existing.note,
      } satisfies ScriptVersion,
    };
  }

  if (resource === "scriptReviews") {
    const existing = item as ScriptReview;
    return {
      item: {
        ...existing,
        content: "content" in body ? text(body, "content") || existing.content : existing.content,
        resolved: "resolved" in body ? booleanValue(body, "resolved") : existing.resolved,
      } satisfies ScriptReview,
    };
  }

  if (resource === "assets") {
    const existing = item as ProjectAsset;
    return {
      item: {
        ...existing,
        title: "title" in body ? text(body, "title") || existing.title : existing.title,
        kind: ASSET_KINDS.includes(body.kind as ProjectAssetKind)
          ? (body.kind as ProjectAssetKind)
          : existing.kind,
        tags: "tags" in body ? stringList(body, "tags") : existing.tags,
        note: "note" in body ? optionalText(body, "note") : existing.note,
      } satisfies ProjectAsset,
    };
  }

  if (resource === "deliverables") {
    const existing = item as Deliverable;
    return {
      item: {
        ...existing,
        title: "title" in body ? text(body, "title") || existing.title : existing.title,
        platform: PUBLISH_PLATFORMS.includes(body.platform as PublishPlatform)
          ? (body.platform as PublishPlatform)
          : existing.platform,
        caption: "caption" in body ? optionalText(body, "caption") : existing.caption,
        coverUrl: "coverUrl" in body ? optionalText(body, "coverUrl") : existing.coverUrl,
        status: DELIVERABLE_STATUSES.includes(body.status as DeliverableStatus)
          ? (body.status as DeliverableStatus)
          : existing.status,
        scheduledAt: "scheduledAt" in body ? dateTimeValue(body, "scheduledAt") : existing.scheduledAt,
        publishedAt: "publishedAt" in body ? dateTimeValue(body, "publishedAt") : existing.publishedAt,
        url: "url" in body ? optionalText(body, "url") : existing.url,
      } satisfies Deliverable,
    };
  }

  if (resource === "performance") {
    const existing = item as PerformanceRecord;
    const metric = (key: keyof PerformanceRecord) =>
      key in body ? Math.max(0, numeric(body, key) ?? Number(existing[key])) : Number(existing[key]);
    return {
      item: {
        ...existing,
        deliverableId: "deliverableId" in body ? optionalText(body, "deliverableId") : existing.deliverableId,
        recordedAt: "recordedAt" in body ? dateValue(body, "recordedAt") ?? existing.recordedAt : existing.recordedAt,
        views: Math.round(metric("views")),
        likes: Math.round(metric("likes")),
        comments: Math.round(metric("comments")),
        saves: Math.round(metric("saves")),
        shares: Math.round(metric("shares")),
        followers: Math.round(metric("followers")),
        completionRate: Math.min(100, metric("completionRate")),
        revenue: Math.round(metric("revenue") * 100) / 100,
        note: "note" in body ? optionalText(body, "note") : existing.note,
      } satisfies PerformanceRecord,
    };
  }

  if (resource === "automations") {
    const existing = item as AutomationRule;
    const time = "time" in body ? text(body, "time") : existing.time;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return bad("执行时间格式不正确");
    return {
      item: {
        ...existing,
        title: "title" in body ? text(body, "title") || existing.title : existing.title,
        action: AUTOMATION_ACTIONS.includes(body.action as AutomationAction)
          ? (body.action as AutomationAction)
          : existing.action,
        cadence: AUTOMATION_CADENCES.includes(body.cadence as AutomationCadence)
          ? (body.cadence as AutomationCadence)
          : existing.cadence,
        time,
        weekday: "weekday" in body ? Math.max(0, Math.min(6, Math.round(numeric(body, "weekday") ?? 1))) : existing.weekday,
        enabled: "enabled" in body ? booleanValue(body, "enabled") : existing.enabled,
        lastRunAt: "lastRunAt" in body ? dateTimeValue(body, "lastRunAt") : existing.lastRunAt,
        nextRunAt: "nextRunAt" in body ? dateTimeValue(body, "nextRunAt") : existing.nextRunAt,
      } satisfies AutomationRule,
    };
  }

  if (resource === "notifications") {
    const existing = item as NotificationItem;
    return {
      item: {
        ...existing,
        readAt: "readAt" in body ? dateTimeValue(body, "readAt") : existing.readAt,
      } satisfies NotificationItem,
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
