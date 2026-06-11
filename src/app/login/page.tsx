"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FadeIn } from "@/components/motion";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  async function handleGuestEnter() {
    setGuestLoading(true);
    await fetch("/api/auth/guest", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "登录失败，请重试。");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20">
      <FadeIn className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="font-serif-display italic text-4xl tracking-tight text-ink mb-2">
            Nekko
          </div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-accent">
            Studio Workspace
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-line bg-card p-8 flex flex-col gap-5"
        >
          <div>
            <label className="block text-xs text-ink-soft mb-2" htmlFor="username">
              用户名
            </label>
            <input
              id="username"
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent transition-colors"
              placeholder="你的用户名"
            />
          </div>

          <div>
            <label className="block text-xs text-ink-soft mb-2" htmlFor="password">
              密码
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-accent text-paper text-sm font-medium py-2.5 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "登录中…" : "进入"}
          </button>

          <p className="text-center text-xs text-ink-soft">
            还没有账号？{" "}
            <Link href="/register" className="text-accent hover:underline">
              去注册
            </Link>
          </p>
        </form>

        <button
          type="button"
          onClick={handleGuestEnter}
          disabled={guestLoading}
          className="mt-4 w-full rounded-full border border-line text-ink-soft text-sm font-medium py-2.5 transition-colors hover:text-accent hover:border-accent disabled:opacity-50"
        >
          {guestLoading ? "进入中…" : "访客进入"}
        </button>
      </FadeIn>
    </div>
  );
}
