"use client";

import { useRouter } from "next/navigation";

export default function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      aria-label="退出登录"
      title="退出登录"
      className={`flex items-center justify-center rounded-full border border-line text-ink-soft hover:text-accent hover:border-accent/50 transition-colors ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-[18px] w-[18px]">
        <path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 16l4-4-4-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 12H9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
