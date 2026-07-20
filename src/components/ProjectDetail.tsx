"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUpRight, Edit3, Plus, Trash2 } from "lucide-react";
import { createItem, deleteItem, patchItem } from "@/lib/clientData";
import type {
  InspirationItem,
  LibraryItem,
  Project,
  ProgressTask,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";

const easeOut = [0.22, 1, 0.36, 1] as const;

const typeLabel: Record<InspirationItem["type"], string> = {
  link: "链接",
  note: "笔记",
  image: "图片",
};

const statusLabel: Record<TaskStatus, string> = {
  todo: "待开始",
  doing: "进行中",
  done: "已完成",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type QuickKind = "task" | "library" | "inspiration";

export default function ProjectDetail({
  project,
  inspiration,
  library,
  progress,
}: {
  project: Project;
  inspiration: InspirationItem[];
  library: LibraryItem[];
  progress: ProgressTask[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickKind, setQuickKind] = useState<QuickKind>("task");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickUrl, setQuickUrl] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [quickCategory, setQuickCategory] = useState("");
  const [quickAssignee, setQuickAssignee] = useState("");
  const [quickPriority, setQuickPriority] = useState<TaskPriority>("normal");
  const [quickDueDate, setQuickDueDate] = useState("");
  const [quickTags, setQuickTags] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const myInspiration = inspiration.filter((i) => i.projectId === project.id);
  const myLibrary = library.filter((i) => i.projectId === project.id);
  const myProgress = progress.filter((t) => t.projectId === project.id);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await patchItem<Project>("projects", project.id, { name, description });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`确定删除「${project.name}」吗？项目会进入回收站，关联内容会保留。`)) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await deleteItem("projects", project.id);
      router.push("/projects");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败，请重试。");
    } finally {
      setSaving(false);
    }
  }

  function resetQuickForm() {
    setQuickTitle("");
    setQuickUrl("");
    setQuickNote("");
    setQuickCategory("");
    setQuickAssignee("");
    setQuickPriority("normal");
    setQuickDueDate("");
    setQuickTags("");
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    setQuickSaving(true);
    setError(null);
    try {
      if (quickKind === "task") {
        await createItem<ProgressTask>("progress", {
          title: quickTitle,
          description: quickNote,
          assignee: quickAssignee,
          priority: quickPriority,
          dueDate: quickDueDate,
          projectId: project.id,
        });
      } else if (quickKind === "library") {
        await createItem<LibraryItem>("library", {
          title: quickTitle,
          url: quickUrl,
          category: quickCategory,
          note: quickNote,
          projectId: project.id,
        });
      } else {
        await createItem<InspirationItem>("inspiration", {
          title: quickTitle,
          type: quickUrl.trim() ? "link" : "note",
          url: quickUrl,
          note: quickNote,
          tags: quickTags
            .split(/[,，]/)
            .map((tag) => tag.trim())
            .filter(Boolean),
          projectId: project.id,
        });
      }
      resetQuickForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试。");
    } finally {
      setQuickSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="mt-6"
    >
      {error && <p className="mb-4 text-xs text-red-400">{error}</p>}
      <div className="mb-6 flex flex-col gap-4 border-b border-line/70 pb-6 sm:flex-row sm:items-start sm:justify-between">
        {editing ? (
          <form onSubmit={handleSave} className="flex-1 flex flex-col gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-lg font-semibold focus:border-accent focus:outline-none"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
              placeholder="项目简介"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="text-xs px-4 py-2 rounded bg-accent text-paper hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {saving ? "保存中…" : "保存"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setName(project.name);
                  setDescription(project.description ?? "");
                  setEditing(false);
                }}
                className="text-xs px-4 py-2 rounded border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        ) : (
          <div>
            <h1 className="mb-2 text-2xl font-semibold text-ink sm:text-3xl">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-ink-soft leading-relaxed max-w-xl mb-2">
                {project.description}
              </p>
            )}
            {project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2 py-0.5 rounded bg-paper-soft text-ink-soft"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[11px]  text-ink-soft">
              创建于 {formatDate(project.createdAt)} · {project.createdBy}
            </p>
          </div>
        )}
        {!editing && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              <Edit3 size={14} aria-hidden="true" />
              编辑
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-xs text-ink-soft transition-colors hover:border-red-400 hover:text-red-500"
            >
              <Trash2 size={14} aria-hidden="true" />
              删除项目
            </button>
          </div>
        )}
      </div>

      <section className="mb-6 rounded-lg border border-line/70 bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Plus size={16} aria-hidden="true" />
            快速添加
          </h2>
          <div className="flex rounded border border-line bg-paper-soft p-1">
            {[
              ["task", "任务"],
              ["library", "资料"],
              ["inspiration", "灵感"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setQuickKind(value as QuickKind);
                  resetQuickForm();
                }}
                className={`rounded px-3 py-1 text-xs transition-colors ${
                  quickKind === value ? "bg-accent text-paper" : "text-ink-soft hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleQuickAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            required
            placeholder={
              quickKind === "task"
                ? "任务名称"
                : quickKind === "library"
                  ? "资料标题"
                  : "灵感标题"
            }
            className="sm:col-span-2 rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
          />

          {quickKind === "task" && (
            <>
              <input
                value={quickAssignee}
                onChange={(e) => setQuickAssignee(e.target.value)}
                placeholder="负责人"
                className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
              <select
                value={quickPriority}
                onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
                className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              >
                <option value="normal">普通优先级</option>
                <option value="high">高优先级</option>
                <option value="low">低优先级</option>
              </select>
              <input
                type="date"
                value={quickDueDate}
                onChange={(e) => setQuickDueDate(e.target.value)}
                className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </>
          )}

          {quickKind === "library" && (
            <>
              <input
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                required
                placeholder="https://"
                className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
              <input
                value={quickCategory}
                onChange={(e) => setQuickCategory(e.target.value)}
                placeholder="分类：脚本 / 成片 / 素材"
                className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </>
          )}

          {quickKind === "inspiration" && (
            <>
              <input
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                placeholder="链接地址，可选"
                className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
              <input
                value={quickTags}
                onChange={(e) => setQuickTags(e.target.value)}
                placeholder="标签，逗号分隔"
                className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </>
          )}

          <textarea
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            rows={2}
            placeholder={quickKind === "task" ? "任务说明，可选" : "备注，可选"}
            className="sm:col-span-2 rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
          />
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={quickSaving}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-paper transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              <Plus size={15} aria-hidden="true" />
              {quickSaving ? "保存中…" : "添加到项目"}
            </button>
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink">灵感</h2>
            <Link href="/inspiration" className="inline-flex items-center gap-1 text-[11px] text-accent">
              灵感库 <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {myInspiration.map((item) => (
              <div key={item.id} className="rounded-lg border border-line/70 bg-card p-4">
                <span className="text-[11px]  text-accent">
                  {typeLabel[item.type]}
                </span>
                <p className="text-sm font-medium text-ink mt-1">{item.title}</p>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-xs text-accent break-all mt-1 hover:underline"
                  >
                    {item.url}
                  </a>
                )}
              </div>
            ))}
            {myInspiration.length === 0 && (
              <p className="text-xs text-ink-soft">
                暂无关联灵感，去灵感库新建时选择此项目即可。
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink">资料</h2>
            <Link href="/library" className="inline-flex items-center gap-1 text-[11px] text-accent">
              资料库 <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {myLibrary.map((item) => (
              <div key={item.id} className="rounded-lg border border-line/70 bg-card p-4">
                <span className="text-[11px] px-2 py-0.5 rounded bg-paper-soft text-ink-soft">
                  {item.category}
                </span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm font-medium text-ink mt-1.5 hover:text-accent truncate"
                >
                  {item.title}
                </a>
              </div>
            ))}
            {myLibrary.length === 0 && (
              <p className="text-xs text-ink-soft">
                暂无关联资料，去资料库新建时选择此项目即可。
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink">任务</h2>
            <Link href="/progress" className="inline-flex items-center gap-1 text-[11px] text-accent">
              进度看板 <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {myProgress.map((task) => (
              <Link
                key={task.id}
                href={`/progress/${task.id}`}
                className="block rounded-lg border border-line/70 bg-card p-4 hover:border-accent/50 transition-colors"
              >
                <span className="text-[11px] px-2 py-0.5 rounded bg-paper-soft text-ink-soft">
                  {statusLabel[task.status]}
                </span>
                <p className="text-sm font-medium text-ink mt-1.5">{task.title}</p>
                <p className="text-[11px] text-ink-soft mt-1">{task.assignee}</p>
              </Link>
            ))}
            {myProgress.length === 0 && (
              <p className="text-xs text-ink-soft">
                暂无关联任务，去进度看板新建时选择此项目即可。
              </p>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
