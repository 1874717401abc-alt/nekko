"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search, Trash2 } from "lucide-react";
import { createItem, deleteItem } from "@/lib/clientData";
import type { CostItem, InspirationItem, LibraryItem, Project, ProjectMilestone, ProjectStage, ProjectTemplate, ProgressTask, ScriptScene } from "@/lib/types";

const easeOut = [0.22, 1, 0.36, 1] as const;
const stages: { value: ProjectStage; label: string }[] = [
  { value: "idea", label: "选题" }, { value: "research", label: "调研" },
  { value: "script", label: "脚本" }, { value: "shooting", label: "拍摄" },
  { value: "editing", label: "剪辑" }, { value: "review", label: "审核" },
  { value: "publishing", label: "发布" }, { value: "published", label: "已发布" },
  { value: "retrospective", label: "复盘" },
];

const templates: { value: ProjectTemplate; label: string; description: string; scenes: { title: string; type: ScriptScene["type"]; duration: number }[]; milestones: string[] }[] = [
  { value: "blank", label: "空白", description: "只创建项目", scenes: [], milestones: [] },
  { value: "talking", label: "口播", description: "钩子、正文、收尾", scenes: [{ title: "开场钩子", type: "hook", duration: 5 }, { title: "核心观点", type: "narration", duration: 45 }, { title: "行动引导", type: "outro", duration: 8 }], milestones: ["脚本定稿", "拍摄完成", "成片审核", "正式发布"] },
  { value: "interview", label: "访谈", description: "提纲、采访、补充画面", scenes: [{ title: "人物开场", type: "hook", duration: 8 }, { title: "核心访谈", type: "interview", duration: 120 }, { title: "环境与细节", type: "broll", duration: 30 }, { title: "人物收尾", type: "outro", duration: 12 }], milestones: ["采访提纲确认", "录制完成", "粗剪审核", "正式发布"] },
  { value: "store", label: "探店", description: "环境、体验、推荐", scenes: [{ title: "门店反差钩子", type: "hook", duration: 6 }, { title: "环境空镜", type: "broll", duration: 18 }, { title: "体验与讲解", type: "narration", duration: 50 }, { title: "价格与推荐", type: "outro", duration: 16 }], milestones: ["踩点完成", "现场拍摄", "商家审核", "发布上线"] },
  { value: "documentary", label: "纪录", description: "调研、故事线、长内容", scenes: [{ title: "故事引子", type: "hook", duration: 15 }, { title: "背景与人物", type: "narration", duration: 60 }, { title: "现场跟拍", type: "broll", duration: 120 }, { title: "深度访谈", type: "interview", duration: 180 }, { title: "结尾回响", type: "outro", duration: 25 }], milestones: ["资料调研", "故事线确认", "主体拍摄", "补拍完成", "成片审核", "正式发布"] },
];

