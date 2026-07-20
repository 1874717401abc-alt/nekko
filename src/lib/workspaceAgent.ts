import { recordItemActivity } from "@/lib/activity";
import {
  type AgentMessage,
  type AgentCompletion,
  requestAgentCompletion,
} from "@/lib/aiAgent";
import { runContentRadar } from "@/lib/contentRadar";
import { createResourceItem } from "@/lib/resourceRules";
import {
  insertDataItem,
  listDataItems,
  updateDataItem,
  type ItemResourceName,
  type ResourceItem,
} from "@/lib/store";
import type { AiMode, InspirationItem, Project, User } from "@/lib/types";

export type WorkspaceAgentActionName =
  | "create_project"
  | "create_task"
  | "create_inspiration"
  | "create_library"
  | "run_content_radar"
  | "normalize_inspiration_tags";

export type WorkspaceAgentAction = {
  action?: string;
  ref?: string;
  data?: Record<string, unknown>;
};

export type WorkspaceAgentPlan = {
  reply?: string;
  actions?: WorkspaceAgentAction[];
};

export type WorkspaceActionResult = {
  action: WorkspaceAgentActionName | "unknown";
  ok: boolean;
  title: string;
  detail: string;
  resource?: ItemResourceName;
  resourceId?: string;
};

export type WorkspaceAgentCompletion = AgentCompletion & {
  actions: WorkspaceActionResult[];
};

const MAX_ACTIONS_PER_TURN = 12;
const ACTIONS = new Set<WorkspaceAgentActionName>([
  "create_project",
  "create_task",
  "create_inspiration",
  "create_library",
  "run_content_radar",
  "normalize_inspiration_tags",
]);

function isAgentActionName(value: unknown): value is WorkspaceAgentActionName {
  return typeof value === "string" && ACTIONS.has(value as WorkspaceAgentActionName);
}

function stripCodeFence(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return fenced ?? text;
}

function extractPlan(text: string): WorkspaceAgentPlan | null {
  const raw = stripCodeFence(text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) return null;

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? (parsed as WorkspaceAgentPlan) : null;
  } catch {
    return null;
  }
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function workspaceActionLabel(action: WorkspaceAgentActionName | string) {
  const labels: Record<WorkspaceAgentActionName, string> = {
    create_project: "创建项目",
    create_task: "创建任务",
    create_inspiration: "创建灵感",
    create_library: "创建资料",
    run_content_radar: "运行内容雷达",
    normalize_inspiration_tags: "整理灵感标签",
  };
  return isAgentActionName(action) ? labels[action] : "未知动作";
}

function resourceForAction(action: WorkspaceAgentActionName): ItemResourceName | null {
  if (action === "create_project") return "projects";
  if (action === "create_task") return "progress";
  if (action === "create_inspiration") return "inspiration";
  if (action === "create_library") return "library";
  return null;
}

function titleFromItem(item: ResourceItem) {
  for (const key of ["title", "name", "note"]) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "未命名";
}

function resolveProjectId(
  data: Record<string, unknown>,
  projectRefs: Map<string, string>,
  projects: Project[]
) {
  const projectId = text(data.projectId);
  if (projectId) return projectId;

  const projectRef = text(data.projectRef);
  if (projectRef && projectRefs.has(projectRef)) return projectRefs.get(projectRef);

  const projectName = text(data.projectName);
  if (!projectName) return undefined;
  const normalized = normalizeName(projectName);
  return projects.find((project) => normalizeName(project.name) === normalized)?.id;
}

function normalizeActionData(
  action: WorkspaceAgentActionName,
  data: Record<string, unknown>,
  projectRefs: Map<string, string>,
  projects: Project[]
) {
  if (action === "create_task" || action === "create_inspiration" || action === "create_library") {
    return {
      ...data,
      projectId: resolveProjectId(data, projectRefs, projects),
    };
  }
  return data;
}

