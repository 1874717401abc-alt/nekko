"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUp,
  Check,
  Circle,
  Clock3,
  ExternalLink,
  History,
  LoaderCircle,
  Pause,
  Play,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
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
  planning: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  running: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  completed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  failed: "border-red-400/30 bg-red-400/10 text-red-300",
  blocked: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  pending: "border-line bg-paper-soft text-ink-soft",
};

const starters = [
  "规划下周 B 站内容，并拆成可执行任务",
  "采集今日热门，生成 6 条选题灵感",
  "复盘本周内容表现并制定增长动作",
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
    return "动作已进入执行流，接入对应工具或账号授权后即可继续。";
  }
  return payloadPreview(step.payload);
}

function StatusIcon({ status }: { status: AgentTaskStepStatus }) {
  const iconClass = "h-4 w-4";
  if (status === "completed") return <Check className={iconClass} strokeWidth={2.2} />;
  if (status === "running") return <LoaderCircle className={`${iconClass} animate-spin`} />;
  if (status === "failed") return <AlertCircle className={iconClass} />;
  if (status === "blocked") return <Pause className={iconClass} />;
  return <Circle className={iconClass} />;
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
  const continueLabel = pending
    ? "执行中"
    : !activeRun
      ? "继续执行"
      : activeRun.steps.length === 0
        ? "重新规划"
        : activeRun.status === "completed"
          ? "已完成"
          : activeRun.status === "blocked" && !activeRunHasExecutableStep
            ? "等待接入"
            : "继续执行";
  const completedSteps = activeRun?.steps.filter((step) => step.status === "completed").length ?? 0;
  const totalSteps = activeRun?.steps.length ?? 0;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  function mergeRun(run: AgentTaskRunDetail) {
    setRuns((current) => {
      const rest = current.filter((item) => item.id !== run.id);
      return [run, ...rest].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
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
    <div
      data-testid="agent-task-center"
      className="flex flex-col overflow-hidden rounded-lg border border-line bg-card shadow-[0_18px_60px_rgba(0,0,0,0.16)] lg:grid lg:h-[calc(100vh-154px)] lg:min-h-[700px] lg:max-h-[940px] lg:grid-cols-[330px_minmax(0,1fr)]"
    >
      <aside className="contents lg:flex lg:min-h-0 lg:flex-col lg:border-r lg:border-line">
        <section className="order-1 border-b border-line p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" strokeWidth={1.8} />
              <h2 className="text-sm font-medium text-ink">新任务</h2>
            </div>
            <span className="text-[11px] text-ink-soft">Hermes Agent</span>
          </div>

          <div className="overflow-hidden rounded-md border border-line bg-paper">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  createRun();
                }
              }}
              rows={4}
              placeholder="交代目标，Agent 会自主规划并执行"
              className="block w-full resize-none bg-transparent px-3.5 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-soft/65"
            />
            <div className="flex items-center justify-between border-t border-line p-2">
              <div className="flex rounded-md bg-paper-soft p-0.5" aria-label="任务模式">
                {modeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    className={`h-8 rounded px-2 text-[11px] transition-colors ${
                      mode === option.value ? "bg-card text-ink shadow-sm" : "text-ink-soft hover:text-ink"
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
                aria-label="创建并执行任务"
                className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-white transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-35"
              >
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" strokeWidth={2.2} />}
              </button>
            </div>
          </div>
          {error && <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-red-300"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
        </section>

        <section className="order-2 border-b border-line px-4 py-4 sm:px-5">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-ink-soft" strokeWidth={1.8} />
            <h2 className="text-xs font-medium text-ink-soft">快捷任务</h2>
          </div>
          <div className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:overflow-visible lg:pb-0">
            {starters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => createRun(item)}
                disabled={pending}
                className="min-w-[240px] snap-start rounded-md border border-line bg-paper px-3 py-2.5 text-left text-xs leading-relaxed text-ink-soft transition-colors hover:border-ink-soft/50 hover:text-ink disabled:opacity-50 lg:min-w-0"
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="order-4 min-h-0 border-t border-line p-4 sm:p-5 lg:flex lg:flex-1 lg:flex-col lg:border-t-0">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-ink-soft" strokeWidth={1.8} />
              <h2 className="text-xs font-medium text-ink-soft">执行历史</h2>
            </div>
            <span className="text-[11px] text-ink-soft/70">{runs.length}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0 lg:pr-1">
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => loadRun(run.id)}
                className={`min-w-[250px] rounded-md border px-3 py-3 text-left transition-colors lg:min-w-0 ${
                  activeRun?.id === run.id
                    ? "border-accent/45 bg-accent-soft"
                    : "border-transparent bg-paper hover:border-line"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${run.status === "completed" ? "bg-emerald-400" : run.status === "failed" ? "bg-red-400" : run.status === "blocked" ? "bg-violet-400" : "bg-amber-400"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-ink">{run.title}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-ink-soft">
                      <span>{runStatusLabel[run.status]}</span>
                      <span>{loadingId === run.id ? "加载中" : formatTime(run.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {runs.length === 0 && (
              <div className="flex min-h-24 min-w-[250px] items-center justify-center rounded-md border border-dashed border-line px-4 text-xs text-ink-soft lg:min-w-0">
                暂无执行记录
              </div>
            )}
          </div>
        </section>
      </aside>

      <section className="order-3 min-w-0 bg-paper/35 lg:min-h-0 lg:overflow-y-auto" data-testid="agent-run-detail">
        {activeRun ? (
          <div>
            <header className="border-b border-line p-5 sm:p-7 lg:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 max-w-3xl">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] ${statusClass[activeRun.status]}`}>
                      {runStatusLabel[activeRun.status]}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-ink-soft"><Clock3 className="h-3.5 w-3.5" />{formatTime(activeRun.updatedAt)}</span>
                  </div>
                  <h2 className="text-xl font-semibold leading-snug text-ink sm:text-2xl">{activeRun.title}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">{activeRun.summary || preview(activeRun.prompt, 180)}</p>
                </div>
                <button
                  type="button"
                  onClick={continueRun}
                  disabled={!canContinue}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-line bg-card px-4 text-sm font-medium text-ink transition-colors hover:border-ink-soft/60 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" fill="currentColor" />}
                  {continueLabel}
                </button>
              </div>

              <div className="mt-6 grid grid-cols-[1fr_auto] items-end gap-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-[11px] text-ink-soft">
                    <span>执行进度</span>
                    <span>{completedSteps} / {totalSteps}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-paper-soft">
                    <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <span className="text-sm font-medium text-ink">{progress}%</span>
              </div>
            </header>

            <div className="p-5 sm:p-7 lg:p-8">
              <div className="mb-2 flex items-center gap-2">
                <Workflow className="h-4 w-4 text-accent" strokeWidth={1.8} />
                <h3 className="text-sm font-medium text-ink">执行路径</h3>
              </div>
              <div>
                {activeRun.steps.map((step, index) => {
                  const href = resourceHref(step);
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.15) }}
                      className="grid grid-cols-[34px_minmax(0,1fr)] gap-x-3 border-b border-line/70 py-5 last:border-b-0 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:gap-x-4"
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${statusClass[step.status]}`}>
                        <StatusIcon status={step.status} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-ink-soft">{String(index + 1).padStart(2, "0")} · {step.action.replaceAll("_", " ")}</p>
                        <h4 className="mt-1 text-sm font-medium text-ink sm:text-base">{step.title}</h4>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-soft">{stepDetail(step)}</p>
                        {href && (
                          <Link href={href} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
                            查看结果 <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                        <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] sm:hidden ${statusClass[step.status]}`}>
                          {stepStatusLabel[step.status]}
                        </span>
                      </div>
                      <span className={`hidden self-start rounded-full border px-2.5 py-1 text-[11px] sm:inline-flex ${statusClass[step.status]}`}>
                        {stepStatusLabel[step.status]}
                      </span>
                    </motion.div>
                  );
                })}
                {activeRun.steps.length === 0 && (
                  <div className="mt-5 flex min-h-36 flex-col items-center justify-center rounded-md border border-dashed border-line px-6 text-center">
                    <Workflow className="mb-3 h-6 w-6 text-ink-soft" strokeWidth={1.5} />
                    <p className="text-sm text-ink">尚未生成执行步骤</p>
                    <p className="mt-1 text-xs text-ink-soft">重新规划后会在这里显示完整路径</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[390px] items-center justify-center px-6 py-16 lg:h-full lg:min-h-0">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-line bg-card">
                <Workflow className="h-7 w-7 text-accent" strokeWidth={1.5} />
              </div>
              <h2 className="mt-5 text-lg font-semibold text-ink">尚无执行任务</h2>
              <p className="mt-2 text-sm text-ink-soft">输入目标，开始第一项执行任务</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
