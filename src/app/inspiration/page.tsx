import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import InspirationBoard from "@/components/InspirationBoard";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import type { InspirationItem, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InspirationPage() {
  const [items, projects, currentUser] = await Promise.all([
    readData<InspirationItem[]>("inspiration"),
    readData<Project[]>("projects"),
    getCurrentUser(),
  ]);

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1540px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-10 lg:px-10">
      <PageHeader
        eyebrow="Inspiration"
        title="灵感库"
        description="随手记录的链接、想法和参考素材，按标签分类，方便随时回顾。"
      />
      <InspirationBoard
        initialItems={items}
        projects={projects}
        canRunRadar={currentUser.isAdmin}
      />
    </div>
  );
}
