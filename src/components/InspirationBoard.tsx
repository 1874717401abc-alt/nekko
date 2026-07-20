"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { createItem, deleteItem, patchItem } from "@/lib/clientData";
import type { InspirationItem, Project } from "@/lib/types";

const easeOut = [0.22, 1, 0.36, 1] as const;

const typeLabel: Record<InspirationItem["type"], string> = {
  link: "链接",
  note: "笔记",
  image: "图片",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });
}

export default function InspirationBoard({
  initialItems,
  projects,
  canRunRadar = false,
}: {
  initialItems: InspirationItem[];
  projects: Project[];
  canRunRadar?: boolean;
}) {
  const [items, setItems] = useState<InspirationItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<string>("");

  const [title, setTitle] = useState("");
  const [type, setType] = useState<InspirationItem["type"]>("note");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [projectId, setProjectId] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<InspirationItem["type"]>("note");
  const [editUrl, setEditUrl] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [radarMessage, setRadarMessage] = useState<string | null>(null);
  const [radarRunning, setRadarRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const allTags = Array.from(new Set(items.flatMap((i) => i.tags))).sort();

  const filtered = items
    .filter((i) => (activeTag ? i.tags.includes(activeTag) : true))
    .filter((i) => (activeProject ? i.projectId === activeProject : true));
  const sorted = [...filtered].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );

  function resetForm() {
    setTitle("");
    setType("note");
    setUrl("");
    setNote("");
    setTags("");
    setProjectId("");
    setShowForm(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const newItem = await createItem<InspirationItem>("inspiration", {
        title,
        type,
        url,
        note,
        tags: tags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
        projectId,
      });
      setItems((current) => [newItem, ...current]);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (!window.confirm(`确定删除「${item.title}」吗？`)) return;

    setPendingId(id);
    setError(null);
    try {
      await deleteItem("inspiration", id);
      setItems((current) => current.filter((i) => i.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败，请重试。");
    } finally {
      setPendingId(null);
    }
  }

  async function runRadar() {
    setRadarRunning(true);
    setError(null);
    setRadarMessage(null);
    try {
      const res = await fetch("/api/ai/content-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 6 }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Agent 采集失败。");
        return;
      }
      const created = (data.createdItems ?? []) as InspirationItem[];
      setItems((current) => [...created, ...current]);
      setRadarMessage(data.message ?? `已生成 ${created.length} 条灵感。`);
    } catch {
      setError("Agent 采集失败，请稍后重试。");
    } finally {
      setRadarRunning(false);
    }
  }

  function startEdit(item: InspirationItem) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditType(item.type);
    setEditUrl(item.url ?? "");
    setEditNote(item.note ?? "");
    setEditTags(item.tags.join(", "));
    setEditProjectId(item.projectId ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleEditSave(id: string) {
    if (!editTitle.trim()) return;
    setPendingId(id);
    setError(null);
    try {
      const updated = await patchItem<InspirationItem>("inspiration", id, {
        title: editTitle,
        type: editType,
        url: editUrl,
        note: editNote,
        tags: editTags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
        projectId: editProjectId,
      });
      setItems((current) => current.map((i) => (i.id === id ? updated : i)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试。");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-line pb-4">
        {error && <p className="w-full text-xs text-red-400">{error}</p>}
        {radarMessage && <p className="w-full text-xs text-accent">{radarMessage}</p>}
        <button
          onClick={() => setActiveTag(null)}
          className={`text-xs px-3.5 py-1.5 rounded border transition-colors ${
            activeTag === null
              ? "border-accent bg-accent/10 text-accent"
              : "border-line text-ink-soft hover:border-accent/40"
          }`}
        >
          全部
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`text-xs px-3.5 py-1.5 rounded border transition-colors ${
              activeTag === tag
                ? "border-accent bg-accent/10 text-accent"
                : "border-line text-ink-soft hover:border-accent/40"
            }`}
          >
            {tag}
          </button>
        ))}
        {projects.length > 0 && (
          <select
            value={activeProject}
            onChange={(e) => setActiveProject(e.target.value)}
            className="text-xs px-3 py-1.5 rounded border border-line bg-paper text-ink-soft focus:outline-none focus:border-accent"
          >
            <option value="">全部项目</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {canRunRadar && (
          <button
            onClick={runRadar}
            disabled={radarRunning}
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 text-xs font-medium text-accent transition-colors hover:bg-accent/15 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {radarRunning ? "Agent 采集中" : "Agent 采集今日灵感"}
          </button>
        )}
        <button
          onClick={() => setShowForm((v) => !v)}
          className={`${canRunRadar ? "" : "ml-auto"} inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-xs font-medium text-paper hover:bg-ink/85 transition-colors`}
        >
          <Plus className={`h-4 w-4 ${showForm ? "rotate-45" : ""}`} />
          {showForm ? "取消" : "新建灵感"}
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
            className="mb-6 grid grid-cols-1 gap-4 overflow-hidden rounded-lg border border-line bg-card p-5 sm:grid-cols-2"
          >
          <div className="sm:col-span-2">
            <label className="block text-xs  text-ink-soft mb-1.5">
              标题
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              placeholder="给这个灵感起个名字"
            />
          </div>
          <div>
            <label className="block text-xs  text-ink-soft mb-1.5">
              类型
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as InspirationItem["type"])}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
            >
              <option value="note">笔记</option>
              <option value="link">链接</option>
              <option value="image">图片</option>
            </select>
          </div>
          <div>
            <label className="block text-xs  text-ink-soft mb-1.5">
              标签（逗号分隔）
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              placeholder="排版, 参考"
            />
          </div>
          {projects.length > 0 && (
            <div>
              <label className="block text-xs  text-ink-soft mb-1.5">
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
          {(type === "link" || type === "image") && (
            <div className="sm:col-span-2">
              <label className="block text-xs  text-ink-soft mb-1.5">
                链接地址
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
                placeholder="https://"
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="block text-xs  text-ink-soft mb-1.5">
              备注
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
              placeholder="写点想法..."
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="text-sm px-5 py-2.5 rounded bg-accent text-paper hover:bg-accent/90 transition-colors"
            >
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3 2xl:columns-4">
        <AnimatePresence initial={false}>
          {sorted.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: easeOut }}
              className="break-inside-avoid rounded-lg border border-line bg-card p-4"
            >
              {editingId === item.id ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs  text-ink-soft mb-1.5">
                      标题
                    </label>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs  text-ink-soft mb-1.5">
                        类型
                      </label>
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value as InspirationItem["type"])}
                        className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
                      >
                        <option value="note">笔记</option>
                        <option value="link">链接</option>
                        <option value="image">图片</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs  text-ink-soft mb-1.5">
                        标签（逗号分隔）
                      </label>
                      <input
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                  {projects.length > 0 && (
                    <div>
                      <label className="block text-xs  text-ink-soft mb-1.5">
                        所属项目
                      </label>
                      <select
                        value={editProjectId}
                        onChange={(e) => setEditProjectId(e.target.value)}
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
                  {(editType === "link" || editType === "image") && (
                    <div>
                      <label className="block text-xs  text-ink-soft mb-1.5">
                        链接地址
                      </label>
                      <input
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
                        placeholder="https://"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs  text-ink-soft mb-1.5">
                      备注
                    </label>
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
	                    <button
	                      onClick={cancelEdit}
	                      disabled={pendingId === item.id}
	                      className="text-xs px-4 py-2 rounded border border-line text-ink-soft hover:border-accent/50 hover:text-accent transition-colors"
	                    >
                      取消
                    </button>
	                    <button
	                      onClick={() => handleEditSave(item.id)}
	                      disabled={pendingId === item.id}
	                      className="text-xs px-4 py-2 rounded bg-accent text-paper hover:bg-accent/90 transition-colors disabled:opacity-50"
	                    >
	                      {pendingId === item.id ? "保存中…" : "保存"}
	                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-[11px] font-medium text-accent">
                      {typeLabel[item.type]}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => startEdit(item)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-soft hover:bg-paper-soft hover:text-accent"
                        aria-label={`编辑 ${item.title}`}
                        title="编辑"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
	                      <button
	                        onClick={() => handleDelete(item.id)}
	                        disabled={pendingId === item.id}
	                        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-soft hover:bg-red-400/10 hover:text-red-500 disabled:opacity-40"
	                        aria-label={`删除 ${item.title}`}
	                        title="删除"
	                      >
	                        {pendingId === item.id ? <span className="text-[10px]">...</span> : <Trash2 className="h-3.5 w-3.5" />}
	                      </button>
                    </div>
                  </div>
                  <h3 className="mb-1.5 text-base font-semibold leading-6 text-ink">{item.title}</h3>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      打开来源 <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {item.note && (
                    <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">
                      {item.note}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 mt-4">
                    <div className="flex flex-wrap gap-1.5">
                      {item.projectId && projects.find((p) => p.id === item.projectId) && (
                        <Link
                          href={`/projects/${item.projectId}`}
                          className="text-[11px] px-2 py-0.5 rounded bg-accent/10 text-accent hover:bg-accent/20"
                        >
                          {projects.find((p) => p.id === item.projectId)?.name}
                        </Link>
                      )}
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] px-2 py-0.5 rounded bg-paper-soft text-ink-soft"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] text-ink-soft shrink-0 ml-auto">
                      {item.createdBy} · {formatDate(item.createdAt)}
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {sorted.length === 0 && (
          <p className="text-sm text-ink-soft">还没有灵感记录，点击右上角新建一个吧。</p>
        )}
      </div>
    </div>
  );
}
