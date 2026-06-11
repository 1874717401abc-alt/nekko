"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import type { User } from "@/lib/types";

export default function UserMenu({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (!user) {
    return <div className={`rounded-full bg-paper-soft animate-pulse ${className}`} />;
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="账户菜单"
        className={`flex items-center justify-center rounded-full ${className}`}
      >
        <Avatar src={user.avatarUrl || undefined} name={user.displayName} size={36} className="h-full w-full" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-line bg-card shadow-xl p-4 z-40">
          <div className="flex items-center gap-3 mb-3">
            <Avatar src={user.avatarUrl || undefined} name={user.displayName} size={40} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate">{user.displayName}</p>
              {user.role && <p className="text-xs text-ink-soft truncate">{user.role}</p>}
            </div>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block text-sm text-ink-soft hover:text-accent transition-colors px-1 py-1.5"
          >
            我的资料
          </Link>
          {user.isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="block text-sm text-ink-soft hover:text-accent transition-colors px-1 py-1.5"
            >
              控制台
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="block w-full text-left text-sm text-ink-soft hover:text-accent transition-colors px-1 py-1.5"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
