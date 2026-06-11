"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { ProgressTask, TaskStatus } from "@/lib/types";

const easeOut = [0.22, 1, 0.36, 1] as const;

const columns: { status: TaskStatus; label: string; sub: string }[] = [
  { status: "todo", label: "待开始", sub: "To do" },
  { status: "doing", label: "进行中", sub: "Doing" },
  { status: "done", label: "已完成", sub: "Done" },
];

async function persist(tasks: ProgressTask[]) {
  await fetch("/api/data/progress", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tasks),
  });
}

export default function ProgressBoard({
  initialTasks,
  currentUserName,
}: {
  initialTasks: ProgressTask[];
  currentUserName: string;
}) {
  const [tasks, setTasks] = useState<ProgressTask[]>(initialTasks);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");

  function resetForm() {
    setTitle("");
    setDescription("");
    setAssignee("");
    setShowForm(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: ProgressTask = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      status: "todo",
      assignee: assignee.trim() || "未分配",
      createdAt: new Date().toISOString(),
      createdBy: currentUserName,
    };

    const next = [...tasks, newTask];
    setTasks(next);
    resetForm();
    await persist(next);
  }

  async function moveTask(id: string, direction: 1 | -1) {
    const order: TaskStatus[] = ["todo", "doing", "done"];
    const next = tasks.map((t) => {
      if (t.id !== id) return t;
      const idx = order.indexOf(t.status);
      const newIdx = Math.min(Math.max(idx + direction, 0), order.length - 1);
      return { ...t, status: order[newIdx] };
    });
    setTasks(next);
    await persist(next);
  }

  async function handleDelete(id: string) {
    const next = tasks.filter((t) => t.id !== id);
    setTasks(next);
    await persist(next);
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs px-4 py-1.5 rounded-full bg-ink text-paper hover:bg-ink/85 transition-colors"
        >
          {showForm ? "取消" : "+ 新建任务"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.form
            onSubmit={handleAdd}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: easeOut }}
            className="mb-8 overflow-hidden rounded-2xl border border-line/70 bg-card p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
          <div className="sm:col-span-2">
            <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
              任务名称
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              placeholder="例如：Ep.13 拍摄"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
              负责人
            </label>
            <input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              placeholder="A / B"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="text-sm px-5 py-2.5 rounded-full bg-accent text-paper hover:bg-accent/90 transition-colors"
            >
              添加到「待开始」
            </button>
          </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status);
          return (
            <div key={col.status}>
              <div className="flex items-baseline justify-between mb-4 px-1">
                <h2 className="font-serif-display text-xl text-ink">{col.label}</h2>
                <span className="text-[11px] uppercase tracking-[0.2em] text-ink-soft">
                  {col.sub} · {colTasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <AnimatePresence initial={false}>
                  {colTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.3, ease: easeOut }}
                      className="rounded-2xl border border-line/70 bg-card p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/progress/${task.id}`}
                          className="text-sm font-medium text-ink hover:text-accent transition-colors"
                        >
                          {task.title}
                        </Link>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="text-ink-soft hover:text-accent text-xs shrink-0"
                        >
                          删除
                        </button>
                      </div>
                      {task.description && (
                        <p className="mt-1.5 text-xs text-ink-soft leading-relaxed">
                          {task.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-paper-soft text-ink-soft">
                            {task.assignee}
                          </span>
                          <span className="text-[11px] text-ink-soft truncate">
                            由 {task.createdBy} 创建
                          </span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => moveTask(task.id, -1)}
                            disabled={col.status === "todo"}
                            className="h-6 w-6 flex items-center justify-center rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
                            aria-label="移到上一栏"
                          >
                            ←
                          </button>
                          <button
                            onClick={() => moveTask(task.id, 1)}
                            disabled={col.status === "done"}
                            className="h-6 w-6 flex items-center justify-center rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
                            aria-label="移到下一栏"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {colTasks.length === 0 && (
                  <p className="text-xs text-ink-soft px-1">暂无任务</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
