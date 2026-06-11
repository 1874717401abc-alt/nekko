import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import InspirationBoard from "@/components/InspirationBoard";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import type { InspirationItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InspirationPage() {
  const [items, currentUser] = await Promise.all([
    readData<InspirationItem[]>("inspiration"),
    getCurrentUser(),
  ]);

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Inspiration"
        title="灵感库"
        description="随手记录的链接、想法和参考素材，按标签分类，方便随时回顾。"
      />
      <InspirationBoard initialItems={items} currentUserName={currentUser.displayName} />
    </div>
  );
}
