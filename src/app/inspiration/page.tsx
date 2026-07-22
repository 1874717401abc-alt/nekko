import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import InspirationBoard from "@/components/InspirationBoard";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import type { InspirationItem, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function InspirationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const [items, projects, currentUser] = await Promise.all([
    readData<InspirationItem[]>("inspiration"),
    readData<Project[]>("projects"),
    getCurrentUser(),
  ]);

  if (!currentUser) {
    redirect("/login");
  }

  const sharedTitle = first(params.title).trim().slice(0, 160);
  const sharedText = first(params.text).trim().slice(0, 2000);
  const explicitUrl = first(params.url).trim();
  const textUrl = sharedText.match(/https?:\/\/[^\s]+/i)?.[0] ?? "";
  const sharedUrl = (/^https?:\/\//i.test(explicitUrl) ? explicitUrl : textUrl).slice(0, 2000);
  const note = sharedText.replace(sharedUrl, "").trim();
  const hasSharedContent = Boolean(sharedTitle || sharedText || sharedUrl);
  const sharedDraft = hasSharedContent
    ? {
        title: sharedTitle || (note ? note.slice(0, 60) : "新的灵感"),
        url: sharedUrl,
        note: note === sharedTitle ? "" : note,
      }
    : first(params.new) === "1"
      ? { title: "", url: "", note: "" }
    : undefined;

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
        sharedDraft={sharedDraft}
      />
    </div>
  );
}
