"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  FolderOpen,
  HeartHandshake,
  Home,
  LayoutDashboard,
  Lightbulb,
  LogIn,
  Menu,
  Workflow,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import type { User } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "工作台",
    items: [
      { href: "/", label: "主页", icon: Home },
      { href: "/agent", label: "AI 工作台", icon: Bot },
      { href: "/automations", label: "自动化", icon: Workflow },
      { href: "/calendar", label: "日历", icon: CalendarDays },
      { href: "/notifications", label: "通知", icon: Bell },
    ],
  },
  {
    label: "创作",
    items: [
      { href: "/inspiration", label: "灵感库", icon: Lightbulb },
      { href: "/library", label: "资料库", icon: FolderOpen },
      { href: "/progress", label: "进度看板", icon: LayoutDashboard },
      { href: "/projects", label: "项目", icon: Clapperboard },
    ],
  },
  {
    label: "协作",
    items: [
      { href: "/search", label: "搜索", icon: Search },
      { href: "/checkin", label: "打卡", icon: CheckCircle2 },
      { href: "/team", label: "团队", icon: Users },
      { href: "/profile", label: "我的资料", icon: UserRound },
    ],
  },
];

const adminNavItem: NavItem = { href: "/admin", label: "管理", icon: ShieldCheck };
const mobilePrimaryHrefs = ["/", "/agent", "/inspiration", "/progress"];

type MeState = { user: User | null; guest: boolean };

function isActive(pathname: string | null, href: string) {
  return href === "/" ? pathname === "/" : pathname?.startsWith(href);
}

