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
    <div className="mx-auto min-h-screen max-w-[1540px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-10 lg:px-10">
      <PageHeader
        eyebrow="Progress"
        title="进度看板"
        description="待开始、进行中、已完成——清楚知道现在每个人在忙什么。"
      />
      <ProgressBoard initialTasks={tasks} projects={projects} members={members} />
    </div>
  );
}
