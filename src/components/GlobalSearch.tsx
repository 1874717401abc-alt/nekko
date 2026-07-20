"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Search } from "lucide-react";

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
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-line bg-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          placeholder="输入项目、任务、资料、灵感或评论关键词"
          className="h-11 w-full rounded-md border border-line bg-paper pl-10 pr-4 text-sm text-ink outline-none transition-colors focus:border-accent"
        />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {typeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setType(option.value)}
              className={`text-xs px-3.5 py-1.5 rounded border transition-colors ${
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

      <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-card">
        {filtered.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(index * 0.015, 0.15) }}
            className="border-b border-line px-4 py-3.5 last:border-b-0 sm:px-5"
          >
            <Link href={item.href} className="group grid gap-2 sm:grid-cols-[90px_minmax(0,1fr)_24px] sm:items-center">
              <div className="flex flex-wrap items-center gap-2 sm:block">
                <span className="text-[11px] px-2 py-0.5 rounded bg-accent/10 text-accent">
                  {item.label}
                </span>
                {item.createdAt && (
                  <span className="text-[11px] text-ink-soft">{formatDate(item.createdAt)}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink transition-colors group-hover:text-accent">{item.title}</p>
                {item.summary && <p className="mt-1 line-clamp-1 text-xs text-ink-soft">{item.summary}</p>}
              </div>
              <ArrowUpRight className="hidden h-4 w-4 text-ink-soft group-hover:text-accent sm:block" />
            </Link>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-ink-soft">没有找到匹配内容。</p>
        )}
      </div>
    </div>
  );
}