function actionInstruction() {
  return [
    "你现在是 Nekko Workspace Agent，有权在站内执行有限白名单动作。",
    "你必须判断用户是否明确要求你办事。只有明确要求创建、安排、记录、采集、放进库、拆任务时才执行动作；普通咨询只回复，不执行。",
    "只允许这些动作：",
    "- create_project: data = { name, description?, tags? }",
    "- create_task: data = { title, description?, assignee?, status?, priority?, dueDate?, projectId?, projectName?, projectRef? }",
    "- create_inspiration: data = { title, type?, url?, note?, tags?, projectId?, projectName?, projectRef? }",
    "- create_library: data = { title, type?, url, category?, note?, projectId?, projectName?, projectRef? }",
    "- run_content_radar: data = { limit? }，用于用户要求采集/扒 B站/生成今日趋势灵感。",
    "- normalize_inspiration_tags: data = { scope?, tags? }，用于用户要求整理灵感标签、清理内容雷达标签、B站趋势标签太多。scope 可为 ai_radar、bilibili、all；默认 ai_radar。tags 默认 [\"AI选题\", \"B站热门\"]。",
    "如果用户说“内容雷达/B站趋势/每天扒的灵感标签太多、不要每条造标签、统一标签、整理标签”，必须生成 normalize_inspiration_tags 动作。",
    "如果一个动作后续要被引用，用 ref，例如先 create_project ref='p1'，后面的 create_task data.projectRef='p1'。",
    "本段白名单动作覆盖前面只读限制；仅在这些动作内可以修改工作台数据。",
    "禁止删除、永久删除、改密码、绕过登录、发布到外部平台、抓取非公开内容、调用未列出的动作。",
    "输出必须是 JSON 对象，不要 Markdown，不要解释 JSON 之外的内容。",
    "格式：{ \"reply\": \"给用户的简短说明\", \"actions\": [{ \"action\": \"create_project\", \"ref\": \"p1\", \"data\": {...} }] }",
  ].join("\n");
}

export async function executeWorkspaceAction(input: {
  action: WorkspaceAgentAction;
  user: User;
  projectRefs: Map<string, string>;
}): Promise<WorkspaceActionResult> {
  const name = input.action.action;
  if (!isAgentActionName(name)) {
    return {
      action: "unknown",
      ok: false,
      title: "未知动作",
      detail: "模型给出了不在白名单里的动作，已拒绝执行。",
    };
  }

  if (name === "run_content_radar") {
    const requestedLimit =
      typeof input.action.data?.limit === "number" ? Math.round(input.action.data.limit) : 6;
    const result = await runContentRadar(Math.max(1, Math.min(requestedLimit, 10)));
    return {
      action: name,
      ok: true,
      title: "B站内容雷达",
      detail: result.message,
    };
  }

  if (name === "normalize_inspiration_tags") {
    const result = normalizeInspirationTags(input.action.data);
    return {
      action: name,
      ok: true,
      title: "灵感标签",
      detail: `已整理 ${result.updated} 条灵感标签，跳过 ${result.skipped} 条。`,
    };
  }

  const resource = resourceForAction(name);
  if (!resource) {
    return {
      action: name,
      ok: false,
      title: workspaceActionLabel(name),
      detail: "这个动作暂不支持。",
    };
  }

  const projects = listDataItems<Project>("projects");
  const rawData = input.action.data && typeof input.action.data === "object" ? input.action.data : {};
  const data = normalizeActionData(name, rawData, input.projectRefs, projects);
  const result = createResourceItem(resource, data, input.user);
  if ("error" in result) {
    return {
      action: name,
      ok: false,
      title: workspaceActionLabel(name),
      detail: result.error,
      resource,
    };
  }

  const item = insertDataItem(resource, result.item);
  recordItemActivity(resource === "checkins" ? "checkin" : "create", resource, item, input.user);
  if (input.action.ref) {
    input.projectRefs.set(input.action.ref, item.id);
  }

  return {
    action: name,
    ok: true,
    title: titleFromItem(item),
    detail: `已${workspaceActionLabel(name)}「${titleFromItem(item)}」`,
    resource,
    resourceId: item.id,
  };
}

