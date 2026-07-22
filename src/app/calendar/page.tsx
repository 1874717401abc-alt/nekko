import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import StudioCalendar from "@/components/StudioCalendar";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import type { Deliverable, ProgressTask, Project, ProjectMilestone } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [projects, tasks, milestones, deliverables] = await Promise.all([readData<Project[]>("projects"), readData<ProgressTask[]>("progress"), readData<ProjectMilestone[]>("milestones"), readData<Deliverable[]>("deliverables")]);
  return <div className="mx-auto min-h-screen max-w-[1380px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-10 lg:px-10"><PageHeader eyebrow="Studio schedule" title="工作室日历" description="任务截止、项目节点和平台发布时间统一查看。" /><StudioCalendar projects={projects} tasks={tasks} milestones={milestones} deliverables={deliverables} /></div>;
}
