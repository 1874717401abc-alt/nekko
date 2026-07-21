import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProjectsBoard from "@/components/ProjectsBoard";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import type { CostItem, InspirationItem, LibraryItem, Project, ProjectMilestone, ProgressTask, ScriptScene } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, inspiration, library, progress, scripts, costs, milestones, currentUser] = await Promise.all([
    readData<Project[]>("projects"),
    readData<InspirationItem[]>("inspiration"),
    readData<LibraryItem[]>("library"),
    readData<ProgressTask[]>("progress"),
    readData<ScriptScene[]>("scripts"),
    readData<CostItem[]>("costs"),
    readData<ProjectMilestone[]>("milestones"),
    getCurrentUser(),
  ]);

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1540px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-10 lg:px-10">
      <PageHeader
        eyebrow="Projects"
        title="项目"
        description="从脚本、成本和排期到任务与素材，把每条内容的完整制作过程收进项目。"
      />
      <ProjectsBoard
        initialProjects={projects}
        inspiration={inspiration}
        library={library}
        progress={progress}
        scripts={scripts}
        costs={costs}
        milestones={milestones}
      />
    </div>
  );
}
