"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FadeIn } from "@/components/motion";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName, password, inviteCode }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "注册失败，请重试。");
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
            <label className="block text-xs text-ink-soft mb-2" htmlFor="displayName">
              昵称
            </label>
            <input
              id="displayName"
              type="text"
              required
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent transition-colors"
              placeholder="团队里显示的名字"
            />
          </div>

          <div>
            <label className="block text-xs text-ink-soft mb-2" htmlFor="username">
              用户名
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent transition-colors"
              placeholder="用于登录，建议使用英文/数字"
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent transition-colors"
              placeholder="至少 6 位"
            />
          </div>

          <div>
            <label className="block text-xs text-ink-soft mb-2" htmlFor="confirmPassword">
              确认密码
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent transition-colors"
              placeholder="再输入一次密码"
            />
          </div>

          <div>
            <label className="block text-xs text-ink-soft mb-2" htmlFor="inviteCode">
              邀请码
            </label>
            <input
              id="inviteCode"
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent transition-colors"
              placeholder="向团队成员索取邀请码"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-accent text-paper text-sm font-medium py-2.5 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "注册中…" : "注册并进入"}
          </button>

          <p className="text-center text-xs text-ink-soft">
            已经有账号？{" "}
            <Link href="/login" className="text-accent hover:underline">
              去登录
            </Link>
          </p>
        </form>
      </FadeIn>
    </div>
  );
}
