import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProjectsBoard from "@/components/ProjectsBoard";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import type { InspirationItem, LibraryItem, Project, ProgressTask } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, inspiration, library, progress, currentUser] = await Promise.all([
    readData<Project[]>("projects"),
    readData<InspirationItem[]>("inspiration"),
    readData<LibraryItem[]>("library"),
    readData<ProgressTask[]>("progress"),
    getCurrentUser(),
  ]);

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Projects"
        title="项目"
        description="把灵感、资料和任务归类到具体的项目里，按关键词或时间快速找到想要的内容。"
      />
      <ProjectsBoard
        initialProjects={projects}
        inspiration={inspiration}
        library={library}
        progress={progress}
        currentUserName={currentUser.displayName}
      />
    </div>
  );
}
