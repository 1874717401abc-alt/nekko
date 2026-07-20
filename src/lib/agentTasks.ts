import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { buildAiSystemPrompt, buildAiWorkspaceContext } from "@/lib/aiWorkspace";
import {
  describeBlockedWorkspaceAction,
  executeWorkspaceAction,
  isConnectedWorkspaceAction,
  planWorkspaceActions,
  workspaceActionLabel,
  type WorkspaceAgentAction,
  type WorkspaceActionResult,
} from "@/lib/workspaceAgent";
import type {
  AgentTaskRun,
  AgentTaskRunDetail,
  AgentTaskStatus,
  AgentTaskStep,
  AgentTaskStepStatus,
  AiMode,
  User,
} from "@/lib/types";

type RunRow = {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  mode: AiMode;
  status: AgentTaskStatus;
  summary: string;
  created_at: string;
  updated_at: string;
};

type StepRow = {
  id: string;
  run_id: string;
  order_index: number;
  action: string;
  ref: string;
  title: string;
  payload: string;
  status: AgentTaskStepStatus;
  result: string;
  resource: string;
  resource_id: string;
  error: string;
  requires_approval: number;
  created_at: string;
  updated_at: string;
};

const MAX_TASK_STEPS = 12;

function toRun(row: RunRow): AgentTaskRun {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    prompt: row.prompt,
    mode: row.mode,
    status: row.status,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parsePayload(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function toStep(row: StepRow): AgentTaskStep {
  return {
    id: row.id,
    runId: row.run_id,
    orderIndex: row.order_index,
    action: row.action,
    ref: row.ref || undefined,
    title: row.title,
    payload: parsePayload(row.payload),
    status: row.status,
    result: row.result || undefined,
    resource: row.resource || undefined,
    resourceId: row.resource_id || undefined,
    error: row.error || undefined,
    requiresApproval: !!row.requires_approval,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function titleFromPrompt(prompt: string) {
  const compact = prompt.replace(/\s+/g, " ").trim();
  if (!compact) return "新的 Agent 任务";
  return compact.length > 28 ? `${compact.slice(0, 28)}...` : compact;
}

function stepTitle(action: WorkspaceAgentAction) {
  const data = action.data ?? {};
  const candidate =
    typeof data.name === "string"
      ? data.name
      : typeof data.title === "string"
        ? data.title
        : "";
  return candidate.trim() || workspaceActionLabel(action.action ?? "");
}

function safePayload(action: WorkspaceAgentAction) {
  return action.data && typeof action.data === "object" ? action.data : {};
}

function requiresConnectionOrApproval(action: WorkspaceAgentAction) {
  return !action.action || !isConnectedWorkspaceAction(action.action);
}

function plannedStatus(actions: WorkspaceAgentAction[]): AgentTaskStatus {
  if (actions.length === 0) return "completed";
  return actions.some((action) => !requiresConnectionOrApproval(action)) ? "running" : "blocked";
}

function statusFromSteps(steps: AgentTaskStep[]): AgentTaskStatus {
  if (steps.some((step) => step.status === "failed")) return "failed";
  if (steps.some((step) => step.status === "pending" || step.status === "running")) {
    return "running";
  }
  if (steps.some((step) => step.status === "blocked" || step.requiresApproval)) return "blocked";
  return "completed";
}

function canExecuteStep(step: AgentTaskStep) {
  return !step.requiresApproval && step.status !== "completed" && step.status !== "blocked";
}

function insertRun(input: {
  userId: string;
  title: string;
  prompt: string;
  mode: AiMode;
  status: AgentTaskStatus;
}): AgentTaskRun {
  const db = getDb();
  const now = new Date().toISOString();
  const run: AgentTaskRun = {
    id: `agent-run-${randomUUID()}`,
    userId: input.userId,
    title: input.title,
    prompt: input.prompt,
    mode: input.mode,
    status: input.status,
    summary: "",
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(
    `INSERT INTO agent_task_runs
      (id, user_id, title, prompt, mode, status, summary, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    run.id,
    run.userId,
    run.title,
    run.prompt,
    run.mode,
    run.status,
    run.summary,
    run.createdAt,
    run.updatedAt
  );
  return run;
}

function updateRun(input: {
  id: string;
  userId: string;
  status?: AgentTaskStatus;
  summary?: string;
}) {
  const existing = getAgentTaskRun(input.id, input.userId);
  if (!existing) return null;
  const next = {
    status: input.status ?? existing.status,
    summary: input.summary ?? existing.summary,
    updatedAt: new Date().toISOString(),
  };
  const db = getDb();
  db.prepare(
    `UPDATE agent_task_runs
     SET status = ?, summary = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`
  ).run(next.status, next.summary, next.updatedAt, input.id, input.userId);
  return getAgentTaskRun(input.id, input.userId);
}

function insertSteps(runId: string, actions: WorkspaceAgentAction[]) {
  const db = getDb();
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO agent_task_steps
      (id, run_id, order_index, action, ref, title, payload, status, result, resource, resource_id, error, requires_approval, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '', ?, ?, ?)`
  );
  const tx = db.transaction(() => {
    actions.slice(0, MAX_TASK_STEPS).forEach((action, index) => {
      const requiresApproval = requiresConnectionOrApproval(action);
      insert.run(
        `agent-step-${randomUUID()}`,
        runId,
        index,
        action.action ?? "unknown",
        action.ref ?? "",
        stepTitle(action),
        JSON.stringify(safePayload(action)),
        requiresApproval ? "blocked" : "pending",
        requiresApproval ? describeBlockedWorkspaceAction(action) : "",
        requiresApproval ? 1 : 0,
        now,
        now
      );
    });
  });
  tx();
}

function updateStep(input: {
  id: string;
  status: AgentTaskStepStatus;
  result?: string;
  resource?: string;
  resourceId?: string;
  error?: string;
}) {
  const db = getDb();
  db.prepare(
    `UPDATE agent_task_steps
     SET status = ?, result = ?, resource = ?, resource_id = ?, error = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    input.status,
    input.result ?? "",
    input.resource ?? "",
    input.resourceId ?? "",
    input.error ?? "",
    new Date().toISOString(),
    input.id
  );
}

async function planRunSteps(input: {
  run: AgentTaskRun;
  user: User;
  signal: AbortSignal;
}): Promise<AgentTaskRunDetail> {
  const workspaceContext = await buildAiWorkspaceContext(input.user);
  const planned = await planWorkspaceActions({
    messages: [
      {
        role: "system",
        content: buildAiSystemPrompt(input.run.mode, workspaceContext),
      },
      { role: "user", content: input.run.prompt },
    ],
    mode: input.run.mode,
    signal: input.signal,
    conversationId: input.run.id,
    user: input.user,
  });

  const actions = Array.isArray(planned.plan?.actions)
    ? planned.plan.actions.slice(0, MAX_TASK_STEPS)
    : [];
  insertSteps(input.run.id, actions);
  updateRun({
    id: input.run.id,
    userId: input.user.id,
    status: plannedStatus(actions),
    summary: planned.plan?.reply || planned.completion.content || "没有生成可执行步骤。",
  });

  return getAgentTaskRunDetail(input.run.id, input.user.id)!;
}

export function listAgentTaskRuns(userId: string): AgentTaskRun[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM agent_task_runs WHERE user_id = ? ORDER BY updated_at DESC LIMIT 40")
    .all(userId) as RunRow[];
  return rows.map(toRun);
}

export function getAgentTaskRun(id: string, userId: string): AgentTaskRun | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM agent_task_runs WHERE id = ? AND user_id = ?")
    .get(id, userId) as RunRow | undefined;
  return row ? toRun(row) : null;
}

export function getAgentTaskRunDetail(id: string, userId: string): AgentTaskRunDetail | null {
  const run = getAgentTaskRun(id, userId);
  if (!run) return null;
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM agent_task_steps WHERE run_id = ? ORDER BY order_index ASC")
    .all(id) as StepRow[];
  return { ...run, steps: rows.map(toStep) };
}

export async function executeAgentTaskRun(
  id: string,
  user: User,
  signal?: AbortSignal
): Promise<AgentTaskRunDetail | null> {
  let detail = getAgentTaskRunDetail(id, user.id);
  if (!detail) return null;

  if (detail.steps.length === 0) {
    const controller = signal ? null : new AbortController();
    const timeout = controller ? setTimeout(() => controller.abort(), 180_000) : null;
    try {
      detail = await planRunSteps({
        run: detail,
        user,
        signal: signal ?? controller!.signal,
      });
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  const executableSteps = detail.steps.filter(canExecuteStep);
  if (executableSteps.length === 0) {
    updateRun({ id, userId: user.id, status: statusFromSteps(detail.steps) });
    return getAgentTaskRunDetail(id, user.id);
  }

  updateRun({ id, userId: user.id, status: "running" });
  const projectRefs = new Map<string, string>();
  for (const step of detail.steps) {
    if (step.status === "completed" && step.ref && step.resourceId) {
      projectRefs.set(step.ref, step.resourceId);
    }
  }

  for (const step of detail.steps) {
    if (!canExecuteStep(step)) continue;
    updateStep({ id: step.id, status: "running" });
    const result = await executeWorkspaceAction({
      action: { action: step.action, ref: step.ref, data: step.payload },
      user,
      projectRefs,
    });
    updateStep({
      id: step.id,
      status: result.ok ? "completed" : "failed",
      result: result.ok ? result.detail : undefined,
      error: result.ok ? undefined : result.detail,
      resource: result.resource,
      resourceId: result.resourceId,
    });
  }

  const next = getAgentTaskRunDetail(id, user.id);
  if (!next) return null;
  updateRun({
    id,
    userId: user.id,
    status: statusFromSteps(next.steps),
  });
  return getAgentTaskRunDetail(id, user.id);
}

export async function createAndRunAgentTask(input: {
  prompt: string;
  mode: AiMode;
  user: User;
  signal: AbortSignal;
}): Promise<AgentTaskRunDetail> {
  const run = insertRun({
    userId: input.user.id,
    title: titleFromPrompt(input.prompt),
    prompt: input.prompt,
    mode: input.mode,
    status: "planning",
  });

  try {
    await planRunSteps({ run, user: input.user, signal: input.signal });
    const executed = await executeAgentTaskRun(run.id, input.user, input.signal);
    return executed ?? getAgentTaskRunDetail(run.id, input.user.id)!;
  } catch (error) {
    updateRun({
      id: run.id,
      userId: input.user.id,
      status: "failed",
      summary: error instanceof Error ? error.message : "Agent 任务创建失败。",
    });
    return getAgentTaskRunDetail(run.id, input.user.id)!;
  }
}

export function recordWorkspaceAgentTask(input: {
  prompt: string;
  mode: AiMode;
  user: User;
  summary: string;
  actions: WorkspaceAgentAction[];
  results: WorkspaceActionResult[];
}): AgentTaskRunDetail | null {
  if (input.actions.length === 0) return null;

  const run = insertRun({
    userId: input.user.id,
    title: titleFromPrompt(input.prompt),
    prompt: input.prompt,
    mode: input.mode,
    status: "running",
  });
  insertSteps(run.id, input.actions);
  const detail = getAgentTaskRunDetail(run.id, input.user.id);
  if (!detail) return null;

  detail.steps.forEach((step, index) => {
    const result = input.results[index];
    if (!result) {
      updateStep({
        id: step.id,
        status: "failed",
        error: "执行结果未返回。",
      });
      return;
    }
    updateStep({
      id: step.id,
      status: result.ok ? "completed" : result.requiresApproval ? "blocked" : "failed",
      result: result.ok || result.requiresApproval ? result.detail : undefined,
      error: !result.ok && !result.requiresApproval ? result.detail : undefined,
      resource: result.resource,
      resourceId: result.resourceId,
    });
  });

  const completed = getAgentTaskRunDetail(run.id, input.user.id);
  if (!completed) return null;
  updateRun({
    id: run.id,
    userId: input.user.id,
    status: statusFromSteps(completed.steps),
    summary: input.summary,
  });
  return getAgentTaskRunDetail(run.id, input.user.id);
}
