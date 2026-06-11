import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProfileForm from "@/components/ProfileForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-2xl mx-auto">
      <PageHeader
        eyebrow="Profile"
        title="我的资料"
        description="编辑你的昵称、角色和专长标签，会展示在「团队」页面里。"
      />
      <ProfileForm user={user} />
    </div>
  );
}
