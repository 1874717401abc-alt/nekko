"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { InspirationItem, LibraryItem, Project, ProgressTask, TaskStatus } from "@/lib/types";

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

async function persist(resource: string, data: unknown) {
  await fetch(`/api/data/${resource}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export default function ProjectDetail({
  project,
  allProjects,
  inspiration,
  library,
  progress,
}: {
  project: Project;
  allProjects: Project[];
  inspiration: InspirationItem[];
  library: LibraryItem[];
  progress: ProgressTask[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [saving, setSaving] = useState(false);

  const myInspiration = inspiration.filter((i) => i.projectId === project.id);
  const myLibrary = library.filter((i) => i.projectId === project.id);
  const myProgress = progress.filter((t) => t.projectId === project.id);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const next = allProjects.map((p) =>
      p.id === project.id
        ? { ...p, name: name.trim(), description: description.trim() || undefined }
        : p
    );
    await persist("projects", next);
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    const nextProjects = allProjects.filter((p) => p.id !== project.id);
    await persist("projects", nextProjects);

    if (myInspiration.length > 0) {
      await persist(
        "inspiration",
        inspiration.map((i) => (i.projectId === project.id ? { ...i, projectId: undefined } : i))
      );
    }
    if (myLibrary.length > 0) {
      await persist(
        "library",
        library.map((i) => (i.projectId === project.id ? { ...i, projectId: undefined } : i))
      );
    }
    if (myProgress.length > 0) {
      await persist(
        "progress",
        progress.map((t) => (t.projectId === project.id ? { ...t, projectId: undefined } : t))
      );
    }
    router.push("/projects");
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="mt-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
        {editing ? (
          <form onSubmit={handleSave} className="flex-1 flex flex-col gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-lg font-serif-display focus:outline-none focus:border-accent"
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
                className="text-xs px-4 py-2 rounded-full bg-accent text-paper hover:bg-accent/90 transition-colors disabled:opacity-50"
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
                className="text-xs px-4 py-2 rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        ) : (
          <div>
            <h1 className="font-serif-display text-3xl text-ink mb-2">{project.name}</h1>
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
                    className="text-[11px] px-2 py-0.5 rounded-full bg-paper-soft text-ink-soft"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[11px] uppercase tracking-[0.2em] text-ink-soft">
              创建于 {formatDate(project.createdAt)} · {project.createdBy}
            </p>
          </div>
        )}
        {!editing && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-4 py-2 rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors"
            >
              编辑
            </button>
            <button
              onClick={handleDelete}
              className="text-xs px-4 py-2 rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors"
            >
              删除项目
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-serif-display text-xl text-ink">灵感</h2>
            <Link href="/inspiration" className="text-[11px] uppercase tracking-[0.2em] text-accent">
              灵感库 →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {myInspiration.map((item) => (
              <div key={item.id} className="rounded-2xl border border-line/70 bg-card p-4">
                <span className="text-[11px] uppercase tracking-[0.2em] text-accent">
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
            <h2 className="font-serif-display text-xl text-ink">资料</h2>
            <Link href="/library" className="text-[11px] uppercase tracking-[0.2em] text-accent">
              资料库 →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {myLibrary.map((item) => (
              <div key={item.id} className="rounded-2xl border border-line/70 bg-card p-4">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-paper-soft text-ink-soft">
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
            <h2 className="font-serif-display text-xl text-ink">任务</h2>
            <Link href="/progress" className="text-[11px] uppercase tracking-[0.2em] text-accent">
              进度看板 →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {myProgress.map((task) => (
              <Link
                key={task.id}
                href={`/progress/${task.id}`}
                className="block rounded-2xl border border-line/70 bg-card p-4 hover:border-accent/50 transition-colors"
              >
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-paper-soft text-ink-soft">
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
