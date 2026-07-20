import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProgressBoard from "@/components/ProgressBoard";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import { listUsers } from "@/lib/users";
import type { Project, ProgressTask } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const [tasks, projects, currentUser, members] = await Promise.all([
    readData<ProgressTask[]>("progress"),
    readData<Project[]>("projects"),
    getCurrentUser(),
    Promise.resolve(listUsers()),
  ]);

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Progress"
        title="进度看板"
        description="待开始、进行中、已完成——清楚知道现在每个人在忙什么。"
      />
      <ProgressBoard initialTasks={tasks} projects={projects} members={members} />
    </div>
  );
}
