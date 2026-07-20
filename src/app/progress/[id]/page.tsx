import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-3xl mx-auto">
      <Link
        href="/progress"
        className="text-[11px] uppercase tracking-[0.2em] text-accent hover:underline"
      >
        ← 返回进度看板
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
