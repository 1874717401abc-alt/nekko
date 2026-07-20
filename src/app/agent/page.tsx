import { redirect } from "next/navigation";
import AgentTaskCenter from "@/components/AgentTaskCenter";
import PageHeader from "@/components/PageHeader";
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
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Agent Runner"
        title="任务执行中心"
        description="让 Agent 先自主判断完整路径，能执行的立即执行，未接入的平台动作先沉淀成待接入步骤。"
      />
      <AgentTaskCenter initialRuns={runs} initialRun={initialRun} />
    </div>
  );
}
