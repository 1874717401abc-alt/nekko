import { redirect } from "next/navigation";
import AgentTaskCenter from "@/components/AgentTaskCenter";
import { getAgentTaskRunDetail, listAgentTaskRuns } from "@/lib/agentTasks";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const runs = listAgentTaskRuns(currentUser.id);
  const initialRun = runs[0] ? getAgentTaskRunDetail(runs[0].id, currentUser.id) : null;

  return (
    <div className="mx-auto min-h-screen max-w-[1540px] px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pb-10">
      <header className="mb-5 flex items-end justify-between border-b border-line pb-5 sm:mb-6">
        <div>
          <p className="mb-1 text-xs text-ink-soft">Agent Workspace</p>
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">执行中心</h1>
        </div>
        <div className="hidden items-center gap-2 text-xs text-ink-soft sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          自主执行中
          <span className="text-line">/</span>
          {runs.length} 条任务
        </div>
      </header>
      <AgentTaskCenter initialRuns={runs} initialRun={initialRun} />
    </div>
  );
}
