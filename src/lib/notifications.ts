import { randomUUID } from "crypto";
import { insertDataItem, listDataItems } from "@/lib/store";
import type { CostItem, Deliverable, NotificationItem, ProgressTask, Project, ProjectMilestone, ScriptReview, User } from "@/lib/types";

type NotificationDraft = Pick<NotificationItem, "key" | "projectId" | "type" | "title" | "message" | "href">;

function dateKey(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function syncWorkspaceNotifications(user?: Pick<User, "id" | "displayName">) {
  const [projects, tasks, milestones, deliverables, costs, reviews, existing] = [
    listDataItems<Project>("projects"),
    listDataItems<ProgressTask>("progress"),
    listDataItems<ProjectMilestone>("milestones"),
    listDataItems<Deliverable>("deliverables"),
    listDataItems<CostItem>("costs"),
    listDataItems<ScriptReview>("scriptReviews"),
    listDataItems<NotificationItem>("notifications"),
  ];
  const projectMap = new Map(projects.map((item) => [item.id, item]));
  const drafts: NotificationDraft[] = [];

  for (const task of tasks.filter((item) => item.status !== "done" && item.dueDate && item.dueDate <= dateKey(1))) {
    const overdue = String(task.dueDate) < dateKey();
    drafts.push({ key: `task:${task.id}:${task.dueDate}`, projectId: task.projectId, type: "deadline", title: overdue ? "任务已逾期" : "任务即将到期", message: `${task.title} · ${task.assignee} · ${task.dueDate}`, href: `/progress/${task.id}` });
  }
  for (const item of milestones.filter((entry) => entry.status !== "done" && entry.date <= dateKey(2))) {
    drafts.push({ key: `milestone:${item.id}:${item.date}`, projectId: item.projectId, type: "deadline", title: "项目节点临近", message: `${projectMap.get(item.projectId)?.name ?? "项目"} · ${item.title} · ${item.date}`, href: `/projects/${item.projectId}?tab=schedule` });
  }
  for (const item of deliverables.filter((entry) => entry.status === "scheduled" && String(entry.scheduledAt ?? "9999").slice(0, 10) <= dateKey(1))) {
    drafts.push({ key: `publish:${item.id}:${item.scheduledAt}`, projectId: item.projectId, type: "publish", title: "内容等待发布", message: `${projectMap.get(item.projectId)?.name ?? "项目"} · ${item.title}`, href: `/projects/${item.projectId}?tab=publish` });
  }
  for (const project of projects) {
    const total = costs.filter((item) => item.projectId === project.id).reduce((sum, item) => sum + item.amount, 0);
    if ((project.budget ?? 0) > 0 && total > (project.budget ?? 0)) {
      drafts.push({ key: `budget:${project.id}:${Math.round(total)}`, projectId: project.id, type: "budget", title: "项目预算超支", message: `${project.name} 已超预算 ¥${Math.round(total - (project.budget ?? 0)).toLocaleString("zh-CN")}`, href: `/projects/${project.id}?tab=costs` });
    }
    const openReviews = reviews.filter((item) => item.projectId === project.id && !item.resolved).length;
    if (openReviews > 0) drafts.push({ key: `review:${project.id}:${openReviews}`, projectId: project.id, type: "review", title: "脚本有待处理意见", message: `${project.name} 还有 ${openReviews} 条审阅意见`, href: `/projects/${project.id}?tab=script` });
  }

  const existingKeys = new Set(existing.map((item) => item.key).filter(Boolean));
  const created: NotificationItem[] = [];
  for (const draft of drafts) {
    if (draft.key && existingKeys.has(draft.key)) continue;
    const item: NotificationItem = { id: `notification-${randomUUID()}`, ...draft, createdAt: new Date().toISOString(), createdBy: user?.displayName ?? "Nekko Agent", createdById: user?.id ?? "system-agent" };
    insertDataItem("notifications", item);
    created.push(item);
  }
  return created;
}
