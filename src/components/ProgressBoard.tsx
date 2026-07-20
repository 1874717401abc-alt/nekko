"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { createItem, deleteItem, patchItem } from "@/lib/clientData";
import type { Project, ProgressTask, TaskPriority, TaskStatus, User } from "@/lib/types";

const easeOut = [0.22, 1, 0.36, 1] as const;

const columns: { status: TaskStatus; label: string; sub: string }[] = [
  { status: "todo", label: "待开始", sub: "To do" },
  { status: "doing", label: "进行中", sub: "Doing" },
  { status: "done", label: "已完成", sub: "Done" },
];

const priorityLabel: Record<TaskPriority, string> = {
  low: "低",
  normal: "普通",
  high: "高",
};

const priorityClass: Record<TaskPriority, string> = {
  low: "bg-paper-soft text-ink-soft",
  normal: "bg-accent/10 text-accent",
  high: "bg-red-500/10 text-red-300",
};

function dueDateLabel(dueDate?: string) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const overdue = due < today;
  return {
    overdue,
    text: due.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }),
  };
}

export default function ProgressBoard({
  initialTasks,
  projects,
  members,
}: {
  initialTasks: ProgressTask[];
  projects: Project[];
  members: User[];
}) {
  const [tasks, setTasks] = useState<ProgressTask[]>(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [activeProject, setActiveProject] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueDate, setDueDate] = useState("");

  function resetForm() {
    setTitle("");
    setDescription("");
    setAssignee("");
    setProjectId("");
    setPriority("normal");
    setDueDate("");
    setShowForm(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setError(null);
    setFormSaving(true);
    try {
      const newTask = await createItem<ProgressTask>("progress", {
        title,
        description,
        assignee,
        projectId,
        priority,
        dueDate,
      });
      setTasks((current) => [newTask, ...current]);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试。");
    } finally {
      setFormSaving(false);
    }
  }

  const visibleTasks = activeProject
    ? tasks.filter((t) => t.projectId === activeProject)
    : tasks;

  async function moveTask(id: string, direction: 1 | -1) {
    setError(null);
    const order: TaskStatus[] = ["todo", "doing", "done"];
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const idx = order.indexOf(task.status);
    const newIdx = Math.min(Math.max(idx + direction, 0), order.length - 1);
    const nextStatus = order[newIdx];
    if (nextStatus === task.status) return;

    setPendingTaskId(id);
    try {
      const updated = await patchItem<ProgressTask>("progress", id, { status: nextStatus });
      setTasks((current) => current.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试。");
    } finally {
      setPendingTaskId(null);
    }
  }

  async function handleDelete(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (!window.confirm(`确定删除「${task.title}」吗？`)) return;

    setError(null);
    setPendingTaskId(id);
    try {
      await deleteItem("progress", id);
      setTasks((current) => current.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败，请重试。");
    } finally {
      setPendingTaskId(null);
    }
  }

  function renderTaskCard(task: ProgressTask, columnStatus: TaskStatus) {
    const taskPriority = task.priority ?? "normal";
    const due = dueDateLabel(task.dueDate);

    return (
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
            disabled={pendingTaskId === task.id}
            className="text-ink-soft hover:text-accent text-xs shrink-0 disabled:opacity-40"
          >
            {pendingTaskId === task.id ? "处理中" : "删除"}
          </button>
        </div>
        {task.description && (
          <p className="mt-1.5 text-xs text-ink-soft leading-relaxed">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full ${priorityClass[taskPriority]}`}
            >
              {priorityLabel[taskPriority]}
            </span>
            {due && (
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full ${
                  due.overdue && task.status !== "done"
                    ? "bg-red-500/10 text-red-300"
                    : "bg-paper-soft text-ink-soft"
                }`}
              >
                {due.overdue && task.status !== "done" ? "逾期 " : "截止 "}
                {due.text}
              </span>
            )}
            {task.projectId && projects.find((p) => p.id === task.projectId) && (
              <Link
                href={`/projects/${task.projectId}`}
                className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent hover:bg-accent/20"
              >
                {projects.find((p) => p.id === task.projectId)?.name}
              </Link>
            )}
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
              disabled={columnStatus === "todo" || pendingTaskId === task.id}
              className="h-6 w-6 flex items-center justify-center rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
              aria-label="移到上一栏"
            >
              ←
            </button>
            <button
              onClick={() => moveTask(task.id, 1)}
              disabled={columnStatus === "done" || pendingTaskId === task.id}
              className="h-6 w-6 flex items-center justify-center rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
              aria-label="移到下一栏"
            >
              →
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end gap-2 mb-6">
        {error && <p className="mr-auto text-xs text-red-400">{error}</p>}
        {projects.length > 0 && (
          <select
            value={activeProject}
            onChange={(e) => setActiveProject(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-full border border-line bg-paper text-ink-soft focus:outline-none focus:border-accent"
          >
            <option value="">全部项目</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
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
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
            >
              <option value="">未分配</option>
              {members.map((member) => (
                <option key={member.id} value={member.displayName}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
              优先级
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
            >
              <option value="normal">普通</option>
              <option value="high">高</option>
              <option value="low">低</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
              截止日期
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          {projects.length > 0 && (
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
                所属项目
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              >
                <option value="">不归属项目</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
              disabled={formSaving}
              className="text-sm px-5 py-2.5 rounded-full bg-accent text-paper hover:bg-accent/90 transition-colors"
            >
              {formSaving ? "保存中…" : "添加到「待开始」"}
            </button>
          </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
        {columns.map((col) => {
          const colTasks = visibleTasks.filter((t) => t.status === col.status);
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
                  {colTasks.map((task) => renderTaskCard(task, col.status))}
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
