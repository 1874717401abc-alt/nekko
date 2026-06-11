"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Avatar from "@/components/Avatar";
import type { ProgressTask } from "@/lib/types";

const easeOut = [0.22, 1, 0.36, 1] as const;

const statusLabels: Record<string, string> = {
  todo: "待开始",
  doing: "进行中",
  done: "已完成",
};

type Member = { id: string; displayName: string; avatarUrl: string };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadTasks(): Promise<ProgressTask[]> {
  const res = await fetch("/api/data/progress");
  return res.json();
}

async function persist(tasks: ProgressTask[]) {
  await fetch("/api/data/progress", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tasks),
  });
}

export default function ProgressTaskDetail({
  initialTask,
  currentUser,
  members,
}: {
  initialTask: ProgressTask;
  currentUser: { id: string; displayName: string; avatarUrl: string };
  members: Member[];
}) {
  const [task, setTask] = useState<ProgressTask>(initialTask);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTask.title);
  const [description, setDescription] = useState(initialTask.description ?? "");
  const [savingInfo, setSavingInfo] = useState(false);

  const [logInput, setLogInput] = useState("");
  const [postingLog, setPostingLog] = useState(false);

  const [commentInput, setCommentInput] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  function memberFor(userId: string, fallbackName: string): Member {
    return members.find((m) => m.id === userId) ?? { id: userId, displayName: fallbackName, avatarUrl: "" };
  }

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSavingInfo(true);
    const updated: ProgressTask = {
      ...task,
      title: title.trim(),
      description: description.trim() || undefined,
    };

    const tasks = await loadTasks();
    const next = tasks.map((t) => (t.id === task.id ? updated : t));
    await persist(next);

    setTask(updated);
    setEditing(false);
    setSavingInfo(false);
  }

  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault();
    if (!logInput.trim()) return;

    setPostingLog(true);
    const updated: ProgressTask = {
      ...task,
      logs: [
        ...(task.logs ?? []),
        {
          id: `log-${Date.now()}`,
          userId: currentUser.id,
          memberName: currentUser.displayName,
          content: logInput.trim(),
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const tasks = await loadTasks();
    const next = tasks.map((t) => (t.id === task.id ? updated : t));
    await persist(next);

    setTask(updated);
    setLogInput("");
    setPostingLog(false);
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentInput.trim()) return;

    setPostingComment(true);
    const updated: ProgressTask = {
      ...task,
      comments: [
        ...(task.comments ?? []),
        {
          id: `comment-${Date.now()}`,
          userId: currentUser.id,
          memberName: currentUser.displayName,
          content: commentInput.trim(),
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const tasks = await loadTasks();
    const next = tasks.map((t) => (t.id === task.id ? updated : t));
    await persist(next);

    setTask(updated);
    setCommentInput("");
    setPostingComment(false);
  }

  return (
    <div className="mt-8 flex flex-col gap-10">
      {/* Section 1 & 2: title + description */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="rounded-2xl border border-line/70 bg-card p-6 sm:p-8"
      >
        {editing ? (
          <form onSubmit={handleSaveInfo} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
                项目名称
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
                项目内容
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setTitle(task.title);
                  setDescription(task.description ?? "");
                  setEditing(false);
                }}
                className="text-sm px-4 py-2 rounded-full border border-line text-ink-soft hover:text-accent hover:border-accent transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={savingInfo}
                className="text-sm px-5 py-2 rounded-full bg-accent text-paper hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {savingInfo ? "保存中…" : "保存"}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-paper-soft text-ink-soft uppercase tracking-[0.2em]">
                {statusLabels[task.status] ?? task.status}
              </span>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-ink-soft hover:text-accent transition-colors shrink-0"
              >
                编辑
              </button>
            </div>
            <h1 className="font-serif-display text-3xl sm:text-4xl text-ink mb-4">{task.title}</h1>
            <p className="text-sm leading-relaxed text-ink whitespace-pre-wrap">
              {task.description || "暂无项目内容描述。"}
            </p>
            <p className="mt-4 text-xs text-ink-soft">
              负责人：{task.assignee} · 由 {task.createdBy} 创建
            </p>
          </div>
        )}
      </motion.section>

      {/* Section 3: progress logs */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: easeOut }}
        className="rounded-2xl border border-line/70 bg-card p-6 sm:p-8"
      >
        <h2 className="font-serif-display text-xl text-ink mb-4">任务进度</h2>

        <form onSubmit={handleAddLog} className="flex flex-col gap-3 mb-6">
          <textarea
            value={logInput}
            onChange={(e) => setLogInput(e.target.value)}
            rows={2}
            placeholder="记录一下做了什么……"
            className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={postingLog || !logInput.trim()}
              className="text-sm px-5 py-2 rounded-full bg-ink text-paper hover:bg-ink/85 transition-colors disabled:opacity-50"
            >
              {postingLog ? "添加中…" : "添加进度"}
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-4">
          {(task.logs ?? [])
            .slice()
            .reverse()
            .map((log) => {
              const member = memberFor(log.userId, log.memberName);
              return (
                <div key={log.id} className="flex items-start gap-3">
                  <Avatar src={member.avatarUrl || undefined} name={member.displayName} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-ink">{log.memberName}</span>
                      <span className="text-[11px] text-ink-soft">{formatTime(log.createdAt)}</span>
                    </div>
                    <p className="text-sm text-ink-soft mt-0.5 whitespace-pre-wrap">{log.content}</p>
                  </div>
                </div>
              );
            })}
          {(task.logs ?? []).length === 0 && (
            <p className="text-sm text-ink-soft">还没有进度记录。</p>
          )}
        </div>
      </motion.section>

      {/* Section 4: comments */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
        className="rounded-2xl border border-line/70 bg-card p-6 sm:p-8"
      >
        <h2 className="font-serif-display text-xl text-ink mb-4">评论区</h2>

        <form onSubmit={handleAddComment} className="flex flex-col gap-3 mb-6">
          <textarea
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            rows={2}
            placeholder="说点什么……"
            className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={postingComment || !commentInput.trim()}
              className="text-sm px-5 py-2 rounded-full bg-ink text-paper hover:bg-ink/85 transition-colors disabled:opacity-50"
            >
              {postingComment ? "发送中…" : "发送评论"}
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-4">
          {(task.comments ?? [])
            .slice()
            .reverse()
            .map((comment) => {
              const member = memberFor(comment.userId, comment.memberName);
              return (
                <div key={comment.id} className="flex items-start gap-3">
                  <Avatar src={member.avatarUrl || undefined} name={member.displayName} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-ink">{comment.memberName}</span>
                      <span className="text-[11px] text-ink-soft">{formatTime(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-ink-soft mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              );
            })}
          {(task.comments ?? []).length === 0 && (
            <p className="text-sm text-ink-soft">还没有评论，来聊聊吧。</p>
          )}
        </div>
      </motion.section>
    </div>
  );
}
