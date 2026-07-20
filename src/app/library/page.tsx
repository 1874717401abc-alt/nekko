import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import LibraryList from "@/components/LibraryList";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import type { LibraryItem, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const [items, projects, currentUser] = await Promise.all([
    readData<LibraryItem[]>("library"),
    readData<Project[]>("projects"),
    getCurrentUser(),
  ]);

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1540px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-10 lg:px-10">
      <PageHeader
        eyebrow="Library"
        title="资料库"
        description="视频成片、文档、素材的链接合集，按类别整理，随取随用。"
      />
      <LibraryList initialItems={items} projects={projects} />
    </div>
  );
}