function normalizeTag(value: string) {
  return value.replace(/^#/, "").trim().slice(0, 16);
}

function targetTags(data?: Record<string, unknown>) {
  const rawTags = Array.isArray(data?.tags)
    ? data.tags.filter((item): item is string => typeof item === "string")
    : [];
  const tags = rawTags.map(normalizeTag).filter(Boolean);
  return Array.from(new Set(tags.length > 0 ? tags : ["AI选题", "B站热门"])).slice(0, 4);
}

function normalizeScope(value: unknown) {
  return value === "all" || value === "bilibili" ? value : "ai_radar";
}

function isRadarInspiration(item: InspirationItem) {
  const text = `${item.createdBy} ${item.createdById ?? ""} ${item.url ?? ""} ${item.note ?? ""} ${item.tags.join(" ")}`;
  return (
    item.createdBy === "Nekko Agent" ||
    item.createdById === "system-agent" ||
    item.id.startsWith("insp-radar-") ||
    text.includes("B站公开热门/排行榜") ||
    item.tags.includes("AI选题") ||
    item.tags.includes("B站趋势") ||
    item.tags.includes("B站热门")
  );
}

function isBilibiliInspiration(item: InspirationItem) {
  return (
    isRadarInspiration(item) ||
    item.url?.includes("bilibili.com") ||
    item.url?.includes("b23.tv") ||
    item.tags.some((tag) => tag.toLowerCase().includes("b站"))
  );
}

function normalizeInspirationTags(data?: Record<string, unknown>) {
  const scope = normalizeScope(data?.scope);
  const tags = targetTags(data);
  const items = listDataItems<InspirationItem>("inspiration");
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const shouldUpdate =
      scope === "all" || (scope === "bilibili" ? isBilibiliInspiration(item) : isRadarInspiration(item));
    if (!shouldUpdate) {
      skipped += 1;
      continue;
    }

    updateDataItem<InspirationItem>("inspiration", item.id, (existing) => ({
      ...existing,
      tags,
    }));
    updated += 1;
  }

  return { updated, skipped };
}

function resultBlock(results: WorkspaceActionResult[]) {
  if (results.length === 0) return "";
  return [
    "已执行：",
    ...results.map((result) => {
      const marker = result.ok ? "✓" : "!";
      return `- ${marker} ${result.detail}`;
    }),
  ].join("\n");
}

export async function runWorkspaceAgent(input: {
  messages: AgentMessage[];
  mode: AiMode;
  signal: AbortSignal;
  conversationId: string;
  user: User;
}): Promise<WorkspaceAgentCompletion> {
  const planned = await planWorkspaceActions(input);
  const actions = Array.isArray(planned.plan?.actions)
    ? planned.plan.actions.slice(0, MAX_ACTIONS_PER_TURN)
    : [];
  const projectRefs = new Map<string, string>();
  const results: WorkspaceActionResult[] = [];

  for (const action of actions) {
    if (!action || typeof action !== "object") continue;
    results.push(await executeWorkspaceAction({ action, user: input.user, projectRefs }));
  }

  const reply = text(planned.plan?.reply) || "我已经处理好了。";
  const executed = resultBlock(results);
  return {
    ...planned.completion,
    content: executed ? `${reply}\n\n${executed}` : reply,
    actions: results,
  };
}

export async function planWorkspaceActions(input: {
  messages: AgentMessage[];
  mode: AiMode;
  signal: AbortSignal;
  conversationId: string;
  user: User;
}): Promise<{ completion: AgentCompletion; plan: WorkspaceAgentPlan | null }> {
  const [systemMessage, ...rest] = input.messages;
  const agentMessages: AgentMessage[] = [
    {
      role: "system",
      content: `${systemMessage?.content ?? ""}\n\n${actionInstruction()}`,
    },
    ...rest,
  ];

  const completion = await requestAgentCompletion({
    messages: agentMessages,
    mode: input.mode,
    signal: input.signal,
    conversationId: input.conversationId,
    userId: input.user.id,
  });

  const plan = extractPlan(completion.content);
  return { completion, plan };
}
