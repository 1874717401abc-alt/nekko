import { redirect } from "next/navigation";
import AIAssistant from "@/components/AIAssistant";
import PageHeader from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import type { InspirationItem, LibraryItem, ProgressTask, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const [currentUser, projects, tasks, inspiration, library] = await Promise.all([
    getCurrentUser(),
    readData<Project[]>("projects"),
    readData<ProgressTask[]>("progress"),
    readData<InspirationItem[]>("inspiration"),
    readData<LibraryItem[]>("library"),
  ]);

  if (!currentUser) {
    redirect("/login");
  }

  const doing = tasks.filter((task) => task.status === "doing").length;
  const todo = tasks.filter((task) => task.status === "todo").length;
  const overdue = tasks.filter((task) => {
    if (!task.dueDate || task.status === "done") return false;
    return task.dueDate < new Date().toISOString().slice(0, 10);
  }).length;

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="AI Copilot"
        title="AI 助手"
        description="把工作台里的项目、任务、灵感和资料变成更快的创作判断。"
      />
      <AIAssistant
        snapshot={[
          { label: "项目", value: String(projects.length) },
          { label: "进行中", value: String(doing) },
          { label: "待开始", value: String(todo) },
          { label: "逾期", value: String(overdue) },
          { label: "灵感", value: String(inspiration.length) },
          { label: "资料", value: String(library.length) },
        ]}
      />
    </div>
  );
}
