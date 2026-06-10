import PageHeader from "@/components/PageHeader";
import ProgressBoard from "@/components/ProgressBoard";
import { readData } from "@/lib/store";
import type { ProgressTask } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const tasks = await readData<ProgressTask[]>("progress");

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Progress"
        title="进度看板"
        description="待开始、进行中、已完成——清楚知道现在每个人在忙什么。"
      />
      <ProgressBoard initialTasks={tasks} />
    </div>
  );
}
