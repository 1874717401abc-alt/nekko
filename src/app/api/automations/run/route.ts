import { randomUUID, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { recordActivity } from "@/lib/activity";
import { getCurrentUser } from "@/lib/auth";
import { nextAutomationRun } from "@/lib/automations";
import { runContentRadar } from "@/lib/contentRadar";
import { syncWorkspaceNotifications } from "@/lib/notifications";
import { insertDataItem, listDataItems, updateDataItem } from "@/lib/store";
import type { AutomationRule, InspirationItem, NotificationItem, User } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const systemUser: User = { id: "system-agent", username: "system-agent", displayName: "Nekko Agent", role: "自动化", bio: "", focus: [], avatarUrl: "", contact: "", createdAt: "", isAdmin: true, isOwner: false };

function validSecret(req: NextRequest) {
  const configured = process.env.RADAR_CRON_SECRET ?? "";
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!configured || configured.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(configured), Buffer.from(supplied));
}

function createAutomationNotification(rule: AutomationRule, message: string) {
  const item: NotificationItem = { id: `notification-${randomUUID()}`, key: `automation:${rule.id}:${new Date().toISOString().slice(0, 16)}`, type: "automation", title: `${rule.title} 已执行`, message, href: "/automations", createdAt: new Date().toISOString(), createdBy: "Nekko Agent", createdById: "system-agent" };
  insertDataItem("notifications", item);
}

async function executeRule(rule: AutomationRule, user: User) {
  let message = "执行完成。";
  if (rule.action === "content_radar") {
    const result = await runContentRadar(6);
    message = result.message;
  } else if (rule.action === "deadline_scan") {
    const created = syncWorkspaceNotifications(user);
    message = created.length > 0 ? `发现并生成 ${created.length} 条新提醒。` : "已扫描，没有新增提醒。";
  } else {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const recent = listDataItems<InspirationItem>("inspiration").filter((item) => +new Date(item.createdAt) >= since);
    const tags = Array.from(new Set(recent.flatMap((item) => item.tags))).slice(0, 5);
    message = recent.length > 0 ? `过去 24 小时新增 ${recent.length} 条灵感，主要标签：${tags.join("、") || "待归类"}。` : "过去 24 小时没有新增灵感。";
  }
  const now = new Date().toISOString();
  updateDataItem<AutomationRule>("automations", rule.id, (item) => ({ ...item, lastRunAt: now, nextRunAt: nextAutomationRun(item, new Date()) }));
  createAutomationNotification(rule, message);
  recordActivity({ type: "update", resource: "automations", resourceId: rule.id, title: rule.title, summary: `${user.displayName} 执行了自动化「${rule.title}」`, user });
  return message;
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser && !validSecret(req)) return NextResponse.json({ error: "无权限" }, { status: 401 });
  const body = await req.json().catch(() => ({})) as { id?: string };
  const all = listDataItems<AutomationRule>("automations");
  const now = new Date().toISOString();
  const rules = body.id ? all.filter((rule) => rule.id === body.id) : all.filter((rule) => rule.enabled && (!rule.nextRunAt || rule.nextRunAt <= now));
  if (body.id && rules.length === 0) return NextResponse.json({ error: "自动化不存在" }, { status: 404 });
  const results: { id: string; ok: boolean; message: string }[] = [];
  for (const rule of rules) {
    try { results.push({ id: rule.id, ok: true, message: await executeRule(rule, currentUser ?? systemUser) }); }
    catch (error) { results.push({ id: rule.id, ok: false, message: error instanceof Error ? error.message : "执行失败" }); }
  }
  return NextResponse.json({ ran: results.length, results });
}