export default function Sidebar() {
  const pathname = usePathname();
  const [me, setMe] = useState<MeState | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null, guest: false }))
      .then((data) => setMe(data))
      .catch(() => setMe({ user: null, guest: false }));
  }, []);

  if (pathname?.startsWith("/login") || pathname?.startsWith("/register")) {
    return null;
  }

  const isGuestView = me?.guest === true && !me?.user;
  const baseItems = navGroups.flatMap((group) => group.items);
  const visibleItems = isGuestView
    ? baseItems.filter((item) => item.href === "/")
    : me?.user?.isAdmin
      ? [...baseItems, adminNavItem]
      : baseItems;
  const primaryItems = visibleItems.filter((item) => mobilePrimaryHrefs.includes(item.href));
  const moreItems = visibleItems.filter((item) => !mobilePrimaryHrefs.includes(item.href));
  const activeItem = visibleItems.find((item) => isActive(pathname, item.href));

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-paper-soft md:flex">
        <div className="flex h-20 items-center justify-between border-b border-line px-5">
          <Link href="/" className="flex items-baseline gap-2" aria-label="Nekko 主页">
            <span className="font-serif-display text-2xl italic text-ink">Nekko</span>
            <span className="text-[10px] text-ink-soft">STUDIO</span>
          </Link>
          <ThemeToggle className="h-8 w-8" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="主导航">
          {(isGuestView ? [{ label: "", items: visibleItems }] : navGroups).map((group) => {
            const groupItems = group.items.filter((item) => visibleItems.some((entry) => entry.href === item.href));
            if (groupItems.length === 0) return null;
            return (
              <div key={group.label || "guest"} className="mb-6 last:mb-0">
                {group.label && (
                  <p className="mb-2 px-3 text-[10px] font-medium text-ink-soft/65">{group.label}</p>
                )}
                <div className="space-y-1">
                  {groupItems.map((item) => {
                    const active = isActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                          active
                            ? "bg-card font-medium text-ink shadow-[inset_2px_0_0_var(--color-accent)]"
                            : "text-ink-soft hover:bg-card/60 hover:text-ink"
                        }`}
                      >
                        <Icon className={`h-[18px] w-[18px] ${active ? "text-accent" : "group-hover:text-ink"}`} strokeWidth={1.7} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {!isGuestView && me?.user?.isAdmin && (
            <div className="mt-6 border-t border-line pt-4">
              <Link
                href={adminNavItem.href}
                className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                  isActive(pathname, adminNavItem.href)
                    ? "bg-card font-medium text-ink shadow-[inset_2px_0_0_var(--color-accent)]"
                    : "text-ink-soft hover:bg-card/60 hover:text-ink"
                }`}
              >
                <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.7} />
                管理
              </Link>
            </div>
          )}

          {isGuestView && (
            <div className="mt-4 space-y-1 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setJoinOpen(true)}
                className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-ink-soft hover:bg-card/60 hover:text-ink"
              >
                <HeartHandshake className="h-[18px] w-[18px]" strokeWidth={1.7} />
                加入我们
              </button>
              <Link href="/login" className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-ink-soft hover:bg-card/60 hover:text-ink">
                <LogIn className="h-[18px] w-[18px]" strokeWidth={1.7} />
                登录 / 注册
              </Link>
            </div>
          )}
        </nav>

        {!isGuestView && (
          <div className="border-t border-line p-4">
            <div className="flex items-center gap-3 rounded-md px-2 py-1.5">
              <UserMenu className="h-9 w-9" me={me} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{me?.user?.displayName || "Nekko"}</p>
                <p className="truncate text-xs text-ink-soft">{me?.user?.role || "Studio member"}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-line bg-paper/95 px-4 backdrop-blur md:hidden">
        <Link href="/" className="font-serif-display text-xl italic text-ink">Nekko</Link>
        {activeItem && <span className="ml-2 border-l border-line pl-2 text-xs text-ink-soft">{activeItem.label}</span>}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="h-8 w-8" />
          {!isGuestView && <UserMenu className="h-8 w-8" me={me} />}
        </div>
      </header>

      <nav className={`fixed inset-x-0 bottom-0 z-40 grid h-[68px] border-t border-line bg-paper-soft/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden ${isGuestView ? "grid-cols-3" : "grid-cols-5"}`} aria-label="手机主导航">
        {primaryItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] ${active ? "text-accent" : "text-ink-soft"}`}>
              <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.7} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        {isGuestView ? (
          <>
            <button type="button" onClick={() => setJoinOpen(true)} className="flex flex-col items-center justify-center gap-1 text-[10px] text-ink-soft">
              <HeartHandshake className="h-5 w-5" strokeWidth={1.7} />
              <span>加入</span>
            </button>
            <Link href="/login" className="flex flex-col items-center justify-center gap-1 text-[10px] text-ink-soft">
              <LogIn className="h-5 w-5" strokeWidth={1.7} />
              <span>登录</span>
            </Link>
          </>
        ) : (
          <button type="button" onClick={() => setMoreOpen(true)} className={`flex flex-col items-center justify-center gap-1 text-[10px] ${moreItems.some((item) => isActive(pathname, item.href)) ? "text-accent" : "text-ink-soft"}`} aria-label="更多导航">
            <Menu className="h-5 w-5" strokeWidth={1.7} />
            <span>更多</span>
          </button>
        )}
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-lg border-t border-line bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">全部功能</p>
              <button type="button" onClick={() => setMoreOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft" aria-label="关闭更多导航">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className={`flex h-20 flex-col items-center justify-center gap-2 rounded-md border text-xs ${active ? "border-accent bg-accent-soft text-accent" : "border-line bg-paper text-ink-soft"}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.7} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {joinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-6" onClick={() => setJoinOpen(false)}>
          <div className="w-full max-w-sm rounded-lg border border-line bg-card p-6 text-center" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-xl font-semibold text-ink">加入我们</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">欢迎联系 Nekko Studio</p>
            <p className="mt-1 text-base font-medium text-accent">NEKKOTOhare vx</p>
            <button type="button" onClick={() => setJoinOpen(false)} className="mt-6 rounded-md bg-accent px-6 py-2 text-sm font-medium text-white">
              知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
}
