import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bell,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Lightbulb,
  ListTodo,
  Send,
  Users,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import HomeHero from "@/components/HomeHero";
import { readData } from "@/lib/store";
import { listUsers } from "@/lib/users";
import { getCurrentUser, isGuest } from "@/lib/auth";
import { mergeHeroContent } from "@/lib/heroContent";
import type {
  ActivityEvent,
  CheckIn,
  HeroContent,
  InspirationItem,
  LibraryItem,
  Deliverable,
  NotificationItem,
  ProgressTask,
  Project,
  ProjectMilestone,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const statusLabel: Record<ProgressTask["status"], string> = {
  todo: "待开始",
  doing: "进行中",
  done: "已完成",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatActivityTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDueDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}

export default async function Dashboard() {
  const [
    currentUser,
    guest,
    tasks,
    inspiration,
    library,
    members,
    checkins,
    heroImages,
    heroContentRaw,
    activity,
    projects,
    milestones,
    deliverables,
    notifications,
  ] = await Promise.all([
    getCurrentUser(),
    isGuest(),
    readData<ProgressTask[]>("progress"),
    readData<InspirationItem[]>("inspiration"),
    readData<LibraryItem[]>("library"),
    Promise.resolve(listUsers()),
    readData<CheckIn[]>("checkins"),
    readData<string[]>("hero"),
    readData<Partial<HeroContent>>("heroContent"),
    readData<ActivityEvent[]>("activity"),
    readData<Project[]>("projects"),
    readData<ProjectMilestone[]>("milestones"),
    readData<Deliverable[]>("deliverables"),
    readData<NotificationItem[]>("notifications"),
  ]);

  if (!currentUser && !guest) {
    redirect("/login");
  }

  const isGuestView = !currentUser;
  const heroContent = mergeHeroContent(heroContentRaw);

  const todo = tasks.filter((t) => t.status === "todo");
  const doing = tasks.filter((t) => t.status === "doing");
  const overdue = tasks.filter(
    (task) => task.status !== "done" && task.dueDate && task.dueDate < todayKey()
  );
  const checkedInToday = members.filter((member) =>
    checkins.some((entry) => entry.userId === member.id && entry.date === todayKey())
  ).length;
  const projectMap = new Map(projects.map((project) => [project.id, project.name]));
  const todayTasks = tasks.filter((task) => task.status !== "done" && task.dueDate && task.dueDate <= todayKey());
  const nearMilestones = milestones.filter((item) => item.status !== "done" && item.date >= todayKey()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const nextPublishes = deliverables.filter((item) => item.status === "scheduled" && item.scheduledAt && item.scheduledAt.slice(0, 10) >= todayKey()).sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt))).slice(0, 4);
  const unreadNotifications = notifications.filter((item) => !item.readAt && (!item.userId || item.userId === currentUser?.id));

  const recentInspiration = [...inspiration]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 3);

  const recentLibrary = [...library]
    .sort((a, b) => +new Date(b.addedAt) - +new Date(a.addedAt))
    .slice(0, 3);

  const upcomingTasks = [...tasks]
    .filter((task) => task.status !== "done" && task.dueDate)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
    .slice(0, 4);

  const recentActivity = [...activity]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);

  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const stats = [
    { label: "进行中", value: doing.length, detail: `${todo.length} 项待开始`, href: "/progress", icon: ListTodo },
    { label: "逾期任务", value: overdue.length, detail: overdue.length > 0 ? "需要优先处理" : "当前无逾期", href: "/progress", icon: CalendarClock },
    { label: "今日到岗", value: `${checkedInToday}/${members.length}`, detail: "团队打卡", href: "/checkin", icon: Users },
    { label: "灵感库", value: inspiration.length, detail: "可用创作线索", href: "/inspiration", icon: Lightbulb },
    { label: "未读通知", value: unreadNotifications.length, detail: "截止、预算与审核", href: "/notifications", icon: Bell },
  ];

  if (isGuestView) {
    return (
      <div className="mx-auto min-h-screen max-w-[1540px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-10 lg:px-10">
        <PageHeader
          eyebrow="Nekko Studio"
          title="Nekko 工作室"
          description="内容策划、制作与持续运营。"
        />
        <HomeHero heroImages={heroImages} heroContent={heroContent} />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1540px] px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-10 lg:px-10">
      <PageHeader
        eyebrow={today}
        title={`早上好，${currentUser.displayName}`}
        description="工作室今日任务、内容资产和团队状态总览。"
        action={
          <Link
            href="/agent"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white"
          >
            <Bot className="h-4 w-4" /> 打开 AI 工作台
          </Link>
        }
      />
      <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={`group bg-card p-4 transition-colors hover:bg-paper-soft sm:p-5 ${index === stats.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}
            >
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-ink-soft group-hover:text-accent" />
                <ArrowRight className="h-3.5 w-3.5 text-ink-soft opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="mt-4 text-2xl font-semibold text-ink">{stat.value}</p>
              <p className="mt-1 text-xs font-medium text-ink">{stat.label}</p>
              <p className="mt-1 text-[11px] text-ink-soft">{stat.detail}</p>
            </Link>
          );
        })}
      </section>

      <section className="mt-6 border-y border-line/70 py-5" aria-labelledby="today-focus-heading">
        <div className="mb-4 flex items-center justify-between"><h2 id="today-focus-heading" className="text-sm font-semibold text-ink">今日工作台</h2><Link href="/calendar" className="inline-flex items-center gap-1 text-xs text-accent">打开日历 <ArrowRight className="h-3.5 w-3.5" /></Link></div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div><p className="mb-2 flex items-center gap-2 text-[11px] text-ink-soft"><ListTodo className="h-3.5 w-3.5 text-red-500" />今日与逾期任务</p><div className="divide-y divide-line/70">{todayTasks.slice(0, 4).map((task) => <Link key={task.id} href={`/progress/${task.id}`} className="flex items-center justify-between gap-3 py-2.5"><span className="truncate text-xs font-medium text-ink">{task.title}</span><span className="shrink-0 text-[10px] text-ink-soft">{task.assignee}</span></Link>)}{todayTasks.length === 0 && <p className="py-4 text-xs text-ink-soft">今天没有到期任务。</p>}</div></div>
          <div><p className="mb-2 flex items-center gap-2 text-[11px] text-ink-soft"><CalendarClock className="h-3.5 w-3.5 text-amber-500" />近期项目节点</p><div className="divide-y divide-line/70">{nearMilestones.map((item) => <Link key={item.id} href={`/projects/${item.projectId}?tab=schedule`} className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0"><span className="block truncate text-xs font-medium text-ink">{item.title}</span><span className="mt-0.5 block truncate text-[10px] text-ink-soft">{projectMap.get(item.projectId)}</span></span><span className="shrink-0 text-[10px] text-ink-soft">{formatDueDate(item.date)}</span></Link>)}{nearMilestones.length === 0 && <p className="py-4 text-xs text-ink-soft">近期没有项目节点。</p>}</div></div>
          <div><p className="mb-2 flex items-center gap-2 text-[11px] text-ink-soft"><Send className="h-3.5 w-3.5 text-emerald-500" />待发布内容</p><div className="divide-y divide-line/70">{nextPublishes.map((item) => <Link key={item.id} href={`/projects/${item.projectId}?tab=publish`} className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0"><span className="block truncate text-xs font-medium text-ink">{item.title}</span><span className="mt-0.5 block truncate text-[10px] text-ink-soft">{projectMap.get(item.projectId)}</span></span><span className="shrink-0 text-[10px] text-ink-soft">{item.scheduledAt ? formatActivityTime(item.scheduledAt) : "待排期"}</span></Link>)}{nextPublishes.length === 0 && <p className="py-4 text-xs text-ink-soft">还没有待发布内容。</p>}</div></div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <section className="overflow-hidden rounded-lg border border-line bg-card">
          <div className="flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-ink">当前任务</h2>
            </div>
            <Link href="/progress" className="flex items-center gap-1 text-xs text-ink-soft hover:text-accent">
              全部任务 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-line">
            {[...overdue, ...doing.filter((task) => !overdue.some((item) => item.id === task.id)), ...todo]
              .slice(0, 7)
              .map((task) => (
                <Link key={task.id} href={`/progress/${task.id}`} className="grid gap-2 px-4 py-3.5 hover:bg-paper-soft sm:grid-cols-[minmax(0,1fr)_110px_90px] sm:items-center sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                    <p className="mt-1 truncate text-xs text-ink-soft">{task.description || "暂无任务说明"}</p>
                  </div>
                  <span className="text-xs text-ink-soft">{task.assignee}</span>
                  <span className={`text-xs sm:text-right ${task.dueDate && task.dueDate < todayKey() && task.status !== "done" ? "text-red-500" : "text-ink-soft"}`}>
                    {task.dueDate ? formatDueDate(task.dueDate) : statusLabel[task.status]}
                  </span>
                </Link>
              ))}
            {doing.length + todo.length === 0 && (
              <p className="px-5 py-12 text-center text-sm text-ink-soft">暂无未完成任务</p>
            )}
          </div>
        </section>

        <div className="grid gap-6">
          <section className="overflow-hidden rounded-lg border border-line bg-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold text-ink">近期截止</h2>
              </div>
              <span className="text-xs text-ink-soft">{upcomingTasks.length} 项</span>
            </div>
            <div className="divide-y divide-line">
              {upcomingTasks.map((task) => (
                <Link key={task.id} href={`/progress/${task.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper-soft">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                    <p className="mt-0.5 text-[11px] text-ink-soft">{task.assignee}</p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-soft">{formatDueDate(task.dueDate!)}</span>
                </Link>
              ))}
              {upcomingTasks.length === 0 && <p className="px-4 py-8 text-center text-xs text-ink-soft">暂无近期截止</p>}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-line bg-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold text-ink">今日到岗</h2>
              </div>
              <Link href="/checkin" className="text-xs text-ink-soft hover:text-accent">打卡</Link>
            </div>
            <div className="divide-y divide-line">
              {members.slice(0, 6).map((member) => {
                const entry = checkins.find((item) => item.userId === member.id && item.date === todayKey());
                return (
                  <div key={member.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-ink">{member.displayName}</span>
                    <span className={entry ? "text-emerald-500" : "text-ink-soft"}>{entry ? formatTime(entry.time) : "未打卡"}</span>
                  </div>
                );
              })}
              {members.length > 6 && (
                <Link
                  href="/team"
                  className="flex items-center justify-between px-4 py-3 text-xs text-ink-soft hover:text-accent"
                >
                  查看全部 {members.length} 位成员
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {[
          {
            title: "最新灵感",
            href: "/inspiration",
            items: recentInspiration.map((item) => ({ id: item.id, title: item.title, meta: formatDate(item.createdAt) })),
          },
          {
            title: "最近资料",
            href: "/library",
            items: recentLibrary.map((item) => ({ id: item.id, title: item.title, meta: item.category || item.type })),
          },
          {
            title: "团队动态",
            href: "/team",
            items: recentActivity.map((item) => ({ id: item.id, title: item.summary, meta: formatActivityTime(item.createdAt) })),
          },
        ].map((section) => (
          <section key={section.title} className="overflow-hidden rounded-lg border border-line bg-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <h2 className="text-sm font-semibold text-ink">{section.title}</h2>
              <Link href={section.href} className="text-ink-soft hover:text-accent" aria-label={`查看${section.title}`}>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="divide-y divide-line">
              {section.items.slice(0, 4).map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <p className="line-clamp-1 text-sm text-ink">{item.title}</p>
                  <p className="mt-1 text-[11px] text-ink-soft">{item.meta}</p>
                </div>
              ))}
              {section.items.length === 0 && <p className="px-4 py-8 text-center text-xs text-ink-soft">暂无内容</p>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
