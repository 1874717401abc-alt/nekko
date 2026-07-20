"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { createItem, deleteItem } from "@/lib/clientData";
import type { InspirationItem, LibraryItem, Project, ProgressTask } from "@/lib/types";

const easeOut = [0.22, 1, 0.36, 1] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ProjectsBoard({
  initialProjects,
  inspiration,
  library,
  progress,
}: {
  initialProjects: Project[];
  inspiration: InspirationItem[];
  library: LibraryItem[];
  progress: ProgressTask[];
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [keyword, setKeyword] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  function resetForm() {
    setName("");
    setDescription("");
    setTags("");
    setShowForm(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const newProject = await createItem<Project>("projects", {
        name,
        description,
        tags: tags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setProjects((current) => [newProject, ...current]);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    if (!window.confirm(`确定删除「${project.name}」吗？关联内容会保留，但会移出这个项目。`)) return;

    setPendingId(id);
    setError(null);
    try {
      await deleteItem("projects", id);
      setProjects((current) => current.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败，请重试。");
    } finally {
      setPendingId(null);
    }
  }

  const filtered = projects.filter((p) => {
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      const haystack = [p.name, p.description ?? "", ...p.tags].join(" ").toLowerCase();
      if (!haystack.includes(kw)) return false;
    }
    const day = p.createdAt.slice(0, 10);
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
  });

  const sorted = [...filtered].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );

  function counts(projectId: string) {
    return {
      inspiration: inspiration.filter((i) => i.projectId === projectId).length,
      library: library.filter((i) => i.projectId === projectId).length,
      progress: progress.filter((t) => t.projectId === projectId).length,
    };
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-8">
        {error && <p className="w-full text-xs text-red-400">{error}</p>}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
            关键词搜索
          </label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索项目名称、简介或标签"
            className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
            起始日期
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
            结束日期
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs px-4 py-2.5 rounded-full bg-ink text-paper hover:bg-ink/85 transition-colors"
        >
          {showForm ? "取消" : "+ 新建项目"}
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
                项目名称
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
                placeholder="例如：Ep.13『选题调研』"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
                项目简介
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
                placeholder="简单描述一下这个项目"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
                关键词（逗号分隔）
              </label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
                placeholder="拍摄, 选题"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="text-sm px-5 py-2.5 rounded-full bg-accent text-paper hover:bg-accent/90 transition-colors"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence initial={false}>
          {sorted.map((project) => {
            const c = counts(project.id);
            return (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.35, ease: easeOut }}
                className="rounded-2xl border border-line/70 bg-card p-5 flex flex-col"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-serif-display text-lg text-ink hover:text-accent transition-colors"
                  >
                    {project.name}
                  </Link>
                  <button
                    onClick={() => handleDelete(project.id)}
                    disabled={pendingId === project.id}
                    className="text-ink-soft hover:text-accent text-xs shrink-0 disabled:opacity-40"
                    aria-label="删除"
                  >
                    {pendingId === project.id ? "处理中" : "删除"}
                  </button>
                </div>
                {project.description && (
                  <p className="text-sm text-ink-soft leading-relaxed line-clamp-3 mb-3">
                    {project.description}
                  </p>
                )}
                {project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
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
                <div className="mt-auto flex items-center justify-between gap-2 text-[11px] text-ink-soft">
                  <span>
                    灵感 {c.inspiration} · 资料 {c.library} · 任务 {c.progress}
                  </span>
                  <span className="shrink-0">{formatDate(project.createdAt)}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {sorted.length === 0 && (
          <p className="text-sm text-ink-soft">还没有项目，点击右上角新建一个吧。</p>
        )}
      </div>
    </div>
  );
}
