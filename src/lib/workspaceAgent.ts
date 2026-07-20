import { recordActivity, recordItemActivity } from "@/lib/activity";
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
  | "normalize_inspiration_tags"
  | "organize_inspirations";

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
  requiresApproval?: boolean;
  resource?: ItemResourceName;
  resourceId?: string;
};

export type WorkspaceAgentCompletion = AgentCompletion & {
  actions: WorkspaceActionResult[];
  plannedActions: WorkspaceAgentAction[];
};

const MAX_ACTIONS_PER_TURN = 12;
const ACTIONS = new Set<WorkspaceAgentActionName>([
  "create_project",
  "create_task",
  "create_inspiration",
  "create_library",
  "run_content_radar",
  "normalize_inspiration_tags",
  "organize_inspirations",
]);

function isAgentActionName(value: unknown): value is WorkspaceAgentActionName {
  return typeof value === "string" && ACTIONS.has(value as WorkspaceAgentActionName);
}

export function isConnectedWorkspaceAction(value: unknown): value is WorkspaceAgentActionName {
  return isAgentActionName(value);
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
    organize_inspirations: "智能整理灵感",
  };
  const openActionLabels: Record<string, string> = {
    external_publish: "外部平台发布",
    publish_bilibili: "发布到 B站",
    publish_xiaohongshu: "发布到小红书",
    publish_douyin: "发布到抖音",
    external_login: "外部账号登录",
    connect_platform: "接入平台工具",
    browser_research: "浏览器调研",
    web_research: "网页调研",
    bilibili_research: "B站深度采集",
    private_scrape: "非公开内容采集",
    delete_workspace_data: "删除工作台数据",
    send_notification: "发送通知",
    schedule_recurring_job: "创建自动化任务",
    install_agent_tool: "安装 Agent 工具",
  };
  if (isAgentActionName(action)) return labels[action];
  if (openActionLabels[action]) return openActionLabels[action];
  const normalized = action.replace(/[_-]+/g, " ").trim();
  return normalized || "待接入动作";
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
    "你现在是 Nekko Workspace Agent。你的第一职责是自主判断目标、拆解步骤、决定该用哪些工具。",
    "你必须判断用户是否明确要求你办事。只有明确要求创建、安排、记录、采集、放进库、拆任务、操作平台时才输出 actions；普通咨询只回复，不执行。",
    "不要把当前工具接入情况理解成思考边界。你可以在 actions 中写出你判断需要的完整步骤；已接入动作会自动执行，未接入/高风险/外部动作会被保存为待接入或待授权步骤。",
    "已接入并可自动执行的站内动作：",
    "- create_project: data = { name, description?, tags? }",
    "- create_task: data = { title, description?, assignee?, status?, priority?, dueDate?, projectId?, projectName?, projectRef? }",
    "- create_inspiration: data = { title, type?, url?, note?, tags?, projectId?, projectName?, projectRef? }",
    "- create_library: data = { title, type?, url, category?, note?, projectId?, projectName?, projectRef? }",
    "- run_content_radar: data = { limit? }，用于用户要求采集/扒 B站/生成今日趋势灵感。",
    "- normalize_inspiration_tags: data = { scope?, tags? }，用于用户要求整理灵感标签、清理内容雷达标签、B站趋势标签太多。scope 可为 ai_radar、bilibili、all；默认 ai_radar。tags 默认 [\"AI选题\", \"B站热门\"]。",
    "- organize_inspirations: data = { scope? }，用于用户要求整理、归类、清理整个灵感库。scope 可为 all、recent、bilibili；默认 all。它会统一主题标签并标记疑似重复，但不会删除原内容。",
    "如果用户说“内容雷达/B站趋势/每天扒的灵感标签太多、不要每条造标签、统一标签、整理标签”，必须生成 normalize_inspiration_tags 动作。",
    "如果用户说“整理灵感、归类灵感、清理灵感库、帮我收拾灵感”，必须生成 organize_inspirations 动作；除非用户明确只要求整理内容雷达标签。",
    "未接入、外部平台或高风险动作也要照常规划，不要省略；action 使用清晰的 snake_case 名称，例如 publish_bilibili、publish_xiaohongshu、external_login、browser_research、send_notification、schedule_recurring_job、install_agent_tool。",
    "这类待接入/待授权动作的 data 要说明 { title?, reason?, requires?, tool?, risk?, next? }，并且不要声称已经完成。",
    "涉及删除、永久删除、改密码、绕过登录、外部账号登录、对外发布、私信/通知、付费、权限变更、抓取非公开内容时，必须规划成待接入/待授权步骤，说明为什么需要这个动作和下一步需要接什么工具。",
    "如果一个动作后续要被引用，用 ref，例如先 create_project ref='p1'，后面的 create_task data.projectRef='p1'。",
    "本段站内动作覆盖前面只读限制；已接入站内动作可以修改工作台数据。未接入/外部/高风险动作只保存计划，不假装完成。",
    "输出必须是 JSON 对象，不要 Markdown，不要解释 JSON 之外的内容。",
    "格式：{ \"reply\": \"给用户的简短说明\", \"actions\": [{ \"action\": \"create_project\", \"ref\": \"p1\", \"data\": {...} }] }",
  ].join("\n");
}

function dataText(data: Record<string, unknown> | undefined, key: string) {
  const value = data?.[key];
  return typeof value === "string" ? value.trim() : "";
}

