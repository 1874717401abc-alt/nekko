import { redirect } from "next/navigation";
import AIAssistant from "@/components/AIAssistant";
import { getAgentTaskRunDetail, listAgentTaskRuns } from "@/lib/agentTasks";
import { getAgentStatus } from "@/lib/aiAgent";
import { getCurrentUser } from "@/lib/auth";
import { listAiConversations, listAiMessages } from "@/lib/aiConversations";
import { readData } from "@/lib/store";
import type { InspirationItem, LibraryItem, ProgressTask, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const [projects, tasks, inspiration, library, agentStatus] = await Promise.all([
    readData<Project[]>("projects"),
    readData<ProgressTask[]>("progress"),
    readData<InspirationItem[]>("inspiration"),
    readData<LibraryItem[]>("library"),
    getAgentStatus(),
  ]);
  const conversations = listAiConversations(currentUser.id);
  const initialConversation = conversations[0] ?? null;
  const initialMessages = initialConversation
    ? listAiMessages(initialConversation.id, currentUser.id)
    : [];
  const runs = listAgentTaskRuns(currentUser.id);
  const initialRun = runs[0] ? getAgentTaskRunDetail(runs[0].id, currentUser.id) : null;
  const doing = tasks.filter((task) => task.status === "doing").length;
  const overdue = tasks.filter(
    (task) => task.dueDate && task.status !== "done" && task.dueDate < new Date().toISOString().slice(0, 10)
  ).length;

  return (
    <div className="mx-auto min-h-screen max-w-[1680px] px-3 pb-24 pt-5 sm:px-5 sm:pt-7 md:pb-8 lg:px-7">
      <header className="mb-4 flex items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <p className="mb-1 text-xs text-ink-soft">Nekko Agent</p>
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">AI 工作台</h1>
        </div>
        <div className="hidden items-center gap-2 text-xs text-ink-soft sm:flex">
          <span className={`h-2 w-2 rounded-full ${agentStatus.healthy ? "bg-emerald-500" : "bg-amber-500"}`} />
          {agentStatus.healthy ? "Agent 在线" : "Agent 降级运行"}
        </div>
      </header>
      <AIAssistant
        initialConversations={conversations}
        initialConversation={initialConversation}
        initialMessages={initialMessages}
        initialRuns={runs}
        initialRun={initialRun}
        agentStatus={agentStatus}
        snapshot={[
          { label: "项目", value: String(projects.length) },
          { label: "进行中", value: String(doing) },
          { label: "逾期", value: String(overdue) },
          { label: "灵感", value: String(inspiration.length) },
          { label: "资料", value: String(library.length) },
          { label: "执行", value: String(runs.length) },
        ]}
      />
    </div>
  );
}
