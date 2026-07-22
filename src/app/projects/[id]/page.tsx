import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ProjectDetail from "@/components/ProjectDetail";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import type {
  CostItem,
  Deliverable,
  InspirationItem,
  LibraryItem,
  Project,
  ProjectAsset,
  ProjectMilestone,
  ProgressTask,
  ScriptScene,
  ScriptReview,
  ScriptVersion,
  PerformanceRecord,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const initialTab = ["overview", "script", "costs", "schedule", "assets", "publish", "analytics"].includes(tab ?? "")
    ? (tab as "overview" | "script" | "costs" | "schedule" | "assets" | "publish" | "analytics")
    : "overview";
  const [projects, inspiration, library, progress, scripts, costs, milestones, scriptVersions, scriptReviews, assets, deliverables, performance, currentUser] = await Promise.all([
    readData<Project[]>("projects"),
    readData<InspirationItem[]>("inspiration"),
    readData<LibraryItem[]>("library"),
    readData<ProgressTask[]>("progress"),
    readData<ScriptScene[]>("scripts"),
    readData<CostItem[]>("costs"),
    readData<ProjectMilestone[]>("milestones"),
    readData<ScriptVersion[]>("scriptVersions"),
    readData<ScriptReview[]>("scriptReviews"),
    readData<ProjectAsset[]>("assets"),
    readData<Deliverable[]>("deliverables"),
    readData<PerformanceRecord[]>("performance"),
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
        key={`${id}-${initialTab}`}
        project={project}
        inspiration={inspiration}
        library={library}
        progress={progress}
        scripts={scripts}
        costs={costs}
        milestones={milestones}
        scriptVersions={scriptVersions}
        scriptReviews={scriptReviews}
        assets={assets}
        deliverables={deliverables}
        performance={performance}
        initialTab={initialTab}
      />
    </div>
  );
}
