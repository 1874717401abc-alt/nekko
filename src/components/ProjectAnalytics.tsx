"use client";

import { useMemo, useState } from "react";
import { BarChart3, Plus, Trash2 } from "lucide-react";
import { createItem, deleteItem } from "@/lib/clientData";
import type { CostItem, Deliverable, PerformanceRecord, PublishPlatform } from "@/lib/types";

const metricFields = [["views", "播放"], ["likes", "点赞"], ["comments", "评论"], ["saves", "收藏"], ["shares", "分享"], ["followers", "涨粉"], ["completionRate", "完播率 %"], ["revenue", "收入"]] as const;
const platformLabel: Record<PublishPlatform, string> = { bilibili: "B站", xiaohongshu: "小红书", douyin: "抖音", wechat: "视频号", other: "其他" };
function number(value: number) { return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 }).format(value); }

export default function ProjectAnalytics({ projectId, initialRecords, deliverables, costs }: { projectId: string; initialRecords: PerformanceRecord[]; deliverables: Deliverable[]; costs: CostItem[] }) {
  const [records, setRecords] = useState(initialRecords);
  const [showForm, setShowForm] = useState(initialRecords.length === 0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<Record<string, string>>({ recordedAt: today, deliverableId: "", views: "", likes: "", comments: "", saves: "", shares: "", followers: "", completionRate: "", revenue: "", note: "" });
  const totals = useMemo(() => records.reduce((sum, item) => ({ views: sum.views + item.views, likes: sum.likes + item.likes, saves: sum.saves + item.saves, followers: sum.followers + item.followers, revenue: sum.revenue + item.revenue, interactions: sum.interactions + item.likes + item.comments + item.saves + item.shares, weightedCompletion: sum.weightedCompletion + item.completionRate * item.views }), { views: 0, likes: 0, saves: 0, followers: 0, revenue: 0, interactions: 0, weightedCompletion: 0 }), [records]);
  const trend = useMemo(() => {
    const grouped = new Map<string, { date: string; views: number; interactions: number; revenue: number }>();
    records.forEach((item) => {
      const current = grouped.get(item.recordedAt) ?? { date: item.recordedAt, views: 0, interactions: 0, revenue: 0 };
      current.views += item.views;
      current.interactions += item.likes + item.comments + item.saves + item.shares;
      current.revenue += item.revenue;
      grouped.set(item.recordedAt, current);
    });
    return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-8);
  }, [records]);
  const platformStats = useMemo(() => {
    type Summary = { platform: PublishPlatform; deliverables: number; views: number; interactions: number; followers: number; revenue: number };
    const byPlatform = new Map<PublishPlatform, Summary>();
    const deliveryById = new Map(deliverables.map((item) => [item.id, item]));
    deliverables.forEach((item) => {
      const summary = byPlatform.get(item.platform) ?? { platform: item.platform, deliverables: 0, views: 0, interactions: 0, followers: 0, revenue: 0 };
      summary.deliverables += 1;
      byPlatform.set(item.platform, summary);
    });
    records.forEach((item) => {
      const delivery = item.deliverableId ? deliveryById.get(item.deliverableId) : undefined;
      if (!delivery) return;
      const summary = byPlatform.get(delivery.platform) ?? { platform: delivery.platform, deliverables: 0, views: 0, interactions: 0, followers: 0, revenue: 0 };
      summary.views += item.views;
      summary.interactions += item.likes + item.comments + item.saves + item.shares;
      summary.followers += item.followers;
      summary.revenue += item.revenue;
      byPlatform.set(delivery.platform, summary);
    });
    return [...byPlatform.values()].sort((a, b) => b.views - a.views);
  }, [deliverables, records]);
  const totalCost = costs.reduce((sum, item) => sum + item.amount, 0);
  const roi = totalCost > 0 ? ((totals.revenue - totalCost) / totalCost) * 100 : null;
  const interactionRate = totals.views > 0 ? totals.interactions / totals.views * 100 : 0;
  const averageCompletion = totals.views > 0 ? totals.weightedCompletion / totals.views : 0;
  const revenuePerTenThousand = totals.views > 0 ? totals.revenue / totals.views * 10_000 : 0;
  const maxTrendViews = Math.max(...trend.map((item) => item.views), 1);

  async function add(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError(null);
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => metricFields.some(([name]) => name === key) ? [key, Number(value) || 0] : [key, value]));
      const created = await createItem<PerformanceRecord>("performance", { projectId, ...payload });
      setRecords((current) => [created, ...current]); setShowForm(false);
    } catch (err) { setError(err instanceof Error ? err.message : "数据保存失败。"); }
    finally { setPending(false); }
  }

  async function remove(item: PerformanceRecord) { if (!window.confirm("删除这条复盘数据？")) return; try { await deleteItem("performance", item.id); setRecords((current) => current.filter((entry) => entry.id !== item.id)); } catch (err) { setError(err instanceof Error ? err.message : "删除失败。"); } }

  return (
    <section aria-labelledby="analytics-heading">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 id="analytics-heading" className="text-lg font-semibold text-ink">数据复盘</h2><p className="mt-1 text-xs text-ink-soft">把传播、增长、成本和收入放在同一张项目账上。</p></div><button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-xs font-medium text-paper"><Plus className="h-4 w-4" />{showForm ? "收起" : "录入数据"}</button></div>
      {error && <p className="mb-4 text-xs text-red-500">{error}</p>}
      <div className="mb-7 grid grid-cols-2 border-y border-line/70 lg:grid-cols-6">
        {[["累计播放", number(totals.views)], ["点赞", number(totals.likes)], ["收藏", number(totals.saves)], ["涨粉", number(totals.followers)], ["收入", `¥${number(totals.revenue)}`], ["ROI", roi === null ? "待补成本" : `${number(roi)}%`]].map(([label, value], index) => <div key={label} className={`px-3 py-4 ${index > 0 ? "border-l border-line/70" : ""} ${index > 1 ? "max-lg:border-t" : ""}`}><p className="text-[11px] text-ink-soft">{label}</p><p className={`mt-1 text-lg font-semibold ${label === "ROI" && roi !== null && roi < 0 ? "text-red-500" : "text-ink"}`}>{value}</p></div>)}
      </div>
      {showForm && <form onSubmit={add} className="mb-7 grid gap-3 border-b border-line pb-6 sm:grid-cols-2 lg:grid-cols-4"><input required type="date" value={form.recordedAt} onChange={(e) => setForm((value) => ({ ...value, recordedAt: e.target.value }))} className="rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none" /><select value={form.deliverableId} onChange={(e) => setForm((value) => ({ ...value, deliverableId: e.target.value }))} className="rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none"><option value="">整个项目</option>{deliverables.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>{metricFields.map(([name, label]) => <input key={name} type="number" min="0" step={name === "completionRate" || name === "revenue" ? "0.1" : "1"} value={form[name]} onChange={(e) => setForm((value) => ({ ...value, [name]: e.target.value }))} placeholder={label} className="rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" />)}<input value={form.note} onChange={(e) => setForm((value) => ({ ...value, note: e.target.value }))} placeholder="复盘备注" className="rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none sm:col-span-2 lg:col-span-3" /><button disabled={pending} className="h-10 rounded-md bg-accent px-4 text-xs font-medium text-white disabled:opacity-50">{pending ? "保存中…" : "保存记录"}</button></form>}
      {records.length > 0 && <div className="mb-8 grid gap-8 border-b border-line/70 pb-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="min-w-0">
          <div className="mb-4 flex items-end justify-between gap-3"><div><h3 className="text-sm font-semibold text-ink">播放趋势</h3><p className="mt-1 text-[11px] text-ink-soft">最近 {trend.length} 个记录日</p></div><p className="text-[11px] text-ink-soft">峰值 {number(maxTrendViews)}</p></div>
          <div className="flex h-44 items-end gap-2 border-b border-line/70 px-1 pt-4">
            {trend.map((item) => <div key={item.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="invisible text-[10px] text-ink-soft group-hover:visible">{number(item.views)}</span><div className="w-full max-w-12 rounded-t-sm bg-accent/80 transition-colors group-hover:bg-accent" style={{ height: `${Math.max(item.views / maxTrendViews * 116, 4)}px` }} /><span className="w-full truncate text-center text-[10px] text-ink-soft">{item.date.slice(5)}</span></div>)}
          </div>
          <div className="mt-5 grid grid-cols-3 divide-x divide-line/70">
            {[["互动率", `${number(interactionRate)}%`], ["平均完播", `${number(averageCompletion)}%`], ["万播收入", `¥${number(revenuePerTenThousand)}`]].map(([label, value]) => <div key={label} className="px-3 first:pl-0"><p className="text-[10px] text-ink-soft">{label}</p><p className="mt-1 text-sm font-semibold text-ink">{value}</p></div>)}
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-4"><h3 className="text-sm font-semibold text-ink">平台对比</h3><p className="mt-1 text-[11px] text-ink-soft">只统计绑定到具体发布版本的数据</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-xs">
              <thead className="border-b border-line/70 text-[10px] text-ink-soft"><tr><th className="pb-2 font-normal">平台</th><th className="pb-2 text-right font-normal">内容</th><th className="pb-2 text-right font-normal">播放</th><th className="pb-2 text-right font-normal">互动</th><th className="pb-2 text-right font-normal">涨粉</th><th className="pb-2 text-right font-normal">收入</th></tr></thead>
              <tbody className="divide-y divide-line/60">{platformStats.map((item) => <tr key={item.platform}><td className="py-3 font-medium text-ink">{platformLabel[item.platform]}</td><td className="py-3 text-right text-ink-soft">{item.deliverables}</td><td className="py-3 text-right text-ink">{number(item.views)}</td><td className="py-3 text-right text-ink-soft">{number(item.interactions)}</td><td className="py-3 text-right text-ink-soft">{number(item.followers)}</td><td className="py-3 text-right text-ink-soft">¥{number(item.revenue)}</td></tr>)}</tbody>
            </table>
            {platformStats.length === 0 && <p className="py-10 text-center text-xs text-ink-soft">先把数据绑定到发布版本，即可比较平台表现。</p>}
          </div>
        </div>
      </div>}
      <div className="divide-y divide-line/70 border-y border-line/70">{[...records].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).map((item) => { const delivery = deliverables.find((entry) => entry.id === item.deliverableId); return <div key={item.id} className="grid gap-3 py-4 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-center"><div><p className="text-xs font-medium text-ink">{item.recordedAt}</p><p className="mt-1 truncate text-[11px] text-ink-soft">{delivery?.title ?? "整个项目"}</p></div><div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft"><span>播放 {number(item.views)}</span><span>互动 {number(item.likes + item.comments + item.saves + item.shares)}</span><span>涨粉 {number(item.followers)}</span><span>完播 {number(item.completionRate)}%</span><span>收入 ¥{number(item.revenue)}</span></div><button type="button" onClick={() => remove(item)} title="删除" aria-label="删除复盘记录" className="flex h-8 w-8 items-center justify-center rounded text-ink-soft hover:bg-red-500/10 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></div>; })}{records.length === 0 && <div className="py-12 text-center"><BarChart3 className="mx-auto h-5 w-5 text-ink-soft" /><p className="mt-3 text-xs text-ink-soft">发布后从第一条数据记录开始复盘。</p></div>}</div>
    </section>
  );
}
