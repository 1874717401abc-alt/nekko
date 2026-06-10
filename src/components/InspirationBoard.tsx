"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { InspirationItem } from "@/lib/types";

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

async function persist(items: InspirationItem[]) {
  await fetch("/api/data/inspiration", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(items),
  });
}

export default function InspirationBoard({
  initialItems,
}: {
  initialItems: InspirationItem[];
}) {
  const [items, setItems] = useState<InspirationItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<InspirationItem["type"]>("note");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");

  const allTags = Array.from(new Set(items.flatMap((i) => i.tags))).sort();

  const filtered = activeTag ? items.filter((i) => i.tags.includes(activeTag)) : items;
  const sorted = [...filtered].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );

  function resetForm() {
    setTitle("");
    setType("note");
    setUrl("");
    setNote("");
    setTags("");
    setShowForm(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const newItem: InspirationItem = {
      id: `insp-${Date.now()}`,
      title: title.trim(),
      type,
      url: url.trim() || undefined,
      note: note.trim() || undefined,
      tags: tags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
      createdAt: new Date().toISOString(),
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
          onClick={() => setActiveTag(null)}
          className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
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
            className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
              activeTag === tag
                ? "border-accent bg-accent/10 text-accent"
                : "border-line text-ink-soft hover:border-accent/40"
            }`}
          >
            {tag}
          </button>
        ))}
        <button
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto text-xs px-4 py-1.5 rounded-full bg-ink text-paper hover:bg-ink/85 transition-colors"
        >
          {showForm ? "取消" : "+ 新建灵感"}
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
              placeholder="给这个灵感起个名字"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
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
            <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
              标签（逗号分隔）
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
              placeholder="排版, 参考"
            />
          </div>
          {(type === "link" || type === "image") && (
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
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
            <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
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
              className="text-sm px-5 py-2.5 rounded-full bg-accent text-paper hover:bg-accent/90 transition-colors"
            >
              保存
            </button>
          </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
        <AnimatePresence initial={false}>
          {sorted.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.35, ease: easeOut }}
              className="break-inside-avoid rounded-2xl border border-line/70 bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-[11px] uppercase tracking-[0.2em] text-accent">
                  {typeLabel[item.type]}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-ink-soft hover:text-accent text-xs"
                  aria-label="删除"
                >
                  删除
                </button>
              </div>
              <h3 className="font-serif-display text-lg text-ink mb-1.5">{item.title}</h3>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-xs text-accent break-all mb-1.5 hover:underline"
                >
                  {item.url}
                </a>
              )}
              {item.note && (
                <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">
                  {item.note}
                </p>
              )}
              <div className="flex items-center justify-between mt-4">
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-paper-soft text-ink-soft"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-[11px] text-ink-soft shrink-0 ml-2">
                  {formatDate(item.createdAt)}
                </span>
              </div>
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
