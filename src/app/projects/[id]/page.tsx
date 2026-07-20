import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
    <div className="mx-auto min-h-screen max-w-[1280px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-10 lg:px-10">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        返回项目列表
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