function dayFromNow(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ProjectsBoard({
  initialProjects,
  inspiration,
  library,
  progress,
  scripts,
  costs,
  milestones,
}: {
  initialProjects: Project[];
  inspiration: InspirationItem[];
  library: LibraryItem[];
  progress: ProgressTask[];
  scripts: ScriptScene[];
  costs: CostItem[];
  milestones: ProjectMilestone[];
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [keyword, setKeyword] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stageFilter, setStageFilter] = useState<ProjectStage | "all">("all");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [budget, setBudget] = useState("");
  const [template, setTemplate] = useState<ProjectTemplate>("blank");

  function resetForm() {
    setName("");
    setDescription("");
    setTags("");
    setBudget("");
    setTemplate("blank");
    setShowForm(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const newProject = await createItem<Project>("projects", {
        name,
        description,
        tags: tags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
        budget: Number(budget) || 0,
        template,
        stage: "idea",
      });
      const selectedTemplate = templates.find((item) => item.value === template) ?? templates[0];
      await Promise.all([
        ...selectedTemplate.scenes.map((scene, index) => createItem<ScriptScene>("scripts", { projectId: newProject.id, ...scene, order: index, script: "", status: "draft" })),
        ...selectedTemplate.milestones.map((title, index) => createItem<ProjectMilestone>("milestones", { projectId: newProject.id, title, date: dayFromNow((index + 1) * 3), status: "planned" })),
        ...(template === "blank" ? [] : [createItem<ProgressTask>("progress", { projectId: newProject.id, title: "确认选题目标与受众", assignee: "未分配", priority: "high", dueDate: dayFromNow(1), status: "todo" })]),
      ]);
      setProjects((current) => [newProject, ...current]);
      router.refresh();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    if (!window.confirm(`确定删除「${project.name}」吗？项目会进入回收站，关联内容会保留。`)) return;

    setPendingId(id);
    setError(null);
    try {
      await deleteItem("projects", id);
      setProjects((current) => current.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败，请重试。");
    } finally {
      setPendingId(null);
    }
  }

  const filtered = projects.filter((p) => {
    if (stageFilter !== "all" && (p.stage ?? "idea") !== stageFilter) return false;
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      const haystack = [p.name, p.description ?? "", ...p.tags].join(" ").toLowerCase();
      if (!haystack.includes(kw)) return false;
    }
    const day = p.createdAt.slice(0, 10);
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
  });

  const sorted = [...filtered].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );

  function counts(projectId: string) {
    return {
      inspiration: inspiration.filter((i) => i.projectId === projectId).length,
      library: library.filter((i) => i.projectId === projectId).length,
      progress: progress.filter((t) => t.projectId === projectId).length,
      scripts: scripts.filter((item) => item.projectId === projectId).length,
      costs: costs.filter((item) => item.projectId === projectId).reduce((sum, item) => sum + item.amount, 0),
      milestones: milestones.filter((item) => item.projectId === projectId).length,
    };
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-3 border-b border-line pb-4">
        {error && <p className="w-full text-xs text-red-400">{error}</p>}
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索项目名称、简介或标签"
            className="h-10 w-full rounded-md border border-line bg-paper pl-9 pr-3 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs  text-ink-soft mb-1.5">
            起始日期
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs  text-ink-soft mb-1.5">
            结束日期
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-3 text-xs font-medium text-paper hover:bg-ink/85 transition-colors"
        >
          <Plus className={`h-4 w-4 ${showForm ? "rotate-45" : ""}`} />
          {showForm ? "取消" : "新建项目"}
        </button>
      </div>

      <div className="mb-6 overflow-x-auto border-b border-line/70 pb-3">
        <div className="flex min-w-max gap-1">
          <button type="button" onClick={() => setStageFilter("all")} className={`rounded-md px-3 py-1.5 text-xs ${stageFilter === "all" ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-soft hover:text-ink"}`}>全部 {projects.length}</button>
          {stages.map((stage) => {
            const count = projects.filter((project) => (project.stage ?? "idea") === stage.value).length;
            return <button key={stage.value} type="button" onClick={() => setStageFilter(stage.value)} className={`rounded-md px-3 py-1.5 text-xs ${stageFilter === stage.value ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-soft hover:text-ink"}`}>{stage.label} {count}</button>;
          })}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.form
            onSubmit={handleAdd}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: easeOut }}
            className="mb-6 grid grid-cols-1 gap-4 overflow-hidden rounded-lg border border-line bg-card p-5 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs text-ink-soft">项目模板</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {templates.map((item) => <button key={item.value} type="button" onClick={() => setTemplate(item.value)} className={`min-h-16 rounded-md border p-2.5 text-left ${template === item.value ? "border-accent bg-accent/5" : "border-line bg-paper"}`}><span className={`block text-xs font-medium ${template === item.value ? "text-accent" : "text-ink"}`}>{item.label}</span><span className="mt-1 block text-[10px] leading-4 text-ink-soft">{item.description}</span></button>)}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs  text-ink-soft mb-1.5">
                项目名称
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
                placeholder="例如：Ep.13『选题调研』"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs  text-ink-soft mb-1.5">
                项目简介
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
                placeholder="简单描述一下这个项目"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs  text-ink-soft mb-1.5">
                关键词（逗号分隔）
              </label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
                placeholder="拍摄, 选题"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-ink-soft mb-1.5">项目预算</label>
              <input
                type="number"
                min="0"
                step="100"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
                placeholder="0"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="text-sm px-5 py-2.5 rounded bg-accent text-paper hover:bg-accent/90 transition-colors"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <AnimatePresence initial={false}>
          {sorted.map((project) => {
            const c = counts(project.id);
            const stageIndex = stages.findIndex((item) => item.value === (project.stage ?? "idea"));
            const stage = stages[Math.max(0, stageIndex)];
            const progressPercent = ((Math.max(0, stageIndex) + 1) / stages.length) * 100;
            return (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: easeOut }}
                className="flex min-h-48 flex-col rounded-lg border border-line bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-base font-semibold leading-6 text-ink transition-colors hover:text-accent"
                  >
                    {project.name}
                  </Link>
                  <button
                    onClick={() => handleDelete(project.id)}
                    disabled={pendingId === project.id}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-red-400/10 hover:text-red-500 disabled:opacity-40"
                    aria-label={`删除 ${project.name}`}
                    title="删除项目"
                  >
                    {pendingId === project.id ? <span className="text-[10px]">...</span> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">{stage.label}</span>
                  <span className="truncate text-[10px] text-ink-soft">{project.stageOwner || "未指定负责人"}</span>
                </div>
                <div className="mb-3 h-1 overflow-hidden rounded-full bg-paper-soft"><div className="h-full bg-accent" style={{ width: `${progressPercent}%` }} /></div>
                {project.blockedReason && <p className="mb-3 line-clamp-2 border-l-2 border-amber-500 pl-2 text-[11px] leading-4 text-amber-700">{project.blockedReason}</p>}
                {project.description && (
                  <p className="text-sm text-ink-soft leading-relaxed line-clamp-3 mb-3">
                    {project.description}
                  </p>
                )}
                {project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded bg-paper-soft text-ink-soft"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-auto border-t border-line/70 pt-3 text-[11px] text-ink-soft">
                  <div className="flex items-center justify-between gap-2">
                    <span>镜头 {c.scripts} · 任务 {c.progress} · 节点 {c.milestones}</span>
                    <span className="shrink-0">{formatDate(project.createdAt)}</span>
                  </div>
                  <p className="mt-1">成本 ¥{c.costs.toLocaleString("zh-CN")} · 素材 {c.inspiration + c.library}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {sorted.length === 0 && (
          <p className="text-sm text-ink-soft">还没有项目，点击右上角新建一个吧。</p>
        )}
      </div>
    </div>
  );
}
