import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import HomeHero from "@/components/HomeHero";
import { FadeIn, HoverCard, StaggerContainer, StaggerItem } from "@/components/motion";
import { readData } from "@/lib/store";
import type { CheckIn, InspirationItem, LibraryItem, ProgressTask, TeamMember } from "@/lib/types";

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

export default async function Dashboard() {
  const [tasks, inspiration, library, members, checkins] = await Promise.all([
    readData<ProgressTask[]>("progress"),
    readData<InspirationItem[]>("inspiration"),
    readData<LibraryItem[]>("library"),
    readData<TeamMember[]>("team"),
    readData<CheckIn[]>("checkins"),
  ]);

  const todo = tasks.filter((t) => t.status === "todo");
  const doing = tasks.filter((t) => t.status === "doing");
  const done = tasks.filter((t) => t.status === "done");

  const recentInspiration = [...inspiration]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 3);

  const recentLibrary = [...library]
    .sort((a, b) => +new Date(b.addedAt) - +new Date(a.addedAt))
    .slice(0, 3);

  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const stats = [
    { label: "进行中", value: doing.length, href: "/progress" },
    { label: "待开始", value: todo.length, href: "/progress" },
    { label: "已完成", value: done.length, href: "/progress" },
    { label: "灵感收藏", value: inspiration.length, href: "/inspiration" },
    { label: "资料文件", value: library.length, href: "/library" },
  ];

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-14 sm:py-20 max-w-6xl mx-auto">
      <PageHeader
        eyebrow={today}
        title="Nekko 工作室"
        description="记录灵感、整理素材、跟进进度——一个只属于我们两个人的小工作室。"
      />

      <FadeIn delay={0.05} className="mb-20">
        <HomeHero />
      </FadeIn>

      {/* Slim summary bar: stats + check-in */}
      <FadeIn delay={0.15} className="mb-20">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {stats.map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className="group flex items-baseline gap-2"
              >
                <span className="font-serif-display text-2xl text-ink transition-colors group-hover:text-accent">
                  {stat.value}
                </span>
                <span className="text-[11px] uppercase tracking-[0.2em] text-ink-soft">
                  {stat.label}
                </span>
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {members.map((member) => {
              const entry = checkins.find(
                (c) => c.member === member.name && c.date === todayKey()
              );
              return (
                <span
                  key={member.id}
                  className={`text-xs px-3 py-1.5 rounded-full ${
                    entry ? "bg-accent/10 text-accent" : "bg-paper-soft text-ink-soft"
                  }`}
                >
                  {member.name} {entry ? `· ${formatTime(entry.time)}` : "· 未打卡"}
                </span>
              );
            })}
            <Link
              href="/checkin"
              className="text-[11px] uppercase tracking-[0.2em] text-accent ml-1"
            >
              去打卡 →
            </Link>
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-16">
        {/* Tasks in progress */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif-display text-2xl text-ink">正在进行</h2>
            <Link href="/progress" className="text-xs uppercase tracking-[0.2em] text-accent">
              查看看板 →
            </Link>
          </div>
          <StaggerContainer className="flex flex-col gap-4">
            {[...doing, ...todo].slice(0, 5).map((task) => (
              <StaggerItem key={task.id}>
                <HoverCard className="px-1 py-3 flex items-start justify-between gap-4 border-b border-line/70">
                  <div>
                    <p className="text-sm font-medium text-ink">{task.title}</p>
                    {task.description && (
                      <p className="mt-1 text-xs text-ink-soft leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-full ${
                        task.status === "doing"
                          ? "bg-accent/10 text-accent"
                          : "bg-paper-soft text-ink-soft"
                      }`}
                    >
                      {statusLabel[task.status]}
                    </span>
                    <span className="text-[11px] text-ink-soft">{task.assignee}</span>
                  </div>
                </HoverCard>
              </StaggerItem>
            ))}
            {doing.length + todo.length === 0 && (
              <p className="text-sm text-ink-soft">暂无待办任务，去看板里加一个吧。</p>
            )}
          </StaggerContainer>
        </section>

        {/* Recent inspiration + library */}
        <div className="flex flex-col gap-16">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif-display text-2xl text-ink">最新灵感</h2>
              <Link href="/inspiration" className="text-xs uppercase tracking-[0.2em] text-accent">
                进入灵感库 →
              </Link>
            </div>
            <StaggerContainer className="flex flex-col gap-4">
              {recentInspiration.map((item) => (
                <StaggerItem key={item.id}>
                  <HoverCard className="px-1 py-3 border-b border-line/70">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-ink">{item.title}</p>
                      <span className="text-[11px] text-ink-soft shrink-0">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    {item.note && (
                      <p className="mt-1 text-xs text-ink-soft leading-relaxed line-clamp-2">
                        {item.note}
                      </p>
                    )}
                  </HoverCard>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif-display text-2xl text-ink">最近资料</h2>
              <Link href="/library" className="text-xs uppercase tracking-[0.2em] text-accent">
                进入资料库 →
              </Link>
            </div>
            <StaggerContainer className="flex flex-col gap-4">
              {recentLibrary.map((item) => (
                <StaggerItem key={item.id}>
                  <HoverCard>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-3 px-1 py-3 border-b border-line/70 transition-colors hover:text-accent"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">{item.title}</p>
                        <p className="mt-1 text-xs text-ink-soft">{item.category}</p>
                      </div>
                      <span className="text-[11px] uppercase tracking-[0.2em] text-ink-soft shrink-0">
                        {item.type === "video" ? "视频" : "文档"}
                      </span>
                    </a>
                  </HoverCard>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        </div>
      </div>
    </div>
  );
}
