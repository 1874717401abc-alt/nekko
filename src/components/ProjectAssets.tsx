"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, FileText, Image as ImageIcon, Pencil, Search, Trash2, Upload, Video } from "lucide-react";
import { deleteItem, patchItem } from "@/lib/clientData";
import type { InspirationItem, LibraryItem, ProjectAsset, ProjectAssetKind } from "@/lib/types";

const kindLabel: Record<ProjectAssetKind, string> = { image: "图片", video: "视频", document: "文档", contract: "合同", invoice: "发票", other: "其他" };
function sizeLabel(bytes: number) { return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }

export default function ProjectAssets({ projectId, initialAssets, inspiration, library }: { projectId: string; initialAssets: ProjectAsset[]; inspiration: InspirationItem[]; library: LibraryItem[] }) {
  const [assets, setAssets] = useState(initialAssets);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<ProjectAssetKind>("image");
  const [tags, setTags] = useState("");
  const [note, setNote] = useState("");
  const [versionOf, setVersionOf] = useState("");
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<ProjectAssetKind | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTags, setEditTags] = useState("");
  const [editNote, setEditNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const visibleAssets = useMemo(() => assets.filter((item) => {
    if (kindFilter !== "all" && item.kind !== kindFilter) return false;
    const keyword = query.trim().toLowerCase();
    return !keyword || [item.title, item.fileName, item.note ?? "", ...item.tags].join(" ").toLowerCase().includes(keyword);
  }).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), [assets, kindFilter, query]);

  async function upload(event: React.FormEvent) {
    event.preventDefault(); const file = fileRef.current?.files?.[0]; if (!file) return;
    setPending(true); setError(null);
    const baseAsset = assets.find((item) => item.id === versionOf);
    const version = baseAsset ? Math.max(0, ...assets.filter((item) => item.title === baseAsset.title).map((item) => item.version)) + 1 : 1;
    const form = new FormData(); form.set("file", file); form.set("projectId", projectId); form.set("kind", baseAsset?.kind ?? kind); form.set("tags", tags || baseAsset?.tags.join(",") || ""); form.set("note", note); form.set("version", String(version)); if (baseAsset) form.set("title", baseAsset.title);
    try { const response = await fetch("/api/project-assets", { method: "POST", body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "上传失败。"); setAssets((current) => [data as ProjectAsset, ...current]); setTags(""); setNote(""); setVersionOf(""); if (fileRef.current) fileRef.current.value = ""; }
    catch (err) { setError(err instanceof Error ? err.message : "上传失败。"); }
    finally { setPending(false); }
  }
  async function remove(item: ProjectAsset) { if (!window.confirm(`删除素材「${item.title}」？`)) return; try { await deleteItem("assets", item.id); setAssets((current) => current.filter((entry) => entry.id !== item.id)); } catch (err) { setError(err instanceof Error ? err.message : "删除失败。"); } }
  function beginEdit(item: ProjectAsset) { setEditingId(item.id); setEditTags(item.tags.join(", ")); setEditNote(item.note ?? ""); }
  async function saveMetadata(item: ProjectAsset) { try { const updated = await patchItem<ProjectAsset>("assets", item.id, { tags: editTags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean), note: editNote }); setAssets((current) => current.map((entry) => entry.id === item.id ? updated : entry)); setEditingId(null); } catch (err) { setError(err instanceof Error ? err.message : "素材信息保存失败。"); } }

  return <div>
    <section aria-labelledby="asset-file-heading">
      <div className="mb-5"><h2 id="asset-file-heading" className="text-lg font-semibold text-ink">项目文件</h2><p className="mt-1 text-xs text-ink-soft">图片、视频、文档、合同和发票统一归档；文档文字可供 Agent 使用。</p></div>
      {error && <p className="mb-4 text-xs text-red-500">{error}</p>}
      <form onSubmit={upload} className="mb-5 grid gap-3 border-y border-line/70 py-5 sm:grid-cols-2 lg:grid-cols-3">
        <input ref={fileRef} required type="file" accept="image/*,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx,.txt,.md,.csv,.json" className="min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-xs file:mr-3 file:rounded file:border-0 file:bg-paper-soft file:px-2 file:py-1 file:text-xs" />
        <select value={versionOf} onChange={(e) => { setVersionOf(e.target.value); const selected = assets.find((item) => item.id === e.target.value); if (selected) setKind(selected.kind); }} className="rounded-md border border-line bg-paper px-3 py-2.5 text-xs focus:border-accent focus:outline-none"><option value="">作为新素材上传</option>{assets.map((item) => <option key={item.id} value={item.id}>替换版本：{item.title} V{item.version}</option>)}</select>
        <select value={kind} onChange={(e) => setKind(e.target.value as ProjectAssetKind)} className="rounded-md border border-line bg-paper px-3 py-2.5 text-xs focus:border-accent focus:outline-none">{Object.entries(kindLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="标签，逗号分隔" className="rounded-md border border-line bg-paper px-3 py-2.5 text-xs focus:border-accent focus:outline-none" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="版本或用途说明" className="rounded-md border border-line bg-paper px-3 py-2.5 text-xs focus:border-accent focus:outline-none" />
        <button disabled={pending} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-xs font-medium text-white disabled:opacity-50 lg:col-span-3"><Upload className="h-4 w-4" />{pending ? "上传中…" : versionOf ? "上传新版本" : "上传"}</button>
      </form>
      <div className="mb-5 flex flex-wrap gap-2"><div className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索文件名、标签或备注" className="h-9 w-full rounded-md border border-line bg-paper pl-9 pr-3 text-xs focus:border-accent focus:outline-none" /></div><select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as ProjectAssetKind | "all")} className="h-9 rounded-md border border-line bg-paper px-3 text-xs focus:border-accent focus:outline-none"><option value="all">全部类型</option>{Object.entries(kindLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleAssets.map((item) => <article key={item.id} className="overflow-hidden rounded-md border border-line bg-card"><a href={item.url} target="_blank" rel="noreferrer" className="block aspect-video overflow-hidden bg-paper-soft">{item.kind === "image" ? <>{/* Authenticated uploads intentionally bypass the public image optimizer. */}<img src={item.url} alt={item.title} className="h-full w-full object-cover" /></> : item.kind === "video" ? <video src={item.url} controls preload="metadata" className="h-full w-full bg-black object-contain" /> : <span className="flex h-full items-center justify-center"><FileText className="h-8 w-8 text-ink-soft" /></span>}</a><div className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{item.title}</p><p className="mt-1 text-[11px] text-ink-soft">{kindLabel[item.kind]} · V{item.version} · {sizeLabel(item.size)}</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => beginEdit(item)} title="编辑信息" aria-label="编辑素材信息" className="flex h-7 w-7 items-center justify-center rounded text-ink-soft hover:bg-paper-soft hover:text-accent"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => remove(item)} title="删除" aria-label="删除素材" className="flex h-7 w-7 items-center justify-center rounded text-ink-soft hover:bg-red-500/10 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></div></div>{editingId === item.id ? <div className="mt-3 grid gap-2"><input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="标签" className="rounded border border-line bg-paper px-2.5 py-2 text-xs focus:border-accent focus:outline-none" /><input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="备注" className="rounded border border-line bg-paper px-2.5 py-2 text-xs focus:border-accent focus:outline-none" /><button type="button" onClick={() => saveMetadata(item)} className="inline-flex h-8 items-center justify-center gap-1.5 rounded bg-ink text-xs text-paper"><Check className="h-3.5 w-3.5" />保存</button></div> : <>{item.tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{item.tags.map((tag) => <span key={tag} className="rounded bg-paper-soft px-1.5 py-0.5 text-[10px] text-ink-soft">{tag}</span>)}</div>}{item.note && <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-soft">{item.note}</p>}</>}{item.extractedText && <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-600"><FileText className="h-3 w-3" />Agent 可读取文字</p>}</div></article>)}{visibleAssets.length === 0 && <div className="border-y border-dashed border-line py-12 text-center sm:col-span-2 xl:col-span-3"><Upload className="mx-auto h-5 w-5 text-ink-soft" /><p className="mt-3 text-xs text-ink-soft">{assets.length === 0 ? "还没有上传项目文件。" : "没有匹配的项目文件。"}</p></div>}</div>
    </section>
    <section className="mt-10 border-t border-line pt-7" aria-labelledby="linked-assets-heading"><div className="mb-4 flex items-center justify-between"><h2 id="linked-assets-heading" className="text-sm font-semibold text-ink">关联灵感与资料</h2><Link href="/library" className="inline-flex items-center gap-1 text-xs text-accent">打开资料库<ArrowUpRight className="h-3 w-3" /></Link></div><div className="grid gap-6 lg:grid-cols-2"><div className="divide-y divide-line/70 border-y border-line/70">{inspiration.map((item) => <div key={item.id} className="flex items-start gap-3 py-3"><ImageIcon className="mt-0.5 h-4 w-4 text-accent" /><div><p className="text-xs font-medium text-ink">{item.title}</p>{item.note && <p className="mt-1 line-clamp-2 text-[11px] text-ink-soft">{item.note}</p>}</div></div>)}{inspiration.length === 0 && <p className="py-8 text-center text-xs text-ink-soft">暂无关联灵感。</p>}</div><div className="divide-y divide-line/70 border-y border-line/70">{library.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="flex items-start gap-3 py-3"><Video className="mt-0.5 h-4 w-4 text-sky-500" /><div className="min-w-0"><p className="truncate text-xs font-medium text-ink">{item.title}</p><p className="mt-1 text-[11px] text-ink-soft">{item.category}</p></div></a>)}{library.length === 0 && <p className="py-8 text-center text-xs text-ink-soft">暂无关联资料。</p>}</div></div></section>
  </div>;
}
