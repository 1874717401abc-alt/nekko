import { redirect } from "next/navigation";
import GlobalSearch, { type SearchResult } from "@/components/GlobalSearch";
import PageHeader from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import type {
  CostItem,
  InspirationItem,
  LibraryItem,
  ProgressTask,
  Project,
  ProjectMilestone,
  ScriptScene,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function joinSearchText(parts: Array<string | string[] | undefined>) {
  return parts.flatMap((part) => (Array.isArray(part) ? part : [part])).filter(Boolean).join(" ");
}

export default async function SearchPage() {
  const [currentUser, projects, progress, inspiration, library, scripts, costs, milestones] = await Promise.all([
    getCurrentUser(),
    readData<Project[]>("projects"),
    readData<ProgressTask[]>("progress"),
    readData<InspirationItem[]>("inspiration"),
    readData<LibraryItem[]>("library"),
    readData<ScriptScene[]>("scripts"),
    readData<CostItem[]>("costs"),
    readData<ProjectMilestone[]>("milestones"),
  ]);

  if (!currentUser) {
    redirect("/login");
  }

  const results: SearchResult[] = [
    ...projects.map((project) => ({
      id: `project-${project.id}`,
      type: "project" as const,
      label: "项目",
      title: project.name,
      summary: project.description,
      href: `/projects/${project.id}`,
      createdAt: project.createdAt,
      haystack: joinSearchText([project.name, project.description, project.tags, project.createdBy]),
    })),
    ...progress.flatMap((task) => [
      {
        id: `task-${task.id}`,
        type: "task" as const,
        label: "任务",
        title: task.title,
        summary: task.description,
        href: `/progress/${task.id}`,
        createdAt: task.createdAt,
        haystack: joinSearchText([
          task.title,
          task.description,
          task.assignee,
          task.createdBy,
          task.status,
          task.priority,
          task.dueDate,
        ]),
      },
      ...(task.logs ?? []).map((log) => ({
        id: `log-${task.id}-${log.id}`,
        type: "log" as const,
        label: "进度",
        title: task.title,
        summary: log.content,
        href: `/progress/${task.id}`,
        createdAt: log.createdAt,
        haystack: joinSearchText([task.title, log.content, log.memberName]),
      })),
      ...(task.comments ?? []).map((comment) => ({
        id: `comment-${task.id}-${comment.id}`,
        type: "comment" as const,
        label: "评论",
        title: task.title,
        summary: comment.content,
        href: `/progress/${task.id}`,
        createdAt: comment.createdAt,
        haystack: joinSearchText([task.title, comment.content, comment.memberName]),
      })),
    ]),
    ...scripts.map((scene) => ({
      id: `script-${scene.id}`,
      type: "script" as const,
      label: "脚本",
      title: scene.title,
      summary: scene.script || scene.visual,
      href: `/projects/${scene.projectId}?tab=script`,
      createdAt: scene.createdAt,
      haystack: joinSearchText([scene.title, scene.script, scene.visual, scene.assignee, scene.type, scene.status]),
    })),
    ...costs.map((item) => ({
      id: `cost-${item.id}`,
      type: "cost" as const,
      label: "成本",
      title: item.title,
      summary: `${item.category} · ¥${item.amount}${item.vendor ? ` · ${item.vendor}` : ""}`,
      href: `/projects/${item.projectId}?tab=costs`,
      createdAt: item.createdAt,
      haystack: joinSearchText([item.title, item.category, item.vendor, item.note, item.status, String(item.amount)]),
    })),
    ...milestones.map((item) => ({
      id: `milestone-${item.id}`,
      type: "milestone" as const,
      label: "排期",
      title: item.title,
      summary: `${item.date}${item.assignee ? ` · ${item.assignee}` : ""}`,
      href: `/projects/${item.projectId}?tab=schedule`,
      createdAt: item.createdAt,
      haystack: joinSearchText([item.title, item.date, item.assignee, item.note, item.status]),
    })),
    ...inspiration.map((item) => ({
      id: `inspiration-${item.id}`,
      type: "inspiration" as const,
      label: "灵感",
      title: item.title,
      summary: item.note ?? item.url,
      href: "/inspiration",
      createdAt: item.createdAt,
      haystack: joinSearchText([item.title, item.note, item.url, item.tags, item.createdBy]),
    })),
    ...library.map((item) => ({
      id: `library-${item.id}`,
      type: "library" as const,
      label: "资料",
      title: item.title,
      summary: item.note ?? item.url,
      href: "/library",
      createdAt: item.addedAt,
      haystack: joinSearchText([item.title, item.note, item.url, item.category, item.createdBy]),
    })),
  ].sort((a, b) => +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0));

  return (
    <div className="mx-auto min-h-screen max-w-[1280px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-10 lg:px-10">
      <PageHeader
        eyebrow="Search"
        title="全局搜索"
        description="快速查找项目、脚本镜头、成本、排期、任务和素材。"
      />
      <GlobalSearch results={results} />
    </div>
  );
}