export function describeBlockedWorkspaceAction(action: WorkspaceAgentAction) {
  const label = workspaceActionLabel(action.action ?? "");
  const reason = dataText(action.data, "reason");
  const requires = dataText(action.data, "requires");
  const tool = dataText(action.data, "tool");
  const risk = dataText(action.data, "risk");
  const next = dataText(action.data, "next");
  const context = [
    reason ? `判断：${reason}` : "",
    requires ? `需要：${requires}` : "",
    tool ? `工具：${tool}` : "",
    risk ? `风险：${risk}` : "",
    next ? `下一步：${next}` : "",
  ].filter(Boolean);

  return `Agent 已规划「${label}」，当前还没有接入对应工具或账号授权，先保留为待接入/待授权步骤。${context.join("；")}`;
}

export async function executeWorkspaceAction(input: {
  action: WorkspaceAgentAction;
  user: User;
  projectRefs: Map<string, string>;
}): Promise<WorkspaceActionResult> {
  const name = input.action.action;
  if (!isAgentActionName(name)) {
    const title = workspaceActionLabel(typeof name === "string" ? name : "");
    return {
      action: "unknown",
      ok: false,
      title,
      detail: describeBlockedWorkspaceAction(input.action),
      requiresApproval: true,
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

  if (name === "organize_inspirations") {
    const result = organizeInspirations(input.action.data, input.user);
    return {
      action: name,
      ok: true,
      title: "灵感库整理",
      detail: `已整理 ${result.processed} 条灵感，归入 ${result.groups} 个主题，标记 ${result.duplicates} 条疑似重复；原内容均已保留。`,
      resource: "inspiration",
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

const inspirationThemes = [
  {
    label: "AI 工具",
    keywords: ["ai", "人工智能", "gpt", "模型", "agent", "智能体", "提示词", "prompt", "deepseek", "claude"],
  },
  {
    label: "内容方法",
    keywords: ["选题", "标题", "脚本", "文案", "拍摄", "剪辑", "口播", "封面", "叙事", "创作"],
  },
  {
    label: "平台趋势",
    keywords: ["b站", "哔哩", "bilibili", "小红书", "抖音", "热门", "趋势", "流量", "涨粉", "算法"],
  },
  {
    label: "商业观察",
    keywords: ["品牌", "商业", "营销", "广告", "创业", "产品", "用户", "消费", "变现"],
  },
  {
    label: "视觉参考",
    keywords: ["摄影", "画面", "镜头", "美术", "设计", "配色", "视觉", "图片", "构图"],
  },
  {
    label: "生活观察",
    keywords: ["生活", "情绪", "成长", "职场", "关系", "城市", "日常", "旅行", "健康"],
  },
] as const;

function inspirationScope(value: unknown) {
  return value === "recent" || value === "bilibili" ? value : "all";
}

function inspirationFingerprint(item: InspirationItem) {
  const url = item.url?.trim().toLowerCase().replace(/[?#].*$/, "");
  if (url) return `url:${url}`;
  const title = item.title
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .slice(0, 80);
  return title ? `title:${title}` : `id:${item.id}`;
}

function classifyInspiration(item: InspirationItem) {
  const haystack = `${item.title} ${item.note ?? ""} ${item.url ?? ""} ${item.tags.join(" ")}`.toLowerCase();
  const matches = inspirationThemes
    .map((theme) => ({
      label: theme.label,
      score: theme.keywords.reduce((score, keyword) => score + (haystack.includes(keyword) ? 1 : 0), 0),
    }))
    .filter((theme) => theme.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((theme) => theme.label);
  return matches.length > 0 ? matches : ["待归类"];
}

function organizeInspirations(data: Record<string, unknown> | undefined, user: User) {
  const scope = inspirationScope(data?.scope);
  const allItems = listDataItems<InspirationItem>("inspiration");
  const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const targets = allItems.filter((item) => {
    if (scope === "bilibili") return isBilibiliInspiration(item);
    if (scope === "recent") return +new Date(item.createdAt) >= recentCutoff;
    return true;
  });
  const fingerprintCounts = new Map<string, number>();
  for (const item of targets) {
    const fingerprint = inspirationFingerprint(item);
    fingerprintCounts.set(fingerprint, (fingerprintCounts.get(fingerprint) ?? 0) + 1);
  }

  const usedGroups = new Set<string>();
  let updated = 0;
  let duplicates = 0;
  for (const item of targets) {
    const tags = classifyInspiration(item);
    tags.forEach((tag) => usedGroups.add(tag));
    const duplicate = (fingerprintCounts.get(inspirationFingerprint(item)) ?? 0) > 1;
    if (duplicate) {
      tags.push("待合并");
      duplicates += 1;
    }
    if (isBilibiliInspiration(item) && !tags.includes("B站")) tags.push("B站");
    const nextTags = Array.from(new Set(tags)).slice(0, 4);
    if (JSON.stringify(nextTags) === JSON.stringify(item.tags)) continue;
    updateDataItem<InspirationItem>("inspiration", item.id, (existing) => ({
      ...existing,
      tags: nextTags,
    }));
    updated += 1;
  }

  if (targets.length > 0) {
    recordActivity({
      type: "update",
      resource: "inspiration",
      title: "灵感库",
      summary: `${user.displayName} 使用 Agent 整理了 ${targets.length} 条灵感，更新 ${updated} 条`,
      user,
    });
  }

  return {
    processed: targets.length,
    updated,
    groups: usedGroups.size,
    duplicates,
  };
}

function resultBlock(results: WorkspaceActionResult[]) {
  if (results.length === 0) return "";
  return [
    "执行记录：",
    ...results.map((result) => {
      const marker = result.ok ? "✓" : result.requiresApproval ? "·" : "!";
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
    ? planned.plan.actions
        .filter((action): action is WorkspaceAgentAction => !!action && typeof action === "object")
        .slice(0, MAX_ACTIONS_PER_TURN)
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
    plannedActions: actions,
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
