"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Edit3, Plus, Trash2 } from "lucide-react";
import { createItem, deleteItem, patchItem } from "@/lib/clientData";
import type { MilestoneStatus, ProgressTask, ProjectMilestone } from "@/lib/types";

const milestoneStatusLabel: Record<MilestoneStatus, string> = {
  planned: "待开始",
  doing: "进行中",
  done: "已完成",
};

type MilestoneForm = {
  title: string;
  date: string;
  status: MilestoneStatus;
  assignee: string;
  note: string;
};

const emptyForm: MilestoneForm = {
  title: "",
  date: "",
  status: "planned",
  assignee: "",
  note: "",
};

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function dateDistance(value: string) {
  const target = new Date(`${value}T00:00:00`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((target - today.getTime()) / 86400000);
  if (days === 0) return "今天";
  if (days > 0) return `${days} 天后`;
  return `逾期 ${Math.abs(days)} 天`;
}

export default function ProjectSchedule({
  projectId,
  initialMilestones,
  tasks,
}: {
  projectId: string;
  initialMilestones: ProjectMilestone[];
  tasks: ProgressTask[];
}) {
  const router = useRouter();
  const [milestones, setMilestones] = useState(initialMilestones);
  const [form, setForm] = useState<MilestoneForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const events = useMemo(
    () => [
      ...milestones.map((item) => ({
        key: item.id,
        date: item.date,
        kind: "milestone" as const,
        item,
      })),
      ...tasks.filter((task) => task.dueDate).map((item) => ({
        key: item.id,
        date: item.dueDate!,
        kind: "task" as const,
        item,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date)),
    [milestones, tasks]
  );
  const unscheduledTasks = tasks.filter((task) => !task.dueDate && task.status !== "done");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = new Date(today.getTime() - today.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekKey = new Date(nextWeek.getTime() - nextWeek.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const openEvents = events.filter((event) => event.item.status !== "done");
  const overdueCount = openEvents.filter((event) => event.date < todayKey).length;
  const upcomingCount = openEvents.filter((event) => event.date >= todayKey && event.date <= nextWeekKey).length;
  const completedMilestones = milestones.filter((item) => item.status === "done").length;

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function editMilestone(item: ProjectMilestone) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      date: item.date,
      status: item.status,
      assignee: item.assignee ?? "",
      note: item.note ?? "",
    });
    setShowForm(true);
  }

  async function saveMilestone(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.date) return;
    setPending(true);
    setError(null);
    const payload = { projectId, ...form };
    try {
      if (editingId) {
        const updated = await patchItem<ProjectMilestone>("milestones", editingId, payload);
        setMilestones((current) => current.map((item) => (item.id === editingId ? updated : item)));
      } else {
        const created = await createItem<ProjectMilestone>("milestones", payload);
        setMilestones((current) => [...current, created]);
      }
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "排期保存失败。");
    } finally {
      setPending(false);
    }
  }

  async function updateStatus(item: ProjectMilestone, status: MilestoneStatus) {
    setError(null);
    try {
      const updated = await patchItem<ProjectMilestone>("milestones", item.id, { status });
      setMilestones((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "状态更新失败。");
    }
  }

  async function removeMilestone(item: ProjectMilestone) {
    if (!window.confirm(`删除里程碑「${item.title}」？`)) return;
    try {
      await deleteItem("milestones", item.id);
      setMilestones((current) => current.filter((entry) => entry.id !== item.id));
      if (editingId === item.id) resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败。");
    }
  }

  return (
    <section aria-labelledby="schedule-heading">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="schedule-heading" className="text-lg font-semibold text-ink">项目排期</h2>
          <p className="mt-1 text-xs leading-5 text-ink-soft">里程碑和任务截止日期在一条制作线上展示。</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showForm) resetForm();
            else {
              setForm(emptyForm);
              setEditingId(null);
              setShowForm(true);
            }
          }}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-xs font-medium text-paper hover:bg-ink/85"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {showForm ? "收起" : "添加里程碑"}
        </button>
      </div>

      {error && <p className="mb-4 text-xs text-red-500">{error}</p>}

      <div className="mb-7 grid grid-cols-2 border-y border-line/70 sm:grid-cols-4">
        {[
          ["未来 7 天", upcomingCount, upcomingCount > 0 ? "text-accent" : "text-ink"],
          ["已逾期", overdueCount, overdueCount > 0 ? "text-red-500" : "text-ink"],
          ["未排期任务", unscheduledTasks.length, unscheduledTasks.length > 0 ? "text-amber-600" : "text-ink"],
          ["已完成节点", `${completedMilestones}/${milestones.length}`, "text-ink"],
        ].map(([label, value, color], index) => <div key={label} className={`px-3 py-4 ${index % 2 ? "border-l border-line/70" : ""} ${index > 1 ? "border-t border-line/70 sm:border-t-0" : ""} ${index > 0 ? "sm:border-l sm:border-line/70" : ""}`}><p className="text-[11px] text-ink-soft">{label}</p><p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p></div>)}
      </div>

      {showForm && (
        <form onSubmit={saveMilestone} className="mb-7 grid grid-cols-1 gap-3 border-b border-line pb-7 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="milestone-title">里程碑</label>
            <input id="milestone-title" required value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="例如：脚本锁定 / 正式拍摄 / 首发" className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="milestone-date">日期</label>
            <input id="milestone-date" required type="date" value={form.date} onChange={(event) => setForm((value) => ({ ...value, date: event.target.value }))} className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="milestone-status">状态</label>
            <select id="milestone-status" value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as MilestoneStatus }))} className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none">
              {Object.entries(milestoneStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="milestone-assignee">负责人</label>
            <input id="milestone-assignee" value={form.assignee} onChange={(event) => setForm((value) => ({ ...value, assignee: event.target.value }))} placeholder="可选" className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="milestone-note">交付标准</label>
            <input id="milestone-note" value={form.note} onChange={(event) => setForm((value) => ({ ...value, note: event.target.value }))} placeholder="这一节点完成的判断标准" className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-4">
            <button type="button" onClick={resetForm} className="h-9 rounded-md border border-line px-4 text-xs text-ink-soft">取消</button>
            <button type="submit" disabled={pending} className="h-9 rounded-md bg-accent px-4 text-xs font-medium text-white disabled:opacity-50">{pending ? "保存中…" : editingId ? "保存里程碑" : "加入排期"}</button>
          </div>
        </form>
      )}

      {events.length > 0 ? (
        <div className="relative ml-2 border-l border-line pb-1 sm:ml-24">
          {events.map((event) => {
            const isMilestone = event.kind === "milestone";
            const complete = event.item.status === "done";
            return (
              <div key={`${event.kind}-${event.key}`} className="relative pb-7 pl-6 sm:pl-8">
                <div className={`absolute -left-[5px] top-2 h-[9px] w-[9px] rounded-full ring-4 ring-paper ${complete ? "bg-emerald-500" : isMilestone ? "bg-accent" : "bg-sky-500"}`} />
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <time className="text-xs font-semibold text-ink sm:absolute sm:-left-24 sm:w-20 sm:text-right">{formatDate(event.date)}</time>
                  <span className="rounded bg-paper-soft px-2 py-0.5 text-[10px] text-ink-soft">{isMilestone ? "里程碑" : "任务"}</span>
                  <span className={`text-[10px] ${dateDistance(event.date).startsWith("逾期") && !complete ? "text-red-500" : "text-ink-soft"}`}>{dateDistance(event.date)}</span>
                </div>
                {isMilestone ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{event.item.title}</p>
                      <p className="mt-1 text-xs text-ink-soft">{[event.item.assignee, event.item.note].filter(Boolean).join(" · ") || "暂无补充信息"}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <select value={event.item.status} onChange={(change) => updateStatus(event.item, change.target.value as MilestoneStatus)} aria-label={`${event.item.title}的状态`} className="h-8 rounded border border-line bg-paper px-2 text-xs focus:border-accent focus:outline-none">
                        {Object.entries(milestoneStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <button type="button" onClick={() => editMilestone(event.item)} title="编辑" aria-label="编辑里程碑" className="flex h-8 w-8 items-center justify-center rounded text-ink-soft hover:bg-paper-soft hover:text-ink"><Edit3 className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => removeMilestone(event.item)} title="删除" aria-label="删除里程碑" className="flex h-8 w-8 items-center justify-center rounded text-ink-soft hover:bg-red-500/10 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ) : (
                  <Link href={`/progress/${event.item.id}`} className="block text-sm font-medium text-ink hover:text-accent">
                    {event.item.title}<span className="ml-2 text-xs font-normal text-ink-soft">{event.item.assignee}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border-y border-dashed border-line py-12 text-center">
          <CalendarDays className="mx-auto h-5 w-5 text-ink-soft" aria-hidden="true" />
          <p className="mt-3 text-sm text-ink">项目还没有排期</p>
          <p className="mt-1 text-xs text-ink-soft">添加关键里程碑，已有任务的截止日期也会自动出现。</p>
        </div>
      )}

      {unscheduledTasks.length > 0 && (
        <div className="mt-8 border-t border-line pt-5">
          <h3 className="text-sm font-semibold text-ink">未排期任务</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {unscheduledTasks.map((task) => (
              <Link key={task.id} href={`/progress/${task.id}`} className="rounded border border-line bg-paper-soft px-3 py-2 text-xs text-ink-soft hover:border-accent hover:text-accent">
                {task.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
