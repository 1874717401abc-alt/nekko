"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { AiMode } from "@/lib/aiWorkspace";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

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

function compactMessages(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

export default function AIAssistant({ snapshot }: { snapshot: SnapshotItem[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AiMode>("strategy");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canSend = input.trim().length > 0 && !pending;

  const visibleStarters = useMemo(() => starterPrompts.slice(0, 4), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  async function sendMessage(prompt?: string) {
    const content = (prompt ?? input).trim();
    if (!content || pending) return;

    const userMessage: ChatMessage = { id: makeId(), role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, messages: compactMessages(nextMessages) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "AI 助手暂时不可用。");
        return;
      }
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: data.message?.content ?? "没有拿到有效回复。",
        },
      ]);
    } catch {
      setError("网络请求失败，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
      <aside className="flex flex-col gap-6">
        <section className="rounded-2xl border border-line/70 bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.24em] text-accent mb-4">
            Mode
          </p>
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
          <p className="text-[11px] uppercase tracking-[0.24em] text-accent mb-4">
            Snapshot
          </p>
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

      <section className="rounded-2xl border border-line/70 bg-card min-h-[620px] flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 sm:p-6">
          {messages.length === 0 ? (
            <div className="h-full min-h-[420px] flex flex-col justify-center">
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
                  </div>
                </motion.div>
              ))}
              {pending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-line/70 bg-paper-soft px-4 py-3 text-sm text-ink-soft">
                    正在整理工作台信息...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-line/70 p-4 sm:p-5">
          {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
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
              placeholder="问问工作室接下来怎么推进..."
              rows={2}
              className="min-h-[52px] flex-1 resize-none rounded-xl border border-line bg-paper px-4 py-3 text-sm leading-relaxed text-ink outline-none transition-colors focus:border-accent"
            />
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={!canSend}
              className="sm:w-24 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-45"
            >
              {pending ? "处理中" : "发送"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
