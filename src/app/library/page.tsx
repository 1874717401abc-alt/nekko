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
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Library"
        title="资料库"
        description="视频成片、文档、素材的链接合集，按类别整理，随取随用。"
      />
      <LibraryList initialItems={items} projects={projects} />
    </div>
  );
}
