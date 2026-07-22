"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  Edit3,
  FolderOpen,
  LayoutDashboard,
  Plus,
  ScrollText,
  Send,
  ShieldCheck,
  Trash2,
  WalletCards,
} from "lucide-react";
import ProjectAssets from "@/components/ProjectAssets";
import ProjectCostLedger from "@/components/ProjectCostLedger";
import ProjectAnalytics from "@/components/ProjectAnalytics";
import ProjectPipeline from "@/components/ProjectPipeline";
import ProjectPublishingBoard from "@/components/ProjectPublishingBoard";
import ProjectSchedule from "@/components/ProjectSchedule";
import ProjectScriptBoard from "@/components/ProjectScriptBoard";
import ProjectScriptReview from "@/components/ProjectScriptReview";
import { createItem, deleteItem, patchItem } from "@/lib/clientData";
import type {
  CostItem,
  Deliverable,
  InspirationItem,
  LibraryItem,
  Project,
  ProjectAsset,
  ProjectMilestone,
  ProjectStage,
  ProgressTask,
  ScriptScene,
  ScriptReview,
  ScriptVersion,
  PerformanceRecord,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";

const easeOut = [0.22, 1, 0.36, 1] as const;

const statusLabel: Record<TaskStatus, string> = {
  todo: "待开始",
  doing: "进行中",
  done: "已完成",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function shortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}分${rest ? `${rest}秒` : ""}` : `${rest}秒`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

type QuickKind = "task" | "library" | "inspiration";
type ProjectTab = "overview" | "script" | "costs" | "schedule" | "assets" | "publish" | "analytics";

const tabs: { value: ProjectTab; label: string; icon: typeof LayoutDashboard }[] = [
  { value: "overview", label: "总览", icon: LayoutDashboard },
  { value: "script", label: "脚本", icon: ScrollText },
  { value: "costs", label: "成本", icon: WalletCards },
  { value: "schedule", label: "排期", icon: CalendarDays },
  { value: "assets", label: "素材", icon: FolderOpen },
  { value: "publish", label: "发布", icon: Send },
  { value: "analytics", label: "复盘", icon: BarChart3 },
];

const projectStageLabel: Record<ProjectStage, string> = {
  idea: "选题",
  research: "调研",
  script: "脚本",
  shooting: "拍摄",
  editing: "剪辑",
  review: "审核",
  publishing: "发布",
  published: "已发布",
  retrospective: "复盘",
};

export default function ProjectDetail({
  project,
  inspiration,
  library,
  progress,
  scripts,
  costs,
  milestones,
  scriptVersions,
  scriptReviews,
  assets,
  deliverables,
  performance,
  initialTab = "overview",
}: {
  project: Project;
  inspiration: InspirationItem[];
  library: LibraryItem[];
  progress: ProgressTask[];
  scripts: ScriptScene[];
  costs: CostItem[];
  milestones: ProjectMilestone[];
  scriptVersions: ScriptVersion[];
  scriptReviews: ScriptReview[];
  assets: ProjectAsset[];
  deliverables: Deliverable[];
  performance: PerformanceRecord[];
  initialTab?: ProjectTab;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProjectTab>(initialTab);
  const tabNavRef = useRef<HTMLElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickKind, setQuickKind] = useState<QuickKind>("task");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickUrl, setQuickUrl] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [quickCategory, setQuickCategory] = useState("");
  const [quickAssignee, setQuickAssignee] = useState("");
  const [quickPriority, setQuickPriority] = useState<TaskPriority>("normal");
  const [quickDueDate, setQuickDueDate] = useState("");
  const [quickTags, setQuickTags] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [briefStatus, setBriefStatus] = useState("导出简报");

  const myInspiration = inspiration.filter((item) => item.projectId === project.id);
  const myLibrary = library.filter((item) => item.projectId === project.id);
  const myProgress = progress.filter((item) => item.projectId === project.id);
  const myScripts = scripts.filter((item) => item.projectId === project.id);
  const myCosts = costs.filter((item) => item.projectId === project.id);
  const myMilestones = milestones.filter((item) => item.projectId === project.id);
  const myScriptVersions = scriptVersions.filter((item) => item.projectId === project.id);
  const myScriptReviews = scriptReviews.filter((item) => item.projectId === project.id);
  const myAssets = assets.filter((item) => item.projectId === project.id);
  const myDeliverables = deliverables.filter((item) => item.projectId === project.id);
  const myPerformance = performance.filter((item) => item.projectId === project.id);
  const completedTasks = myProgress.filter((task) => task.status === "done").length;
  const totalRuntime = myScripts.reduce((sum, scene) => sum + scene.duration, 0);
  const totalCost = myCosts.reduce((sum, item) => sum + item.amount, 0);
  const nextMilestone = [...myMilestones]
    .filter((item) => item.status !== "done")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const today = new Date();
  const todayKey = new Date(today.getTime() - today.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const overdueTasks = myProgress.filter((item) => item.status !== "done" && item.dueDate && item.dueDate < todayKey);
  const overdueMilestones = myMilestones.filter((item) => item.status !== "done" && item.date < todayKey);
  const openReviews = myScriptReviews.filter((item) => !item.resolved);
  const overduePublishing = myDeliverables.filter((item) => item.status === "scheduled" && item.scheduledAt && new Date(item.scheduledAt).getTime() < today.getTime());
  const overBudget = (project.budget ?? 0) > 0 && totalCost > (project.budget ?? 0);
  const projectRisks: { key: string; title: string; detail: string; tab: ProjectTab }[] = [
    ...(project.blockedReason ? [{ key: "blocked", title: "制作流程被阻塞", detail: project.blockedReason, tab: "overview" as ProjectTab }] : []),
    ...(overdueTasks.length ? [{ key: "tasks", title: `${overdueTasks.length} 个任务已逾期`, detail: overdueTasks.slice(0, 2).map((item) => item.title).join("、"), tab: "schedule" as ProjectTab }] : []),
    ...(overdueMilestones.length ? [{ key: "milestones", title: `${overdueMilestones.length} 个里程碑已逾期`, detail: overdueMilestones.slice(0, 2).map((item) => item.title).join("、"), tab: "schedule" as ProjectTab }] : []),
    ...(openReviews.length ? [{ key: "reviews", title: `${openReviews.length} 条脚本意见待处理`, detail: "完成审阅后再锁定拍摄版本", tab: "script" as ProjectTab }] : []),
    ...(overBudget ? [{ key: "budget", title: "预计成本超过预算", detail: `已超出 ${formatMoney(totalCost - (project.budget ?? 0))}`, tab: "costs" as ProjectTab }] : []),
    ...(overduePublishing.length ? [{ key: "publishing", title: `${overduePublishing.length} 条内容超过计划发布时间`, detail: overduePublishing.slice(0, 2).map((item) => item.title).join("、"), tab: "publish" as ProjectTab }] : []),
  ];

  useEffect(() => {
    const nav = tabNavRef.current;
    const tab = activeTabRef.current;
    if (!nav || !tab) return;
    nav.scrollTo({ left: tab.offsetLeft - (nav.clientWidth - tab.offsetWidth) / 2, behavior: "smooth" });
  }, [activeTab]);

  function selectTab(tab: ProjectTab) {
    setActiveTab(tab);
    router.replace(
      tab === "overview" ? `/projects/${project.id}` : `/projects/${project.id}?tab=${tab}`,
      { scroll: false }
    );
  }

  function exportProjectBrief() {
    const performanceTotals = myPerformance.reduce((sum, item) => ({ views: sum.views + item.views, followers: sum.followers + item.followers, revenue: sum.revenue + item.revenue }), { views: 0, followers: 0, revenue: 0 });
    const lines = [
      `# ${project.name} · 项目简报`,
      "",
      project.description ?? "",
      "",
      "## 项目概况",
      `- 制作阶段：${projectStageLabel[project.stage ?? "idea"]}`,
      `- 阶段负责人：${project.stageOwner || "未指定"}`,
      `- 任务进度：${completedTasks} / ${myProgress.length}`,
      `- 脚本时长：${formatDuration(totalRuntime)}`,
      `- 预算 / 预计成本：${formatMoney(project.budget ?? 0)} / ${formatMoney(totalCost)}`,
      `- 项目风险：${projectRisks.length ? projectRisks.map((item) => item.title).join("；") : "当前无明确风险"}`,
      "",
      "## 当前任务",
      ...([...myProgress].filter((item) => item.status !== "done").sort((a, b) => String(a.dueDate ?? "9999").localeCompare(String(b.dueDate ?? "9999"))).map((item) => `- [${item.status === "doing" ? "进行中" : "待开始"}] ${item.title}｜${item.assignee || "未指定"}｜${item.dueDate || "未排期"}`)),
      ...(myProgress.every((item) => item.status === "done") ? ["- 暂无未完成任务"] : []),
      "",
      "## 关键排期",
      ...([...myMilestones].sort((a, b) => a.date.localeCompare(b.date)).map((item) => `- ${item.date}｜${item.title}｜${item.status === "done" ? "已完成" : item.status === "doing" ? "进行中" : "待开始"}${item.assignee ? `｜${item.assignee}` : ""}`)),
      ...(myMilestones.length === 0 ? ["- 暂无里程碑"] : []),
      "",
      "## 成本台账",
      ...([...myCosts].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? ""))).map((item) => `- ${item.title}｜${item.category}｜${formatMoney(item.amount)}｜${item.status === "paid" ? "已支付" : item.status === "approved" ? "已确认" : "计划中"}`)),
      ...(myCosts.length === 0 ? ["- 暂无成本记录"] : []),
      "",
      "## 发布与结果",
      ...myDeliverables.map((item) => `- ${item.title}｜${item.platform}｜${item.status === "published" ? "已发布" : item.status === "scheduled" ? "已排期" : "草稿"}`),
      ...(myDeliverables.length === 0 ? ["- 暂无发布版本"] : []),
      `- 累计播放：${performanceTotals.views.toLocaleString("zh-CN")}`,
      `- 累计涨粉：${performanceTotals.followers.toLocaleString("zh-CN")}`,
      `- 记录收入：${formatMoney(performanceTotals.revenue)}`,
      "",
      `生成时间：${new Date().toLocaleString("zh-CN")}`,
    ].filter((line, index, all) => line !== "" || all[index - 1] !== "");
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.name.replace(/[\\/:*?"<>|]/g, "-")}-项目简报-${todayKey}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    setBriefStatus("已导出");
    window.setTimeout(() => setBriefStatus("导出简报"), 1800);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await patchItem<Project>("projects", project.id, { name, description });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`确定删除「${project.name}」吗？项目会进入回收站，关联内容会保留。`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteItem("projects", project.id);
      router.push("/projects");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败，请重试。");
    } finally {
      setSaving(false);
    }
  }

  function resetQuickForm() {
    setQuickTitle("");
    setQuickUrl("");
    setQuickNote("");
    setQuickCategory("");
    setQuickAssignee("");
    setQuickPriority("normal");
    setQuickDueDate("");
    setQuickTags("");
  }

  async function handleQuickAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!quickTitle.trim()) return;
    setQuickSaving(true);
    setError(null);
    try {
      if (quickKind === "task") {
        await createItem<ProgressTask>("progress", {
          title: quickTitle,
          description: quickNote,
          assignee: quickAssignee,
          priority: quickPriority,
          dueDate: quickDueDate,
          projectId: project.id,
        });
      } else if (quickKind === "library") {
        await createItem<LibraryItem>("library", {
          title: quickTitle,
          url: quickUrl,
          category: quickCategory,
          note: quickNote,
          projectId: project.id,
        });
      } else {
        await createItem<InspirationItem>("inspiration", {
          title: quickTitle,
          type: quickUrl.trim() ? "link" : "note",
          url: quickUrl,
          note: quickNote,
          tags: quickTags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
          projectId: project.id,
        });
      }
      resetQuickForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试。");
    } finally {
      setQuickSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="mt-6"
    >
      {error && <p className="mb-4 text-xs text-red-500">{error}</p>}

      <header className="mb-5 flex flex-col gap-4 border-b border-line/70 pb-6 sm:flex-row sm:items-start sm:justify-between">
        {editing ? (
          <form onSubmit={handleSave} className="flex flex-1 flex-col gap-3">
            <input value={name} onChange={(event) => setName(event.target.value)} required className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-lg font-semibold focus:border-accent focus:outline-none" />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className="w-full resize-none rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" placeholder="项目简介" />
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="h-9 rounded-md bg-accent px-4 text-xs font-medium text-white disabled:opacity-50">{saving ? "保存中…" : "保存"}</button>
              <button type="button" onClick={() => { setName(project.name); setDescription(project.description ?? ""); setEditing(false); }} className="h-9 rounded-md border border-line px-4 text-xs text-ink-soft">取消</button>
            </div>
          </form>
        ) : (
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{project.name}</h1>
            {project.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">{project.description}</p>}
            {project.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {project.tags.map((tag) => <span key={tag} className="rounded bg-paper-soft px-2 py-0.5 text-[11px] text-ink-soft">{tag}</span>)}
              </div>
            )}
            <p className="mt-3 text-[11px] text-ink-soft">创建于 {formatDate(project.createdAt)} · {project.createdBy}</p>
          </div>
        )}
        {!editing && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={exportProjectBrief} className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-xs text-ink-soft hover:border-accent hover:text-accent"><Download className="h-3.5 w-3.5" aria-hidden="true" />{briefStatus}</button>
            <button type="button" onClick={() => setEditing(true)} className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-xs text-ink-soft hover:border-accent hover:text-accent"><Edit3 className="h-3.5 w-3.5" aria-hidden="true" />编辑</button>
            <button type="button" onClick={handleDelete} disabled={saving} title="删除项目" aria-label="删除项目" className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink-soft hover:border-red-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button>
          </div>
        )}
      </header>

      <nav ref={tabNavRef} className="mb-7 overflow-x-auto border-b border-line" aria-label="项目模块">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.value;
            return (
              <button
                ref={active ? activeTabRef : undefined}
                key={tab.value}
                type="button"
                onClick={() => selectTab(tab.value)}
                className={`relative flex h-11 items-center gap-2 px-3 text-xs font-medium transition-colors ${active ? "text-ink" : "text-ink-soft hover:text-ink"}`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-accent" : ""}`} aria-hidden="true" />
                {tab.label}
                {active && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-accent" />}
              </button>
            );
          })}
        </div>
      </nav>

      {activeTab === "overview" && (
        <div>
          <ProjectPipeline project={project} />
          <section className="mb-8 border-y border-line/70 py-5" aria-labelledby="risk-heading">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 id="risk-heading" className="text-sm font-semibold text-ink">项目风险</h2>
                <p className="mt-1 text-xs text-ink-soft">从任务、排期、审阅、预算和发布计划自动检查。</p>
              </div>
              <span className={`rounded px-2 py-1 text-[10px] font-medium ${projectRisks.length ? "bg-amber-500/10 text-amber-700" : "bg-emerald-500/10 text-emerald-700"}`}>{projectRisks.length ? `${projectRisks.length} 项待处理` : "状态正常"}</span>
            </div>
            {projectRisks.length ? (
              <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
                {projectRisks.map((risk) => (
                  <button key={risk.key} type="button" onClick={() => selectTab(risk.tab)} className="group flex min-w-0 items-start gap-3 border-t border-line/60 py-3 text-left first:border-t-0 md:[&:nth-child(2)]:border-t-0">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span className="min-w-0"><span className="block text-xs font-medium text-ink group-hover:text-accent">{risk.title}</span><span className="mt-1 block truncate text-[11px] text-ink-soft">{risk.detail}</span></span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 border-t border-line/60 pt-4 text-xs text-emerald-700"><ShieldCheck className="h-4 w-4" /><p>当前没有逾期、超支、待审或错过发布时间的问题。</p></div>
            )}
          </section>
          <div className="mb-8 grid grid-cols-2 border-y border-line/70 lg:grid-cols-4">
            <div className="py-5 pr-4">
              <p className="flex items-center gap-2 text-[11px] text-ink-soft"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />任务完成</p>
              <p className="mt-2 text-xl font-semibold text-ink">{completedTasks}<span className="text-sm font-normal text-ink-soft"> / {myProgress.length}</span></p>
            </div>
            <div className="border-l border-line/70 px-4 py-5">
              <p className="flex items-center gap-2 text-[11px] text-ink-soft"><Clock3 className="h-3.5 w-3.5 text-sky-500" />脚本时长</p>
              <p className="mt-2 text-xl font-semibold text-ink">{formatDuration(totalRuntime)}</p>
            </div>
            <div className="border-l-0 border-t border-line/70 py-5 pr-4 lg:border-l lg:border-t-0 lg:px-4">
              <p className="flex items-center gap-2 text-[11px] text-ink-soft"><WalletCards className="h-3.5 w-3.5 text-amber-500" />预计成本</p>
              <p className="mt-2 text-xl font-semibold text-ink">{formatMoney(totalCost)}</p>
            </div>
            <div className="border-l border-t border-line/70 px-4 py-5 lg:border-t-0">
              <p className="flex items-center gap-2 text-[11px] text-ink-soft"><CalendarDays className="h-3.5 w-3.5 text-accent" />下一节点</p>
              <p className="mt-2 truncate text-sm font-semibold text-ink">{nextMilestone?.title ?? "尚未排期"}</p>
              {nextMilestone && <p className="mt-1 text-[11px] text-ink-soft">{shortDate(nextMilestone.date)}</p>}
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
            <section>
              <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                <h2 className="text-sm font-semibold text-ink">当前制作</h2>
                <Link href="/progress" className="text-xs text-accent">打开任务看板</Link>
              </div>
              <div className="divide-y divide-line/70 border-y border-line/70">
                {[...myProgress]
                  .filter((task) => task.status !== "done")
                  .sort((a, b) => String(a.dueDate ?? "9999").localeCompare(String(b.dueDate ?? "9999")))
                  .slice(0, 6)
                  .map((task) => (
                    <Link key={task.id} href={`/progress/${task.id}`} className="flex items-center justify-between gap-4 py-4 hover:text-accent">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                        <p className="mt-1 text-xs text-ink-soft">{task.assignee} · {statusLabel[task.status]}</p>
                      </div>
                      <span className="shrink-0 text-xs text-ink-soft">{task.dueDate ? shortDate(task.dueDate) : "未排期"}</span>
                    </Link>
                  ))}
                {myProgress.filter((task) => task.status !== "done").length === 0 && <p className="py-10 text-center text-xs text-ink-soft">暂无进行中的任务。</p>}
              </div>
            </section>

            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Plus className="h-4 w-4" />快速添加</h2>
                <div className="flex rounded border border-line bg-paper-soft p-1">
                  {([["task", "任务"], ["library", "资料"], ["inspiration", "灵感"]] as [QuickKind, string][]).map(([value, label]) => (
                    <button key={value} type="button" onClick={() => { setQuickKind(value); resetQuickForm(); }} className={`rounded px-2.5 py-1 text-[11px] ${quickKind === value ? "bg-ink text-paper" : "text-ink-soft"}`}>{label}</button>
                  ))}
                </div>
              </div>
              <form onSubmit={handleQuickAdd} className="grid gap-3 sm:grid-cols-2">
                <input value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} required placeholder={quickKind === "task" ? "任务名称" : quickKind === "library" ? "资料标题" : "灵感标题"} className="rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none sm:col-span-2" />
                {quickKind === "task" && (
                  <>
                    <input value={quickAssignee} onChange={(event) => setQuickAssignee(event.target.value)} placeholder="负责人" className="rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" />
                    <select value={quickPriority} onChange={(event) => setQuickPriority(event.target.value as TaskPriority)} className="rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none"><option value="normal">普通优先级</option><option value="high">高优先级</option><option value="low">低优先级</option></select>
                    <input type="date" value={quickDueDate} onChange={(event) => setQuickDueDate(event.target.value)} className="rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none sm:col-span-2" />
                  </>
                )}
                {quickKind === "library" && (
                  <><input value={quickUrl} onChange={(event) => setQuickUrl(event.target.value)} required placeholder="https://" className="rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" /><input value={quickCategory} onChange={(event) => setQuickCategory(event.target.value)} placeholder="分类" className="rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" /></>
                )}
                {quickKind === "inspiration" && (
                  <><input value={quickUrl} onChange={(event) => setQuickUrl(event.target.value)} placeholder="链接，可选" className="rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" /><input value={quickTags} onChange={(event) => setQuickTags(event.target.value)} placeholder="标签，逗号分隔" className="rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" /></>
                )}
                <textarea value={quickNote} onChange={(event) => setQuickNote(event.target.value)} rows={2} placeholder="说明或备注，可选" className="resize-none rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none sm:col-span-2" />
                <div className="flex justify-end sm:col-span-2">
                  <button type="submit" disabled={quickSaving} className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-xs font-medium text-white disabled:opacity-50"><Plus className="h-3.5 w-3.5" />{quickSaving ? "保存中…" : "添加"}</button>
                </div>
              </form>
            </section>
          </div>
        </div>
      )}

      {activeTab === "script" && <><ProjectScriptBoard projectId={project.id} initialScenes={myScripts} /><ProjectScriptReview projectId={project.id} scenes={myScripts} initialVersions={myScriptVersions} initialReviews={myScriptReviews} /></>}
      {activeTab === "costs" && <ProjectCostLedger project={project} initialCosts={myCosts} />}
      {activeTab === "schedule" && <ProjectSchedule projectId={project.id} initialMilestones={myMilestones} tasks={myProgress} />}
      {activeTab === "assets" && <ProjectAssets projectId={project.id} initialAssets={myAssets} inspiration={myInspiration} library={myLibrary} />}
      {activeTab === "publish" && <ProjectPublishingBoard projectId={project.id} initialDeliverables={myDeliverables} assets={myAssets} />}
      {activeTab === "analytics" && <ProjectAnalytics projectId={project.id} initialRecords={myPerformance} deliverables={myDeliverables} costs={myCosts} />}
    </motion.div>
  );
}
