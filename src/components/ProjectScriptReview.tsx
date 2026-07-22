"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, GitCommitHorizontal, Lock, MessageSquarePlus } from "lucide-react";
import { createItem, patchItem } from "@/lib/clientData";
import type { ScriptReview, ScriptScene, ScriptVersion, ScriptVersionStatus } from "@/lib/types";

const statusLabel: Record<ScriptVersionStatus, string> = { draft: "草稿", in_review: "审核中", approved: "已通过", locked: "已锁定" };

export default function ProjectScriptReview({ projectId, scenes, initialVersions, initialReviews }: { projectId: string; scenes: ScriptScene[]; initialVersions: ScriptVersion[]; initialReviews: ScriptReview[] }) {
  const [versions, setVersions] = useState(initialVersions);
  const [reviews, setReviews] = useState(initialReviews);
  const [sceneId, setSceneId] = useState(scenes[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scene = scenes.find((item) => item.id === sceneId);
  const sceneVersions = useMemo(() => versions.filter((item) => item.sceneId === sceneId).sort((a, b) => b.version - a.version), [versions, sceneId]);
  const sceneReviews = reviews.filter((item) => item.sceneId === sceneId);

  async function snapshot() {
    if (!scene) return; setPending(true); setError(null);
    try {
      const created = await createItem<ScriptVersion>("scriptVersions", { projectId, sceneId, version: Math.max(0, ...sceneVersions.map((item) => item.version)) + 1, title: scene.title, script: scene.script, visual: scene.visual, duration: scene.duration, status: "draft", note });
      setVersions((current) => [created, ...current]); setNote("");
    } catch (err) { setError(err instanceof Error ? err.message : "版本保存失败。"); }
    finally { setPending(false); }
  }
  async function changeStatus(item: ScriptVersion, status: ScriptVersionStatus) { try { const updated = await patchItem<ScriptVersion>("scriptVersions", item.id, { status }); setVersions((current) => current.map((entry) => entry.id === item.id ? updated : entry)); } catch (err) { setError(err instanceof Error ? err.message : "版本状态更新失败。"); } }
  async function addReview(event: React.FormEvent) { event.preventDefault(); if (!sceneId) return; setPending(true); try { const created = await createItem<ScriptReview>("scriptReviews", { projectId, sceneId, versionId: sceneVersions[0]?.id, content: comment }); setReviews((current) => [created, ...current]); setComment(""); } catch (err) { setError(err instanceof Error ? err.message : "审阅意见保存失败。"); } finally { setPending(false); } }
  async function resolve(item: ScriptReview) { try { const updated = await patchItem<ScriptReview>("scriptReviews", item.id, { resolved: !item.resolved }); setReviews((current) => current.map((entry) => entry.id === item.id ? updated : entry)); } catch (err) { setError(err instanceof Error ? err.message : "审阅状态更新失败。"); } }

  if (scenes.length === 0) return null;
  return <section className="mt-10 border-t border-line pt-7" aria-labelledby="review-heading">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 id="review-heading" className="text-lg font-semibold text-ink">版本与审阅</h2><p className="mt-1 text-xs text-ink-soft">保存不可变快照，再进入审核、通过和锁定。</p></div><select value={sceneId} onChange={(e) => setSceneId(e.target.value)} className="h-9 max-w-full rounded-md border border-line bg-paper px-3 text-xs focus:border-accent focus:outline-none">{scenes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
    {error && <p className="mb-4 text-xs text-red-500">{error}</p>}
    <div className="grid gap-8 lg:grid-cols-2">
      <div><div className="mb-3 flex gap-2"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="本次版本说明，可选" className="h-9 min-w-0 flex-1 rounded-md border border-line bg-paper px-3 text-xs focus:border-accent focus:outline-none" /><button type="button" onClick={snapshot} disabled={pending} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-medium text-white disabled:opacity-50"><GitCommitHorizontal className="h-3.5 w-3.5" />保存版本</button></div><div className="divide-y divide-line/70 border-y border-line/70">{sceneVersions.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-xs font-medium text-ink">V{item.version} · {item.title}</p><p className="mt-1 truncate text-[11px] text-ink-soft">{item.note || new Date(item.createdAt).toLocaleString("zh-CN")}</p></div><select value={item.status} onChange={(e) => changeStatus(item, e.target.value as ScriptVersionStatus)} aria-label={`版本 ${item.version} 状态`} className="h-8 shrink-0 rounded border border-line bg-paper px-2 text-[11px] focus:border-accent focus:outline-none">{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>)}{sceneVersions.length === 0 && <p className="py-8 text-center text-xs text-ink-soft">暂无版本快照。</p>}</div></div>
      <div><form onSubmit={addReview} className="mb-3 flex gap-2"><input required value={comment} onChange={(e) => setComment(e.target.value)} placeholder="留下具体修改意见" className="h-9 min-w-0 flex-1 rounded-md border border-line bg-paper px-3 text-xs focus:border-accent focus:outline-none" /><button disabled={pending} title="添加审阅" aria-label="添加审阅" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink text-paper disabled:opacity-50"><MessageSquarePlus className="h-4 w-4" /></button></form><div className="divide-y divide-line/70 border-y border-line/70">{sceneReviews.map((item) => <button key={item.id} type="button" onClick={() => resolve(item)} className="flex w-full items-start gap-3 py-3 text-left"><span className={`mt-0.5 ${item.resolved ? "text-emerald-500" : "text-ink-soft"}`}>{item.resolved ? <CheckCircle2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}</span><span className="min-w-0"><span className={`block text-xs leading-5 ${item.resolved ? "text-ink-soft line-through" : "text-ink"}`}>{item.content}</span><span className="mt-1 block text-[10px] text-ink-soft">{item.createdBy} · {item.resolved ? "已解决" : "待处理"}</span></span></button>)}{sceneReviews.length === 0 && <p className="py-8 text-center text-xs text-ink-soft">暂无审阅意见。</p>}</div></div>
    </div>
  </section>;
}
