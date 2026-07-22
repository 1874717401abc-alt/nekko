"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarClock, Copy, Plus, Trash2 } from "lucide-react";
import { createItem, deleteItem, patchItem } from "@/lib/clientData";
import type { Deliverable, DeliverableStatus, PublishPlatform } from "@/lib/types";

const platformLabel: Record<PublishPlatform, string> = { bilibili: "B站", xiaohongshu: "小红书", douyin: "抖音", wechat: "视频号", other: "其他" };
const platformColor: Record<PublishPlatform, string> = { bilibili: "bg-sky-500", xiaohongshu: "bg-red-500", douyin: "bg-zinc-800", wechat: "bg-emerald-500", other: "bg-stone-500" };
const statusLabel: Record<DeliverableStatus, string> = { draft: "草稿", scheduled: "已排期", published: "已发布" };

export default function ProjectPublishingBoard({ projectId, initialDeliverables }: { projectId: string; initialDeliverables: Deliverable[] }) {
  const [items, setItems] = useState(initialDeliverables);
  const [showForm, setShowForm] = useState(initialDeliverables.length === 0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ platform: "bilibili" as PublishPlatform, title: "", caption: "", coverUrl: "", scheduledAt: "", url: "" });
  const sorted = useMemo(() => [...items].sort((a, b) => String(a.scheduledAt ?? "9999").localeCompare(String(b.scheduledAt ?? "9999"))), [items]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setPending(true); setError(null);
    try {
      const created = await createItem<Deliverable>("deliverables", { projectId, ...form, status: form.scheduledAt ? "scheduled" : "draft" });
      setItems((current) => [created, ...current]);
      setForm({ platform: "bilibili", title: "", caption: "", coverUrl: "", scheduledAt: "", url: "" });
      setShowForm(false);
    } catch (err) { setError(err instanceof Error ? err.message : "发布内容保存失败。"); }
    finally { setPending(false); }
  }

  async function changeStatus(item: Deliverable, status: DeliverableStatus) {
    try {
      const updated = await patchItem<Deliverable>("deliverables", item.id, { status, publishedAt: status === "published" ? new Date().toISOString() : item.publishedAt });
      setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry));
    } catch (err) { setError(err instanceof Error ? err.message : "状态更新失败。"); }
  }

  async function remove(item: Deliverable) {
    if (!window.confirm(`删除「${item.title}」的发布记录？`)) return;
    try { await deleteItem("deliverables", item.id); setItems((current) => current.filter((entry) => entry.id !== item.id)); }
    catch (err) { setError(err instanceof Error ? err.message : "删除失败。"); }
  }

  return (
    <section aria-labelledby="publishing-heading">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h2 id="publishing-heading" className="text-lg font-semibold text-ink">发布中心</h2><p className="mt-1 text-xs text-ink-soft">每个平台单独管理标题、文案、封面、排期和上线链接。</p></div>
        <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-xs font-medium text-paper"><Plus className="h-4 w-4" />{showForm ? "收起" : "添加发布版本"}</button>
      </div>
      {error && <p className="mb-4 text-xs text-red-500">{error}</p>}
      {showForm && (
        <form onSubmit={add} className="mb-7 grid gap-3 border-y border-line/70 py-5 sm:grid-cols-2">
          <select value={form.platform} onChange={(e) => setForm((value) => ({ ...value, platform: e.target.value as PublishPlatform }))} className="rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none">{Object.entries(platformLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <input required value={form.title} onChange={(e) => setForm((value) => ({ ...value, title: e.target.value }))} placeholder="发布标题" className="rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" />
          <textarea value={form.caption} onChange={(e) => setForm((value) => ({ ...value, caption: e.target.value }))} rows={4} placeholder="平台文案、话题和置顶评论" className="resize-y rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm leading-6 focus:border-accent focus:outline-none sm:col-span-2" />
          <input value={form.coverUrl} onChange={(e) => setForm((value) => ({ ...value, coverUrl: e.target.value }))} placeholder="封面链接，可选" className="rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" />
          <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((value) => ({ ...value, scheduledAt: e.target.value }))} className="rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none" />
          <input value={form.url} onChange={(e) => setForm((value) => ({ ...value, url: e.target.value }))} placeholder="上线链接，可后补" className="rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none sm:col-span-2" />
          <div className="flex justify-end sm:col-span-2"><button disabled={pending} className="h-9 rounded-md bg-accent px-4 text-xs font-medium text-white disabled:opacity-50">{pending ? "保存中…" : "保存发布版本"}</button></div>
        </form>
      )}
      <div className="divide-y divide-line/70 border-y border-line/70">
        {sorted.map((item) => (
          <article key={item.id} className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_170px_auto] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className={`h-2.5 w-2.5 rounded-sm ${platformColor[item.platform]}`} /><span className="text-[11px] text-ink-soft">{platformLabel[item.platform]}</span><h3 className="text-sm font-semibold text-ink">{item.title}</h3></div>
              {item.caption && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-ink-soft">{item.caption}</p>}
              <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-ink-soft">
                {item.scheduledAt && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{new Date(item.scheduledAt).toLocaleString("zh-CN")}</span>}
                {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent">打开成片<ArrowUpRight className="h-3 w-3" /></a>}
                {item.caption && <button type="button" onClick={() => navigator.clipboard.writeText(item.caption ?? "")} className="inline-flex items-center gap-1 hover:text-accent"><Copy className="h-3 w-3" />复制文案</button>}
              </div>
            </div>
            <select value={item.status} onChange={(e) => changeStatus(item, e.target.value as DeliverableStatus)} className="h-9 rounded-md border border-line bg-paper px-3 text-xs focus:border-accent focus:outline-none">{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <button type="button" onClick={() => remove(item)} title="删除" aria-label="删除发布记录" className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-red-500/10 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
          </article>
        ))}
        {sorted.length === 0 && <p className="py-12 text-center text-xs text-ink-soft">还没有平台发布版本。</p>}
      </div>
    </section>
  );
}
