"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";

const navItems: { href: string; label: string; sub: string; icon: ReactNode }[] = [
  {
    href: "/",
    label: "主页",
    sub: "Home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/checkin",
    label: "打卡",
    sub: "Check-in",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/inspiration",
    label: "灵感库",
    sub: "Inspiration",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M9 18h6" strokeLinecap="round" />
        <path d="M10 21h4" strokeLinecap="round" />
        <path d="M12 3a6 6 0 0 0-3.7 10.7c.5.4.7 1 .7 1.6V16h6v-.7c0-.6.3-1.2.7-1.6A6 6 0 0 0 12 3Z" />
      </svg>
    ),
  },
  {
    href: "/library",
    label: "资料库",
    sub: "Library",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M4 19.5V5.2c0-.7.5-1.2 1.2-1.2H10l1.6 2h7.2c.7 0 1.2.5 1.2 1.2V19c0 .7-.5 1-1.2 1H5.2c-.7 0-1.2-.3-1.2-1Z" />
      </svg>
    ),
  },
  {
    href: "/progress",
    label: "进度看板",
    sub: "Progress",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="3" y="4" width="18" height="17" rx="1.5" />
        <path d="M3 9h18" />
        <path d="M8 13h2M8 17h5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/projects",
    label: "项目",
    sub: "Projects",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M3.5 6.2c0-.7.6-1.2 1.2-1.2H10l1.6 2h7.7c.7 0 1.2.5 1.2 1.2V18c0 .7-.5 1.2-1.2 1.2H4.7c-.7 0-1.2-.5-1.2-1.2Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/team",
    label: "团队",
    sub: "Team",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5" strokeLinecap="round" />
        <circle cx="17" cy="7" r="2.2" />
        <path d="M16 14.2c2.3.4 4 2.2 4 4.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "我的资料",
    sub: "Profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M4.5 19.5c0-3.3 3.4-6 7.5-6s7.5 2.7 7.5 6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname?.startsWith("/login") || pathname?.startsWith("/register")) {
    return null;
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-64 border-r border-line bg-paper-soft px-7 py-9">
        <div className="flex items-start justify-between mb-12">
          <Link href="/">
            <div className="font-serif-display italic text-3xl tracking-tight text-ink">
              Nekko
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-ink-soft">
              Studio Workspace
            </div>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle className="h-8 w-8 shrink-0" />
            <UserMenu className="h-8 w-8 shrink-0" />
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 transition-colors ${
                  active
                    ? "bg-card text-ink shadow-sm"
                    : "text-ink-soft hover:bg-card/60 hover:text-ink"
                }`}
              >
                <span
                  className={`h-8 w-8 flex items-center justify-center rounded-lg ${
                    active ? "bg-accent/10 text-accent" : "text-ink-soft group-hover:text-accent"
                  }`}
                >
                  <span className="block h-[18px] w-[18px]">{item.icon}</span>
                </span>
                <span>
                  <span className="block text-sm font-medium leading-tight">{item.label}</span>
                  <span className="block text-[11px] tracking-wide text-ink-soft/80">
                    {item.sub}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-8 border-t border-line">
          <p className="font-serif-display italic text-sm text-ink-soft leading-relaxed">
            “Make something worth watching.”
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-paper-soft/90 backdrop-blur px-3 py-3">
        <Link
          href="/"
          className="font-serif-display italic text-xl text-ink shrink-0 pl-1"
        >
          Nekko
        </Link>
        <nav className="flex items-center gap-0.5 overflow-x-auto flex-nowrap ml-auto min-w-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`h-9 w-9 shrink-0 flex items-center justify-center rounded-lg ${
                  active ? "bg-accent/10 text-accent" : "text-ink-soft"
                }`}
              >
                <span className="block h-[18px] w-[18px]">{item.icon}</span>
              </Link>
            );
          })}
          <ThemeToggle className="h-9 w-9 shrink-0 ml-0.5" />
        </nav>
        <UserMenu className="h-9 w-9 shrink-0" />
      </header>
    </>
  );
}
