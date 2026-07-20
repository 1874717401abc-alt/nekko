"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type {
  AiAttachment,
  AiConversation,
  AiConversationSummary,
  AiMessage,
  AiMode,
} from "@/lib/types";

type SnapshotItem = {
  label: string;
  value: string;
};

const modeOptions: { value: AiMode; label: string }[] = [
  { value: "strategy", label: "策略" },
  { value: "content", label: "文案" },
  { value: "review", label: "复盘" },
  { value: "deep", label: "深度" },
];

const starterPrompts = [
  "根据现在的项目和任务，本周最该优先推进哪三件事？",
  "把最近的灵感和资料整理成 5 个短视频选题。",
  "看看工作台里有哪些项目风险和卡点，给我行动建议。",
  "为一个正在进行的任务写一版拍摄脚本和发布文案。",
];

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatConversationTime(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}

function formatSize(size?: number) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function attachmentSummary(attachments: AiAttachment[]) {
  if (attachments.length === 0) return "";
  return attachments.map((item) => item.name).join("、");
}

function trimPreview(text?: string) {
  if (!text) return "暂无消息";
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 42 ? `${compact.slice(0, 42)}...` : compact;
}

export default function AIAssistant({
  snapshot,
  initialConversations,
  initialConversation,
  initialMessages,
}: {
  snapshot: SnapshotItem[];
  initialConversations: AiConversationSummary[];
  initialConversation: AiConversation | null;
  initialMessages: AiMessage[];
}) {
  const [conversations, setConversations] =
    useState<AiConversationSummary[]>(initialConversations);
  const [activeConversation, setActiveConversation] =
    useState<AiConversation | null>(initialConversation);
  const [messages, setMessages] = useState<AiMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AiMode>("strategy");
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSend = (input.trim().length > 0 || attachments.length > 0) && !pending && !uploading;

  const visibleStarters = useMemo(() => starterPrompts.slice(0, 4), []);

  const loadConversation = useCallback(async (id: string) => {
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
    } catch {
      setError("加载对话失败。");
    }
  }, []);

  const loadConversations = useCallback(
    async (selectId?: string, selectFirst = false) => {
      setLoading(true);
      try {
        const res = await fetch("/api/ai/conversations");
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error ?? "加载对话失败。");
          return;
        }
        const list = (data.conversations ?? []) as AiConversationSummary[];
        setConversations(list);
        if (selectId) {
          await loadConversation(selectId);
        } else if (selectFirst && list.length > 0) {
          await loadConversation(list[0].id);
        }
      } catch {
        setError("加载对话失败。");
      } finally {
        setLoading(false);
      }
    },
    [loadConversation]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  function startNewConversation() {
    setActiveConversation(null);
    setMessages([]);
    setInput("");
    setAttachments([]);
    setError(null);
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
      if (activeConversation?.id === id) {
        startNewConversation();
      }
    } catch {
      setError("删除失败。");
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

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((item) => item.id !== id));
  }

  async function sendMessage(prompt?: string) {
    const content = (prompt ?? input).trim();
    if ((!content && attachments.length === 0) || pending || uploading) return;

    const localUserMessage: AiMessage = {
      id: `local-${makeId()}`,
      conversationId: activeConversation?.id ?? "pending",
      userId: "me",
      role: "user",
      content: content || "请分析我上传的附件。",
      attachments,
      createdAt: new Date().toISOString(),
    };
    const currentAttachments = attachments;
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
        setError(data?.error ?? "AI 助手暂时不可用。");
        setMessages((current) => current.filter((item) => item.id !== localUserMessage.id));
        setAttachments(currentAttachments);
        return;
      }

      setActiveConversation(data.conversation as AiConversation);
      setMessages((data.messages ?? []) as AiMessage[]);
      await loadConversations((data.conversation as AiConversation).id);
    } catch {
      setError("网络请求失败，请稍后重试。");
      setMessages((current) => current.filter((item) => item.id !== localUserMessage.id));
      setAttachments(currentAttachments);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-8">
      <aside className="flex flex-col gap-6">
        <section className="rounded-2xl border border-line/70 bg-card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-accent">Chats</p>
            <button
              type="button"
              onClick={startNewConversation}
              className="text-xs px-3 py-1.5 rounded-full border border-line text-ink-soft hover:border-accent/50 hover:text-ink transition-colors"
            >
              新对话
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-[310px] overflow-y-auto pr-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group rounded-xl border p-3 transition-colors ${
                  activeConversation?.id === conversation.id
                    ? "border-accent bg-accent/10"
                    : "border-line bg-paper/60 hover:border-accent/50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => loadConversation(conversation.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-ink">{conversation.title}</p>
                    <span className="shrink-0 text-[11px] text-ink-soft">
                      {formatConversationTime(conversation.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft line-clamp-2">
                    {trimPreview(conversation.lastMessage)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => deleteConversation(conversation.id)}
                  className="mt-2 text-[11px] text-ink-soft opacity-0 transition-opacity hover:text-red-300 group-hover:opacity-100"
                >
                  删除
                </button>
              </div>
            ))}
            {!loading && conversations.length === 0 && (
              <p className="text-sm text-ink-soft">还没有保存的 AI 对话。</p>
            )}
            {loading && <p className="text-sm text-ink-soft">正在加载对话...</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-line/70 bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.24em] text-accent mb-4">Mode</p>
          <div className="grid grid-cols-2 gap-2">
            {modeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                  mode === option.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line text-ink-soft hover:border-accent/50 hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line/70 bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.24em] text-accent mb-4">Snapshot</p>
          <div className="flex flex-col gap-3">
            {snapshot.map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-ink-soft">{item.label}</span>
                <span className="font-serif-display text-xl text-ink">{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <section className="rounded-2xl border border-line/70 bg-card min-h-[690px] flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 sm:p-6">
          {messages.length === 0 ? (
            <div className="h-full min-h-[460px] flex flex-col justify-center">
              <div className="max-w-2xl">
                <p className="font-serif-display text-3xl sm:text-4xl text-ink mb-4">
                  今天先解决哪件事？
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {visibleStarters.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      className="text-left rounded-xl border border-line bg-paper/70 px-4 py-3 text-sm leading-relaxed text-ink-soft transition-colors hover:border-accent/60 hover:text-ink disabled:opacity-60"
                      disabled={pending}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: Math.min(index * 0.015, 0.12) }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[92%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      message.role === "user"
                        ? "bg-accent text-white"
                        : "bg-paper-soft text-ink border border-line/70"
                    }`}
                  >
                    {message.content}
                    {message.attachments.length > 0 && (
                      <div
                        className={`mt-3 flex flex-wrap gap-2 ${
                          message.role === "user" ? "text-white/80" : "text-ink-soft"
                        }`}
                      >
                        {message.attachments.map((attachment) => (
                          <span
                            key={attachment.id}
                            className={`rounded-full px-2.5 py-1 text-[11px] ${
                              message.role === "user" ? "bg-white/15" : "bg-card border border-line"
                            }`}
                          >
                            {attachment.kind === "link" ? "链接" : "文件"} · {attachment.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {pending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-line/70 bg-paper-soft px-4 py-3 text-sm text-ink-soft">
                    正在读取记忆和附件...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-line/70 p-4 sm:p-5">
          {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <span
                  key={attachment.id}
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-paper-soft px-3 py-1.5 text-xs text-ink-soft"
                >
                  <span className="truncate">
                    {attachment.name} {formatSize(attachment.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.id)}
                    className="text-ink-soft hover:text-red-300"
                    aria-label={`移除 ${attachment.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="问问题、粘贴公开链接，或上传文件让它一起分析..."
              rows={2}
              className="min-h-[54px] flex-1 resize-none rounded-xl border border-line bg-paper px-4 py-3 text-sm leading-relaxed text-ink outline-none transition-colors focus:border-accent"
            />
            <div className="flex gap-2 sm:flex-col">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.xml,.pdf,.docx,text/*,application/pdf,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || pending}
                className="rounded-xl border border-line px-4 py-3 text-sm text-ink-soft transition-colors hover:border-accent/50 hover:text-ink disabled:opacity-45"
              >
                {uploading ? "读取中" : "上传"}
              </button>
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={!canSend}
                className="rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-45"
              >
                {pending ? "处理中" : "发送"}
              </button>
            </div>
          </div>
          {attachments.length > 0 && (
            <p className="mt-2 text-[11px] text-ink-soft">
              已读取：{attachmentSummary(attachments)}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
