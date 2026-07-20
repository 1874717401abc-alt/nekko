import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ProgressTaskDetail from "@/components/ProgressTaskDetail";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import { listUsers } from "@/lib/users";
import type { ProgressTask } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProgressTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tasks, currentUser, users] = await Promise.all([
    readData<ProgressTask[]>("progress"),
    getCurrentUser(),
    listUsers(),
  ]);

  if (!currentUser) {
    redirect("/login");
  }

  const task = tasks.find((t) => t.id === id);
  if (!task) {
    notFound();
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1180px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-10 lg:px-10">
      <Link
        href="/progress"
        className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        返回进度看板
      </Link>
      <ProgressTaskDetail
        initialTask={task}
        members={users.map((u) => ({
          id: u.id,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
        }))}
      />
    </div>
  );
}
