"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { Deliverable, ProgressTask, Project, ProjectMilestone } from "@/lib/types";

type CalendarEvent = { id: string; date: string; time?: string; title: string; subtitle: string; type: "task" | "milestone" | "publish"; href: string };
const typeColor = { task: "bg-sky-500", milestone: "bg-amber-500", publish: "bg-emerald-500" };
const typeLabel = { task: "任务", milestone: "节点", publish: "发布" };
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }

export default function StudioCalendar({ projects, tasks, milestones, deliverables }: { projects: Project[]; tasks: ProgressTask[]; milestones: ProjectMilestone[]; deliverables: Deliverable[] }) {
  const [cursor, setCursor] = useState(() => { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), 1); });
  const [selected, setSelected] = useState(localDateKey(new Date()));
  const projectMap = useMemo(() => new Map(projects.map((item) => [item.id, item.name])), [projects]);
  const events = useMemo<CalendarEvent[]>(() => [
    ...tasks.filter((item) => item.dueDate && item.status !== "done").map((item) => ({ id: item.id, date: item.dueDate!, time: undefined, title: item.title, subtitle: `${projectMap.get(item.projectId ?? "") ?? "未关联项目"} · ${item.assignee}`, type: "task" as const, href: `/progress/${item.id}` })),
    ...milestones.filter((item) => item.status !== "done").map((item) => ({ id: item.id, date: item.date, time: undefined, title: item.title, subtitle: projectMap.get(item.projectId) ?? "未关联项目", type: "milestone" as const, href: `/projects/${item.projectId}?tab=schedule` })),
    ...deliverables.filter((item) => item.status === "scheduled" && item.scheduledAt).map((item) => ({ id: item.id, date: item.scheduledAt!.slice(0, 10), time: new Date(item.scheduledAt!).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }), title: item.title, subtitle: projectMap.get(item.projectId) ?? "未关联项目", type: "publish" as const, href: `/projects/${item.projectId}?tab=publish` })),
  ].sort((a, b) => `${a.date}${a.time ?? ""}`.localeCompare(`${b.date}${b.time ?? ""}`)), [tasks, milestones, deliverables, projectMap]);
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(start); gridStart.setDate(1 - ((start.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => { const date = new Date(gridStart); date.setDate(gridStart.getDate() + index); return date; });
  const selectedEvents = events.filter((item) => item.date === selected);

  return <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
    <section><div className="mb-4 flex items-center justify-between border-b border-line pb-3"><button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} title="上个月" aria-label="上个月" className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink-soft"><ChevronLeft className="h-4 w-4" /></button><h2 className="text-base font-semibold text-ink">{cursor.getFullYear()}年 {cursor.getMonth() + 1}月</h2><button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} title="下个月" aria-label="下个月" className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink-soft"><ChevronRight className="h-4 w-4" /></button></div><div className="grid grid-cols-7 border-l border-t border-line">{["一", "二", "三", "四", "五", "六", "日"].map((day) => <div key={day} className="border-b border-r border-line bg-paper-soft py-2 text-center text-[10px] text-ink-soft">{day}</div>)}{days.map((date) => { const key = localDateKey(date); const dayEvents = events.filter((item) => item.date === key); const inMonth = date.getMonth() === cursor.getMonth(); const active = selected === key; return <button key={key} type="button" onClick={() => setSelected(key)} className={`aspect-square min-h-16 border-b border-r border-line p-1.5 text-left align-top sm:min-h-24 sm:p-2 ${active ? "bg-accent/5" : "bg-card hover:bg-paper-soft"}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${key === localDateKey(new Date()) ? "bg-accent text-white" : inMonth ? "text-ink" : "text-ink-soft/40"}`}>{date.getDate()}</span><span className="mt-1 flex flex-wrap gap-1">{dayEvents.slice(0, 4).map((item) => <span key={`${item.type}-${item.id}`} className={`h-1.5 w-1.5 rounded-full ${typeColor[item.type]}`} />)}{dayEvents.length > 4 && <span className="text-[9px] text-ink-soft">+{dayEvents.length - 4}</span>}</span><span className="mt-1 hidden truncate text-[9px] text-ink-soft sm:block">{dayEvents[0]?.title}</span></button>; })}</div></section>
    <aside><div className="mb-4 border-b border-line pb-3"><p className="text-[11px] text-ink-soft">所选日期</p><h2 className="mt-1 text-lg font-semibold text-ink">{new Date(`${selected}T00:00:00`).toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}</h2></div><div className="divide-y divide-line/70 border-y border-line/70">{selectedEvents.map((item) => <Link key={`${item.type}-${item.id}`} href={item.href} className="flex gap-3 py-4"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-sm ${typeColor[item.type]}`} /><span className="min-w-0"><span className="flex items-center gap-2"><span className="text-[10px] text-ink-soft">{typeLabel[item.type]}{item.time ? ` · ${item.time}` : ""}</span></span><span className="mt-1 block text-sm font-medium text-ink">{item.title}</span><span className="mt-1 block truncate text-xs text-ink-soft">{item.subtitle}</span></span></Link>)}{selectedEvents.length === 0 && <div className="py-12 text-center"><CalendarDays className="mx-auto h-5 w-5 text-ink-soft" /><p className="mt-3 text-xs text-ink-soft">当天没有排期。</p></div>}</div></aside>
  </div>;
}
