import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import AdminPanel from "@/components/AdminPanel";
import { getCurrentUser } from "@/lib/auth";
import { listUsers } from "@/lib/users";
import { listTrashItems, readData } from "@/lib/store";
import { mergeHeroContent } from "@/lib/heroContent";
import type { HeroContent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!user.isAdmin) {
    redirect("/");
  }

  const [users, heroImages, heroContentRaw, trashItems] = await Promise.all([
    Promise.resolve(listUsers()),
    readData<string[]>("hero"),
    readData<Partial<HeroContent>>("heroContent"),
    Promise.resolve(listTrashItems()),
  ]);
  const heroContent = mergeHeroContent(heroContentRaw);

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-4xl mx-auto">
      <PageHeader
        eyebrow="Console"
        title="管理控制台"
        description="管理网站成员权限，更换首页轮播图。"
      />
      <AdminPanel
        currentUser={user}
        users={users}
        heroImages={heroImages}
        heroContent={heroContent}
        trashItems={trashItems}
      />
    </div>
  );
}
