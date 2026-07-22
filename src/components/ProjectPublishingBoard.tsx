"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarClock, Copy, Files, Pencil, Plus, Trash2, X } from "lucide-react";
import { createItem, deleteItem, patchItem } from "@/lib/clientData";
import type { Deliverable, DeliverableStatus, ProjectAsset, PublishPlatform } from "@/lib/types";

const platformLabel: Record<PublishPlatform, string> = { bilibili: "B站", xiaohongshu: "小红书", douyin: "抖音", wechat: "视频号", other: "其他" };
const platformColor: Record<PublishPlatform, string> = { bilibili: "bg-sky-500", xiaohongshu: "bg-red-500", douyin: "bg-zinc-800", wechat: "bg-emerald-500", other: "bg-stone-500" };
const statusLabel: Record<DeliverableStatus, string> = { draft: "草稿", scheduled: "已排期", published: "已发布" };
const platforms = Object.keys(platformLabel) as PublishPlatform[];

type PublishForm = {
  platform: PublishPlatform;
  title: string;
  caption: string;
  coverUrl: string;
  scheduledAt: string;
  url: string;
  status: DeliverableStatus;
};

function emptyForm(): PublishForm {
  return { platform: "bilibili", title: "", caption: "", coverUrl: "", scheduledAt: "", url: "", status: "draft" };
}

function toLocalInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function ProjectPublishingBoard({ projectId, initialDeliverables, assets }: { projectId: string; initialDeliverables: Deliverable[]; assets: ProjectAsset[] }) {
  const [items, setItems] = useState(initialDeliverables);
  const [showForm, setShowForm] = useState(initialDeliverables.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PublishForm>(emptyForm);
  const sorted = useMemo(() => [...items].sort((a, b) => String(a.scheduledAt ?? "9999").localeCompare(String(b.scheduledAt ?? "9999"))), [items]);
  const imageAssets = useMemo(() => assets.filter((item) => item.kind === "image"), [assets]);

  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(false);
  }

  function beginEdit(item: Deliverable) {
    setForm({
      platform: item.platform,
      title: item.title,
      caption: item.caption ?? "",
      coverUrl: item.coverUrl ?? "",
      scheduledAt: toLocalInput(item.scheduledAt),
      url: item.url ?? "",
      status: item.status,
    });
    setEditingId(item.id);
    setShowForm(true);
  }

  function beginDuplicate(item: Deliverable) {
    const nextPlatform = platforms[(platforms.indexOf(item.platform) + 1) % platforms.length];
    setForm({
      platform: nextPlatform,
      title: item.title,
      caption: item.caption ?? "",
      coverUrl: item.coverUrl ?? "",
      scheduledAt: "",
      url: "",
      status: "draft",
    });
    setEditingId(null);
    setShowForm(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const status = form.status === "draft" && form.scheduledAt ? "scheduled" : form.status;
      if (editingId) {
        const updated = await patchItem<Deliverable>("deliverables", editingId, { ...form, status });
        setItems((current) => current.map((item) => item.id === editingId ? updated : item));
      } else {
        const created = await createItem<Deliverable>("deliverables", { projectId, ...form, status });
        setItems((current) => [created, ...current]);
      }
      resetForm();
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
        <button type="button" onClick={() => showForm ? resetForm() : setShowForm(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-xs font-medium text-paper">{showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{showForm ? "取消" : "添加发布版本"}</button>
      </div>
      {error && <p className="mb-4 text-xs text-red-500">{error}</p>}
      {showForm && (
        <form onSubmit={save} className="mb-7 grid gap-3 border-y border-line/70 py-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1.5"><span className="text-[11px] text-ink-soft">发布平台</span><select value={form.platform} onChange={(e) => setForm((value) => ({ ...value, platform: e.target.value as PublishPlatform }))} className="rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none">{Object.entries(platformLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-1.5 sm:col-span-1 lg:col-span-2"><span className="text-[11px] text-ink-soft">发布标题</span><input required value={form.title} onChange={(e) => setForm((value) => ({ ...value, title: e.target.value }))} placeholder="适配平台语气的标题" className="rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" /></label>
          <label className="grid gap-1.5 sm:col-span-2 lg:col-span-3"><span className="text-[11px] text-ink-soft">平台文案</span><textarea value={form.caption} onChange={(e) => setForm((value) => ({ ...value, caption: e.target.value }))} rows={4} placeholder="正文、话题和置顶评论" className="resize-y rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm leading-6 focus:border-accent focus:outline-none" /></label>
          <label className="grid gap-1.5"><span className="text-[11px] text-ink-soft">从项目素材选封面</span><select value={imageAssets.some((item) => item.url === form.coverUrl) ? form.coverUrl : ""} onChange={(e) => setForm((value) => ({ ...value, coverUrl: e.target.value }))} className="rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none"><option value="">不使用项目图片</option>{imageAssets.map((item) => <option key={item.id} value={item.url}>{item.title} · v{item.version}</option>)}</select></label>
          <label className="grid gap-1.5 sm:col-span-1 lg:col-span-2"><span className="text-[11px] text-ink-soft">封面链接</span><input value={form.coverUrl} onChange={(e) => setForm((value) => ({ ...value, coverUrl: e.target.value }))} placeholder="也可以手动粘贴链接" className="rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" /></label>
          <label className="grid gap-1.5"><span className="text-[11px] text-ink-soft">发布状态</span><select value={form.status} onChange={(e) => setForm((value) => ({ ...value, status: e.target.value as DeliverableStatus }))} className="rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none">{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-1.5"><span className="text-[11px] text-ink-soft">计划发布时间</span><input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((value) => ({ ...value, scheduledAt: e.target.value }))} className="rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none" /></label>
          <label className="grid gap-1.5"><span className="text-[11px] text-ink-soft">上线链接</span><input value={form.url} onChange={(e) => setForm((value) => ({ ...value, url: e.target.value }))} placeholder="发布后补充" className="rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" /></label>
          <div className="flex justify-end sm:col-span-2 lg:col-span-3"><button disabled={pending} className="h-9 rounded-md bg-accent px-4 text-xs font-medium text-white disabled:opacity-50">{pending ? "保存中…" : editingId ? "保存修改" : "保存发布版本"}</button></div>
        </form>
      )}
      <div className="divide-y divide-line/70 border-y border-line/70">
        {sorted.map((item) => (
          <article key={item.id} className="grid gap-4 py-5 md:grid-cols-[112px_minmax(0,1fr)] lg:grid-cols-[112px_minmax(0,1fr)_170px_auto] lg:items-start">
            <div className="aspect-[16/7] overflow-hidden rounded-md border border-line/70 bg-paper-deep md:aspect-[4/3]">
              {item.coverUrl ? <div role="img" aria-label={`${item.title}封面`} className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(item.coverUrl)})` }} /> : <div className="flex h-full items-center justify-center text-[10px] text-ink-soft">暂无封面</div>}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className={`h-2.5 w-2.5 rounded-sm ${platformColor[item.platform]}`} /><span className="text-[11px] text-ink-soft">{platformLabel[item.platform]}</span><h3 className="text-sm font-semibold text-ink">{item.title}</h3></div>
              {item.caption && <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-ink-soft">{item.caption}</p>}
              <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-ink-soft">
                {item.scheduledAt && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{new Date(item.scheduledAt).toLocaleString("zh-CN")}</span>}
                {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent">打开成片<ArrowUpRight className="h-3 w-3" /></a>}
                {item.caption && <button type="button" onClick={() => navigator.clipboard.writeText(item.caption ?? "")} className="inline-flex items-center gap-1 hover:text-accent"><Copy className="h-3 w-3" />复制文案</button>}
              </div>
            </div>
            <select value={item.status} onChange={(e) => changeStatus(item, e.target.value as DeliverableStatus)} className="h-9 rounded-md border border-line bg-paper px-3 text-xs focus:border-accent focus:outline-none">{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <div className="flex gap-1 lg:justify-end">
              <button type="button" onClick={() => beginEdit(item)} title="编辑" aria-label="编辑发布记录" className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-paper-deep hover:text-ink"><Pencil className="h-4 w-4" /></button>
              <button type="button" onClick={() => beginDuplicate(item)} title="复制到其他平台" aria-label="复制到其他平台" className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-paper-deep hover:text-accent"><Files className="h-4 w-4" /></button>
              <button type="button" onClick={() => remove(item)} title="删除" aria-label="删除发布记录" className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-red-500/10 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </div>
          </article>
        ))}
        {sorted.length === 0 && <p className="py-12 text-center text-xs text-ink-soft">还没有平台发布版本。</p>}
      </div>
    </section>
  );
}
