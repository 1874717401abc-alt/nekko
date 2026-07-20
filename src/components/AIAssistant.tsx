"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Bot,
  Check,
  Circle,
  Clock3,
  ExternalLink,
  FileText,
  History,
  LoaderCircle,
  MessageSquare,
  Paperclip,
  Pause,
  Play,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Workflow,
  X,
} from "lucide-react";
import type { AgentStatus } from "@/lib/aiAgent";
import type {
  AgentTaskRun,
  AgentTaskRunDetail,
  AgentTaskStatus,
  AgentTaskStep,
  AgentTaskStepStatus,
  AiAttachment,
  AiConversation,
  AiConversationSummary,
  AiMessage,
  AiMode,
} from "@/lib/types";

type SnapshotItem = { label: string; value: string };
type MobileView = "chat" | "runs" | "history";

const modeOptions: { value: AiMode; label: string }[] = [
  { value: "strategy", label: "策略" },
  { value: "content", label: "文案" },
  { value: "review", label: "复盘" },
  { value: "deep", label: "深度" },
];

const starterPrompts = [
  { label: "整理灵感库", prompt: "帮我智能整理整个灵感库，统一主题标签并标记疑似重复内容。" },
  { label: "采集今日选题", prompt: "采集今天 B站热门内容，生成 6 条可执行选题灵感。" },
  { label: "安排本周工作", prompt: "根据现在的项目和任务，安排本周最该优先推进的三件事。" },
  { label: "创建内容项目", prompt: "新建一个本周选题项目，并拆成 5 个执行任务。" },
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
  planning: "border-sky-400/35 bg-sky-400/10 text-sky-500",
  running: "border-amber-400/35 bg-amber-400/10 text-amber-500",
  completed: "border-emerald-400/35 bg-emerald-400/10 text-emerald-500",
  failed: "border-red-400/35 bg-red-400/10 text-red-500",
  blocked: "border-violet-400/35 bg-violet-400/10 text-violet-500",
  pending: "border-line bg-paper-soft text-ink-soft",
};

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(size?: number) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function preview(text?: string, max = 56) {
  if (!text) return "暂无消息";
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max)}...` : compact;
}

function resourceHref(step: AgentTaskStep) {
  if (!step.resourceId) return "";
  if (step.resource === "projects") return `/projects/${step.resourceId}`;
  if (step.resource === "progress") return `/progress/${step.resourceId}`;
  if (step.resource === "inspiration") return "/inspiration";
  if (step.resource === "library") return "/library";
  return "";
}

function stepDetail(step: AgentTaskStep) {
  if (step.result || step.error) return step.result || step.error;
  const values = ["name", "title", "category", "projectName"]
    .map((key) => step.payload[key])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return values.join(" · ") || "等待 Agent 执行";
}

function hasExecutableStep(run: AgentTaskRunDetail) {
  return run.steps.some(
    (step) => !step.requiresApproval && step.status !== "completed" && step.status !== "blocked"
  );
}

function StatusIcon({ status }: { status: AgentTaskStepStatus }) {
  const className = "h-3.5 w-3.5";
  if (status === "completed") return <Check className={className} strokeWidth={2.2} />;
  if (status === "running") return <LoaderCircle className={`${className} animate-spin`} />;
  if (status === "failed") return <AlertCircle className={className} />;
  if (status === "blocked") return <Pause className={className} />;
  return <Circle className={className} />;
}

export default function AIAssistant({
  snapshot,
  initialConversations,
  initialConversation,
  initialMessages,
  initialRuns,
  initialRun,
  agentStatus,
}: {
  snapshot: SnapshotItem[];
  initialConversations: AiConversationSummary[];
  initialConversation: AiConversation | null;
  initialMessages: AiMessage[];
  initialRuns: AgentTaskRun[];
  initialRun: AgentTaskRunDetail | null;
  agentStatus: AgentStatus;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConversation, setActiveConversation] = useState<AiConversation | null>(
    initialConversation
  );
  const [messages, setMessages] = useState(initialMessages);
  const [runs, setRuns] = useState(initialRuns);
  const [activeRun, setActiveRun] = useState<AgentTaskRunDetail | null>(initialRun);
  const [mobileView, setMobileView] = useState<MobileView>("chat");
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AiMode>(initialConversation?.mode ?? "strategy");
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [loadingRunId, setLoadingRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSend = (input.trim().length > 0 || attachments.length > 0) && !pending && !uploading;
  const agentStatusLabel = agentStatus.healthy ? "在线" : agentStatus.configured ? "降级" : "未配置";

  const completedSteps = activeRun?.steps.filter((step) => step.status === "completed").length ?? 0;
  const totalSteps = activeRun?.steps.length ?? 0;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const canContinue = !!activeRun && !pending && hasExecutableStep(activeRun);
  const visibleStarters = useMemo(() => starterPrompts, []);

  const loadConversation = useCallback(async (id: string) => {
    setLoadingConversation(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/conversations/${id}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "加载对话失败。");
        return;
      }
      const conversation = data.conversation as AiConversation;
      setActiveConversation(conversation);
      setMode(conversation.mode);
      setMessages((data.messages ?? []) as AiMessage[]);
      setAttachments([]);
      setInput("");
      setMobileView("chat");
    } catch {
      setError("加载对话失败。");
    } finally {
      setLoadingConversation(false);
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/conversations");
      const data = await res.json().catch(() => null);
      if (res.ok) setConversations((data.conversations ?? []) as AiConversationSummary[]);
    } catch {
      // The active conversation remains usable if refreshing its list fails.
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  function startNewConversation() {
    setActiveConversation(null);
    setMessages([]);
    setInput("");
    setAttachments([]);
    setError(null);
    setMobileView("chat");
  }

  async function deleteConversation(id: string) {
    if (!window.confirm("确定删除这个 AI 对话吗？")) return;
    setError(null);
    try {
      const res = await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "删除失败。");
        return;
      }
      setConversations((current) => current.filter((item) => item.id !== id));
      if (activeConversation?.id === id) startNewConversation();
    } catch {
      setError("删除失败。");
    }
  }

  function mergeRun(run: AgentTaskRunDetail) {
    setRuns((current) => [run, ...current.filter((item) => item.id !== run.id)]);
    setActiveRun(run);
  }

  async function loadRun(id: string) {
    setLoadingRunId(id);
    setError(null);
    try {
      const res = await fetch(`/api/ai/tasks/${id}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "加载执行记录失败。");
        return;
      }
      setActiveRun(data.run as AgentTaskRunDetail);
      setMobileView("runs");
    } catch {
      setError("加载执行记录失败。");
    } finally {
      setLoadingRunId(null);
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

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files).slice(0, 5)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/ai/files", { method: "POST", body: form });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error ?? `${file.name} 解析失败。`);
          continue;
        }
        setAttachments((current) => [...current, data.attachment as AiAttachment].slice(0, 6));
      }
    } catch {
      setError("文件上传失败。");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function sendMessage(prompt?: string) {
    const content = (prompt ?? input).trim();
    if ((!content && attachments.length === 0) || pending || uploading) return;

    const currentAttachments = attachments;
    const localUserMessage: AiMessage = {
      id: `local-${makeId()}`,
      conversationId: activeConversation?.id ?? "pending",
      userId: "me",
      role: "user",
      content: content || "请分析我上传的附件。",
      attachments: currentAttachments,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, localUserMessage]);
    setInput("");
    setAttachments([]);
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversation?.id,
          mode,
          message: content,
          attachments: currentAttachments,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "AI Agent 暂时不可用。");
        setMessages((current) => current.filter((item) => item.id !== localUserMessage.id));
        setAttachments(currentAttachments);
        return;
      }
      setActiveConversation(data.conversation as AiConversation);
      setMessages((data.messages ?? []) as AiMessage[]);
      if (data.run) mergeRun(data.run as AgentTaskRunDetail);
      await refreshConversations();
    } catch {
      setError("网络请求失败，请稍后重试。");
      setMessages((current) => current.filter((item) => item.id !== localUserMessage.id));
      setAttachments(currentAttachments);
    } finally {
      setPending(false);
    }
  }

  return (
    <div data-testid="ai-agent-workspace">
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-md border border-line bg-card p-1 xl:hidden">
        {[
          { value: "chat" as const, label: "对话", icon: MessageSquare },
          { value: "runs" as const, label: "执行", icon: Workflow },
          { value: "history" as const, label: "历史", icon: History },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setMobileView(item.value)}
              className={`flex h-9 items-center justify-center gap-2 rounded px-3 text-xs font-medium transition-colors ${
                mobileView === item.value ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid h-[calc(100dvh-248px)] min-h-[520px] overflow-hidden rounded-lg border border-line bg-line xl:h-[calc(100vh-190px)] xl:min-h-[700px] xl:max-h-[920px] xl:grid-cols-[250px_minmax(420px,1fr)_360px] xl:gap-px">
        <aside
          className={`${mobileView === "history" ? "flex" : "hidden"} h-full min-h-0 flex-col bg-card xl:flex`}
        >
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <div>
              <p className="text-sm font-medium text-ink">对话</p>
              <p className="mt-0.5 text-[11px] text-ink-soft">{conversations.length} 个已保存</p>
            </div>
            <button
              type="button"
              onClick={startNewConversation}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink-soft transition-colors hover:border-ink-soft hover:text-ink"
              aria-label="新建对话"
              title="新建对话"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {conversations.map((conversation) => {
              const active = activeConversation?.id === conversation.id;
              return (
                <div
                  key={conversation.id}
                  className={`group mb-1 grid grid-cols-[minmax(0,1fr)_32px] items-center rounded-md border-l-2 ${
                    active ? "border-accent bg-paper-soft" : "border-transparent hover:bg-paper-soft/70"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => loadConversation(conversation.id)}
                    className="min-w-0 px-3 py-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-ink">{conversation.title}</p>
                      <span className="shrink-0 text-[10px] text-ink-soft">
                        {formatDate(conversation.updatedAt)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-ink-soft">
                      {preview(conversation.lastMessage, 34)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteConversation(conversation.id)}
                    className="flex h-8 w-8 items-center justify-center rounded text-ink-soft opacity-60 hover:bg-red-400/10 hover:text-red-500 xl:opacity-0 xl:group-hover:opacity-100"
                    aria-label={`删除 ${conversation.title}`}
                    title="删除对话"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            {loadingConversation && (
              <div className="flex items-center gap-2 px-3 py-4 text-xs text-ink-soft">
                <LoaderCircle className="h-4 w-4 animate-spin" /> 正在加载
              </div>
            )}
            {!loadingConversation && conversations.length === 0 && (
              <div className="px-3 py-10 text-center text-sm text-ink-soft">暂无对话</div>
            )}
          </div>

          <div className="border-t border-line p-4">
            <div className="mb-4 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${agentStatus.healthy ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-xs font-medium text-ink">{agentStatus.label}</span>
              <span className="ml-auto text-[11px] text-ink-soft">{agentStatusLabel}</span>
            </div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-3 border-t border-line pt-3">
              {snapshot.slice(0, 6).map((item) => (
                <div key={item.label} className="min-w-0">
                  <p className="truncate text-[10px] text-ink-soft">{item.label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section
          className={`${mobileView === "chat" ? "flex" : "hidden"} h-full min-h-0 flex-col bg-paper xl:flex`}
        >
          <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-accent" />
                <h2 className="truncate text-sm font-semibold text-ink">
                  {activeConversation?.title ?? "新的对话"}
                </h2>
              </div>
              <p className="mt-1 truncate text-[11px] text-ink-soft">{agentStatus.model}</p>
            </div>
            <div className="grid grid-cols-4 gap-1 rounded-md border border-line bg-card p-1">
              {modeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={`h-7 rounded px-2 text-[11px] transition-colors ${
                    mode === option.value ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {messages.length === 0 ? (
              <div className="mx-auto flex h-full min-h-[420px] max-w-2xl flex-col justify-center">
                <div className="mb-7 flex h-11 w-11 items-center justify-center rounded-md bg-accent text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-2xl font-semibold text-ink sm:text-3xl">今天要让 Agent 做什么？</h3>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {visibleStarters.map((starter) => (
                    <button
                      key={starter.label}
                      type="button"
                      onClick={() => sendMessage(starter.prompt)}
                      disabled={pending}
                      className="group flex min-h-16 items-center justify-between gap-4 rounded-md border border-line bg-card px-4 py-3 text-left transition-colors hover:border-ink-soft disabled:opacity-45"
                    >
                      <span>
                        <span className="block text-sm font-medium text-ink">{starter.label}</span>
                        <span className="mt-1 block text-xs text-ink-soft">{preview(starter.prompt, 28)}</span>
                      </span>
                      <Play className="h-4 w-4 shrink-0 text-accent" fill="currentColor" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-5">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.012, 0.1) }}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[92%] rounded-md px-4 py-3 text-sm leading-6 whitespace-pre-wrap break-words sm:max-w-[82%] ${
                        message.role === "user"
                          ? "bg-ink text-paper"
                          : "border border-line bg-card text-ink"
                      }`}
                    >
                      {message.content}
                      {message.attachments.length > 0 && (
                        <div className="mt-3 border-t border-current/15 pt-2">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center gap-2 text-[11px] opacity-75">
                              <FileText className="h-3.5 w-3.5" />
                              <span className="truncate">{attachment.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {pending && (
                  <div className="flex items-center gap-2 text-sm text-ink-soft">
                    <LoaderCircle className="h-4 w-4 animate-spin text-accent" />
                    正在分析并执行
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-line bg-card p-3 sm:p-4">
            {error && (
              <div className="mb-3 flex items-center gap-2 text-xs text-red-500">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
            {attachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex max-w-full items-center gap-2 rounded border border-line bg-paper px-2.5 py-1.5 text-xs text-ink-soft"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{attachment.name} {formatSize(attachment.size)}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}
                      className="text-ink-soft hover:text-red-500"
                      aria-label={`移除 ${attachment.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-md border border-line bg-paper focus-within:border-ink-soft">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="输入目标、粘贴链接或上传文件"
                rows={2}
                className="min-h-[62px] w-full resize-none bg-transparent px-3.5 py-3 text-sm leading-6 text-ink outline-none"
              />
              <div className="flex items-center justify-between border-t border-line px-2 py-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.xml,.pdf,.docx,text/*,application/pdf,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => handleFiles(event.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || pending}
                  className="flex h-9 items-center gap-2 rounded px-3 text-xs text-ink-soft transition-colors hover:bg-card hover:text-ink disabled:opacity-40"
                >
                  {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  {uploading ? "读取中" : "附件"}
                </button>
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={!canSend}
                  className="flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-xs font-medium text-white transition-opacity disabled:opacity-35"
                >
                  {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {pending ? "执行中" : "发送"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside
          className={`${mobileView === "runs" ? "flex" : "hidden"} h-full min-h-0 flex-col bg-card xl:flex`}
        >
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-accent" />
              <p className="text-sm font-medium text-ink">执行记录</p>
            </div>
            <span className="text-[11px] text-ink-soft">{runs.length} 条</span>
          </div>

          {runs.length > 0 && (
            <div className="max-h-44 overflow-y-auto border-b border-line p-2">
              {runs.slice(0, 8).map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => loadRun(run.id)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                    activeRun?.id === run.id ? "bg-paper-soft" : "hover:bg-paper-soft/70"
                  }`}
                >
                  {loadingRunId === run.id ? (
                    <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-accent" />
                  ) : (
                    <span className={`h-2 w-2 shrink-0 rounded-full border ${statusClass[run.status]}`} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-ink">{run.title}</span>
                    <span className="mt-0.5 block text-[10px] text-ink-soft">{formatTime(run.updatedAt)}</span>
                  </span>
                  <span className="text-[10px] text-ink-soft">{runStatusLabel[run.status]}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {activeRun ? (
              <div>
                <div className="border-b border-line p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded border px-2 py-1 text-[10px] ${statusClass[activeRun.status]}`}>
                      {runStatusLabel[activeRun.status]}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-ink-soft">
                      <Clock3 className="h-3 w-3" /> {formatTime(activeRun.updatedAt)}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold leading-6 text-ink">{activeRun.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-ink-soft">{preview(activeRun.summary || activeRun.prompt, 150)}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-soft">
                      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[11px] font-medium text-ink">{completedSteps}/{totalSteps}</span>
                  </div>
                  {canContinue && (
                    <button
                      type="button"
                      onClick={continueRun}
                      className="mt-4 flex h-9 items-center gap-2 rounded-md border border-line px-3 text-xs font-medium text-ink hover:border-ink-soft"
                    >
                      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" fill="currentColor" />}
                      继续执行
                    </button>
                  )}
                </div>

                <div className="p-4">
                  {activeRun.steps.map((step, index) => {
                    const href = resourceHref(step);
                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.12) }}
                        className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5 border-b border-line py-4 first:pt-0 last:border-b-0"
                      >
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${statusClass[step.status]}`}>
                          <StatusIcon status={step.status} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium leading-5 text-ink">{step.title}</p>
                            <span className="shrink-0 text-[10px] text-ink-soft">{stepStatusLabel[step.status]}</span>
                          </div>
                          <p className="mt-1 text-[11px] leading-5 text-ink-soft">{stepDetail(step)}</p>
                          {href && (
                            <Link href={href} className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline">
                              查看结果 <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  {activeRun.steps.length === 0 && (
                    <div className="py-12 text-center text-sm text-ink-soft">暂无执行步骤</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-8 text-center">
                <Workflow className="h-7 w-7 text-ink-soft" strokeWidth={1.5} />
                <p className="mt-4 text-sm font-medium text-ink">暂无执行记录</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
