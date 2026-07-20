"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type {
  AgentTaskRun,
  AgentTaskRunDetail,
  AgentTaskStatus,
  AgentTaskStep,
  AgentTaskStepStatus,
  AiMode,
} from "@/lib/types";

const modeOptions: { value: AiMode; label: string }[] = [
  { value: "strategy", label: "策略" },
  { value: "content", label: "文案" },
  { value: "review", label: "复盘" },
  { value: "deep", label: "深度" },
];

const runStatusLabel: Record<AgentTaskStatus, string> = {
  planning: "规划中",
  running: "执行中",
  completed: "已完成",
  failed: "需处理",
  blocked: "待接入",
};

const stepStatusLabel: Record<AgentTaskStepStatus, string> = {
  pending: "待执行",
  running: "执行中",
  completed: "已完成",
  failed: "失败",
  blocked: "待接入",
};

const statusClass: Record<AgentTaskStatus | AgentTaskStepStatus, string> = {
  planning: "border-sky-300/40 bg-sky-300/10 text-sky-100",
  running: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  completed: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  failed: "border-red-300/40 bg-red-300/10 text-red-100",
  blocked: "border-violet-300/40 bg-violet-300/10 text-violet-100",
  pending: "border-line bg-paper-soft text-ink-soft",
};

const starters = [
  "帮我新建一个下周B站内容项目，并拆成5个任务。",
  "采集今天B站热门内容，生成6条灵感放进灵感库。",
  "整理内容雷达生成的灵感标签，统一成 AI选题 和 B站热门。",
  "判断我们下周账号增长要做什么，能执行的先执行，外部平台动作也列出来。",
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function preview(text: string, max = 64) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max)}...` : compact;
}

function payloadPreview(payload: Record<string, unknown>) {
  const values = ["name", "title", "category", "projectName"]
    .map((key) => payload[key])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  if (values.length > 0) return values.join(" · ");
  return JSON.stringify(payload).slice(0, 120);
}

function resourceHref(step: AgentTaskStep) {
  if (!step.resourceId) return "";
  if (step.resource === "projects") return `/projects/${step.resourceId}`;
  if (step.resource === "progress") return `/progress/${step.resourceId}`;
  if (step.resource === "inspiration") return "/inspiration";
  if (step.resource === "library") return "/library";
  return "";
}

function hasExecutableStep(run: AgentTaskRunDetail) {
  return run.steps.some(
    (step) => !step.requiresApproval && step.status !== "completed" && step.status !== "blocked"
  );
}

function stepDetail(step: AgentTaskStep) {
  if (step.result || step.error) return step.result || step.error;
  if (step.status === "blocked") {
    return "Agent 已经把这个动作规划进任务流；当前还没有接入对应工具或账号授权，等待接入后执行。";
  }
  return payloadPreview(step.payload);
}

export default function AgentTaskCenter({
  initialRuns,
  initialRun,
}: {
  initialRuns: AgentTaskRun[];
  initialRun: AgentTaskRunDetail | null;
}) {
  const [runs, setRuns] = useState<AgentTaskRun[]>(initialRuns);
  const [activeRun, setActiveRun] = useState<AgentTaskRunDetail | null>(initialRun);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<AiMode>("strategy");
  const [pending, setPending] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeRunHasExecutableStep = activeRun ? hasExecutableStep(activeRun) : false;
  const canContinue = !!activeRun && !pending && (activeRun.steps.length === 0 || activeRunHasExecutableStep);
  const continueLabel = !activeRun
    ? "继续执行"
    : activeRun.steps.length === 0
      ? "重新规划执行"
      : activeRun.status === "completed"
        ? "已完成"
        : activeRun.status === "blocked" && !activeRunHasExecutableStep
          ? "等待接入"
          : "继续执行";

  function mergeRun(run: AgentTaskRunDetail) {
    setRuns((current) => {
      const rest = current.filter((item) => item.id !== run.id);
      return [run, ...rest].sort(
        (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
      );
    });
    setActiveRun(run);
  }

  async function loadRun(id: string) {
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/ai/tasks/${id}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "加载执行任务失败。");
        return;
      }
      setActiveRun(data.run as AgentTaskRunDetail);
    } catch {
      setError("加载执行任务失败。");
    } finally {
      setLoadingId(null);
    }
  }

  async function createRun(text?: string) {
    const content = (text ?? prompt).trim();
    if (!content || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: content, mode }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "创建执行任务失败。");
        return;
      }
      mergeRun(data.run as AgentTaskRunDetail);
      setPrompt("");
    } catch {
      setError("创建执行任务失败。");
    } finally {
      setPending(false);
    }
  }

  async function continueRun() {
    if (!activeRun || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/tasks/${activeRun.id}/run`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "继续执行失败。");
        return;
      }
      mergeRun(data.run as AgentTaskRunDetail);
    } catch {
      setError("继续执行失败。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-8">
      <aside className="flex flex-col gap-5">
        <section className="rounded-2xl border border-line/70 bg-card p-5">
          <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-accent">Command</p>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={5}
            placeholder="告诉 agent 要完成什么，它会自主拆步骤；能执行的会直接跑，未接平台会进入待接入..."
            className="w-full resize-none rounded-xl border border-line bg-paper px-4 py-3 text-sm leading-relaxed text-ink outline-none transition-colors focus:border-accent"
          />
          <div className="mt-3 grid grid-cols-4 gap-2">
            {modeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                className={`rounded-lg border px-2 py-2 text-xs transition-colors ${
                  mode === option.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line text-ink-soft hover:border-accent/50 hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => createRun()}
            disabled={pending || !prompt.trim()}
            className="mt-3 w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-45"
          >
            {pending ? "Agent 执行中" : "创建并执行"}
          </button>
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </section>

        <section className="rounded-2xl border border-line/70 bg-card p-5">
          <p className="mb-4 text-[11px] uppercase tracking-[0.24em] text-accent">Starter</p>
          <div className="flex flex-col gap-2">
            {starters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => createRun(item)}
                disabled={pending}
                className="rounded-xl border border-line bg-paper/70 px-3.5 py-3 text-left text-xs leading-relaxed text-ink-soft transition-colors hover:border-accent/50 hover:text-ink disabled:opacity-50"
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line/70 bg-card p-5">
          <p className="mb-4 text-[11px] uppercase tracking-[0.24em] text-accent">Runs</p>
          <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => loadRun(run.id)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  activeRun?.id === run.id
                    ? "border-accent bg-accent/10"
                    : "border-line bg-paper/60 hover:border-accent/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 text-sm font-medium text-ink">{run.title}</span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${statusClass[run.status]}`}>
                    {runStatusLabel[run.status]}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-ink-soft">{formatTime(run.updatedAt)}</p>
                {loadingId === run.id && <p className="mt-1 text-[11px] text-accent">加载中</p>}
              </button>
            ))}
            {runs.length === 0 && <p className="text-sm text-ink-soft">还没有执行任务。</p>}
          </div>
        </section>
      </aside>

      <section className="min-h-[760px] rounded-2xl border border-line/70 bg-card p-5 sm:p-6">
        {activeRun ? (
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line/70 pb-5">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusClass[activeRun.status]}`}>
                    {runStatusLabel[activeRun.status]}
                  </span>
                  <span className="text-xs text-ink-soft">{formatTime(activeRun.updatedAt)}</span>
                </div>
                <h2 className="font-serif-display text-3xl text-ink">{activeRun.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">
                  {activeRun.summary || preview(activeRun.prompt, 180)}
                </p>
              </div>
              <button
                type="button"
                onClick={continueRun}
                disabled={!canContinue}
                className="rounded-xl border border-line bg-paper-soft px-4 py-2.5 text-sm text-ink-soft transition-colors hover:border-accent/50 hover:text-ink disabled:border-line/50 disabled:bg-paper/40 disabled:text-ink-soft/40"
              >
                {continueLabel}
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {activeRun.steps.map((step, index) => {
                const href = resourceHref(step);
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.16) }}
                    className="rounded-xl border border-line bg-paper/70 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-accent">
                          Step {index + 1} · {step.action}
                        </p>
                        <h3 className="mt-1 text-base font-medium text-ink">{step.title}</h3>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusClass[step.status]}`}>
                        {stepStatusLabel[step.status]}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                      {stepDetail(step)}
                    </p>
                    {href && (
                      <Link
                        href={href}
                        className="mt-3 inline-flex text-xs text-accent hover:underline"
                      >
                        查看结果
                      </Link>
                    )}
                  </motion.div>
                );
              })}
              {activeRun.steps.length === 0 && (
                <p className="rounded-xl border border-line bg-paper/60 p-4 text-sm text-ink-soft">
                  这次任务还没有生成步骤，可以点“重新规划执行”让 agent 用最新工具能力再拆一次。
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[620px] flex-col justify-center">
            <p className="font-serif-display text-3xl text-ink">把一句话变成执行流。</p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
              Agent 会先自主判断完整路径；已接入的站内动作会自动执行，外部平台、账号和高风险动作会保留为待接入步骤。
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
