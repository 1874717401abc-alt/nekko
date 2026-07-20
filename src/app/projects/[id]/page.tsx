import Link from "next/link";
import { redirect } from "next/navigation";
import ProjectDetail from "@/components/ProjectDetail";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import type { InspirationItem, LibraryItem, Project, ProgressTask } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const project = projects.find((p) => p.id === id);
  if (!project) {
    redirect("/projects");
  }

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-4xl mx-auto">
      <Link
        href="/projects"
        className="text-[11px] uppercase tracking-[0.2em] text-accent hover:underline"
      >
        ← 返回项目列表
      </Link>
      <ProjectDetail
        project={project}
        inspiration={inspiration}
        library={library}
        progress={progress}
      />
    </div>
  );
}
