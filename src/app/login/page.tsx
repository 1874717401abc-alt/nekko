"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FadeIn } from "@/components/motion";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("密码错误，请重试。");
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
            <label className="block text-xs text-ink-soft mb-2" htmlFor="password">
              访问密码
            </label>
            <input
              id="password"
              type="password"
              required
              autoFocus
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
        </form>
      </FadeIn>
    </div>
  );
}
