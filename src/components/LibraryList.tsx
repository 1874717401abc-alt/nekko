"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { LibraryItem, Project } from "@/lib/types";

const easeOut = [0.22, 1, 0.36, 1] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });
}

async function persist(items: LibraryItem[]) {
  await fetch("/api/data/library", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(items),
  });
}

const VideoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-4 w-4">
    <rect x="2.5" y="5" width="14" height="14" rx="2" />
    <path d="M16.5 10.5 21 7.5v9l-4.5-3Z" strokeLinejoin="round" />
  </svg>
);

const DocIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-4 w-4">
    <path d="M6 2.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
    <path d="M14 2.5V7h4" strokeLinejoin="round" />
  </svg>
);

export default function LibraryList({
  initialItems,
  projects,
  currentUserName,
}: {
  initialItems: LibraryItem[];
  projects: Project[];
  currentUserName: string;
}) {
  const [items, setItems] = useState<LibraryItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<string>("");

  const [title, setTitle] = useState("");
  const [type, setType] = useState<LibraryItem["type"]>("doc");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [projectId, setProjectId] = useState("");

  const categories = Array.from(new Set(items.map((i) => i.category))).sort();
  const filtered = items
    .filter((i) => (activeCategory ? i.category === activeCategory : true))
    .filter((i) => (activeProject ? i.projectId === activeProject : true));
  const sorted = [...filtered].sort((a, b) => +new Date(b.addedAt) - +new Date(a.addedAt));

  function resetForm() {
    setTitle("");
    setType("doc");
    setUrl("");
    setCategory("");
    setNote("");
    setProjectId("");
    setShowForm(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    const newItem: LibraryItem = {
      id: `lib-${Date.now()}`,
      title: title.trim(),
      type,
      url: url.trim(),
      category: category.trim() || "未分类",
      note: note.trim() || undefined,
      addedAt: new Date().toISOString(),
      createdBy: currentUserName,
      projectId: projectId || undefined,
    };

    const next = [newItem, ...items];
    setItems(next);
    resetForm();
    await persist(next);
  }

  async function handleDelete(id: string) {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    await persist(next);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <button
          onClick={() => setActiveCategory(null)}
          className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
            activeCategory === null
              ? "border-accent bg-accent/10 text-accent"
              : "border-line text-ink-soft hover:border-accent/40"
          }`}
        >
          全部
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
              activeCategory === cat
                ? "border-accent bg-accent/10 text-accent"
                : "border-line text-ink-soft hover:border-accent/40"
            }`}
          >
            {cat}
          </button>
        ))}
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
          className="ml-auto text-xs px-4 py-1.5 rounded-full bg-ink text-paper hover:bg-ink/85 transition-colors"
        >
          {showForm ? "取消" : "+ 新建条目"}
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
              标题
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              placeholder="例如：Ep.13 成片"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
              类型
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LibraryItem["type"])}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
            >
              <option value="doc">文档</option>
              <option value="video">视频</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
              分类
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              placeholder="策划 / 成片 / 素材"
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
              链接地址
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              placeholder="https://"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
              备注
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="text-sm px-5 py-2.5 rounded-full bg-accent text-paper hover:bg-accent/90 transition-colors"
            >
              保存
            </button>
          </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="flex flex-col">
        <AnimatePresence initial={false}>
          {sorted.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -8 }}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.3, ease: easeOut }}
              className="border-b border-line/70 px-1 py-4 flex flex-wrap items-center gap-x-4 gap-y-2"
            >
              <span className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-accent/10 text-accent">
                {item.type === "video" ? <VideoIcon /> : <DocIcon />}
              </span>
              <div className="flex-1 min-w-0">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm font-medium text-ink hover:text-accent"
                >
                  {item.title}
                </a>
                {item.note && (
                  <p className="mt-0.5 text-xs text-ink-soft truncate">{item.note}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0 ml-auto">
                {item.projectId && projects.find((p) => p.id === item.projectId) && (
                  <Link
                    href={`/projects/${item.projectId}`}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-accent/10 text-accent hover:bg-accent/20"
                  >
                    {projects.find((p) => p.id === item.projectId)?.name}
                  </Link>
                )}
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-paper-soft text-ink-soft">
                  {item.category}
                </span>
                <span className="text-[11px] text-ink-soft hidden sm:inline">
                  {item.createdBy} · {formatDate(item.addedAt)}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-ink-soft hover:text-accent text-xs"
                >
                  删除
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {sorted.length === 0 && (
          <p className="text-sm text-ink-soft">还没有资料，点击右上角新建一个吧。</p>
        )}
      </div>
    </div>
  );
}
