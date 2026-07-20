"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export type SearchResult = {
  id: string;
  type: "project" | "task" | "inspiration" | "library" | "log" | "comment";
  label: string;
  title: string;
  summary?: string;
  href: string;
  createdAt?: string;
  haystack: string;
};

const typeOptions: { value: SearchResult["type"] | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "project", label: "项目" },
  { value: "task", label: "任务" },
  { value: "inspiration", label: "灵感" },
  { value: "library", label: "资料" },
  { value: "log", label: "进度" },
  { value: "comment", label: "评论" },
];

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}

export default function GlobalSearch({ results }: { results: SearchResult[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchResult["type"] | "all">("all");

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return results
      .filter((item) => (type === "all" ? true : item.type === type))
      .filter((item) => (keyword ? item.haystack.toLowerCase().includes(keyword) : true))
      .slice(0, 80);
  }, [query, results, type]);

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-2xl border border-line/70 bg-card p-5 sm:p-6">
        <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-2">
          搜索
        </label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          placeholder="输入项目、任务、资料、灵感或评论关键词"
          className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink outline-none focus:border-accent transition-colors"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {typeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setType(option.value)}
              className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
                type === option.value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line text-ink-soft hover:border-accent/40 hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        {filtered.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(index * 0.015, 0.15) }}
            className="border-b border-line/70 px-1 py-4"
          >
            <Link href={item.href} className="group flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                  {item.label}
                </span>
                {item.createdAt && (
                  <span className="text-[11px] text-ink-soft">{formatDate(item.createdAt)}</span>
                )}
              </div>
              <p className="text-sm font-medium text-ink transition-colors group-hover:text-accent">
                {item.title}
              </p>
              {item.summary && (
                <p className="text-xs leading-relaxed text-ink-soft line-clamp-2">{item.summary}</p>
              )}
            </Link>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-ink-soft">没有找到匹配内容。</p>
        )}
      </div>
    </div>
  );
}
