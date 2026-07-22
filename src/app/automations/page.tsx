import { redirect } from "next/navigation";
import AutomationCenter from "@/components/AutomationCenter";
import PageHeader from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import type { AutomationRule } from "@/lib/types";

export const dynamic = "force-dynamic";
export default async function AutomationsPage() { const user = await getCurrentUser(); if (!user) redirect("/login"); const rules = (await readData<AutomationRule[]>("automations")).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)); return <div className="mx-auto min-h-screen max-w-[1180px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-10 lg:px-10"><PageHeader eyebrow="Agent scheduler" title="自动化中心" description="把内容雷达、灵感摘要和项目提醒交给 Agent 定时执行。" /><AutomationCenter initialRules={rules} /></div>; }
