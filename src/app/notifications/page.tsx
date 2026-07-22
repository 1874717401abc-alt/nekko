import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import NotificationCenter from "@/components/NotificationCenter";
import { getCurrentUser } from "@/lib/auth";
import { syncWorkspaceNotifications } from "@/lib/notifications";
import { readData } from "@/lib/store";
import type { NotificationItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  syncWorkspaceNotifications(user);
  const items = (await readData<NotificationItem[]>("notifications")).filter((item) => !item.userId || item.userId === user.id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return <div className="mx-auto min-h-screen max-w-[1180px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-10 lg:px-10"><PageHeader eyebrow="Workspace alerts" title="通知中心" description="截止、预算、审核、发布与自动化结果集中处理。" /><NotificationCenter initialItems={items} /></div>;
}
