"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { cropImageToSquareJpeg } from "@/lib/imageCrop";
import type { User } from "@/lib/types";

export default function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [role, setRole] = useState(user.role);
  const [bio, setBio] = useState(user.bio);
  const [focus, setFocus] = useState(user.focus.join(", "));
  const [contact, setContact] = useState(user.contact);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setAvatarError(null);

    try {
      const dataUrl = await cropImageToSquareJpeg(file);
      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setAvatarError(data?.error ?? "上传失败，请重试。");
        return;
      }

      const updated = await res.json();
      setAvatarUrl(updated.avatarUrl);
      router.refresh();
    } catch {
      setAvatarError("上传失败，请重试。");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/users/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: displayName.trim(),
        role: role.trim(),
        bio: bio.trim(),
        focus: focus
          .split(/[,，]/)
          .map((f) => f.trim())
          .filter(Boolean),
        contact: contact.trim(),
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "保存失败，请重试。");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-line/70 bg-card p-6 sm:p-8 flex flex-col gap-5"
    >
      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
          头像
        </label>
        <div className="flex items-center gap-4">
          <Avatar src={avatarUrl || undefined} name={displayName || user.displayName} size={64} />
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="text-sm px-4 py-2 rounded-full border border-line text-ink-soft hover:text-accent hover:border-accent transition-colors disabled:opacity-50"
            >
              {avatarUploading ? "上传中…" : "更换头像"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            {avatarError && <p className="text-xs text-red-400 mt-1.5">{avatarError}</p>}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
          用户名
        </label>
        <p className="text-sm text-ink-soft">{user.username}（不可修改）</p>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
          昵称
        </label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
          角色 / 职责
        </label>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="例如：策划 / 出镜 / 剪辑"
          className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
          简介
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="介绍一下自己……"
          className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent resize-none"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
          专长标签（逗号分隔）
        </label>
        <input
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="拍摄, 剪辑, 配乐"
          className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-ink-soft mb-1.5">
          联系方式
        </label>
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="微信 / QQ / 邮箱等"
          className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {saved && !error && <p className="text-xs text-accent">已保存。</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="text-sm px-5 py-2.5 rounded-full bg-accent text-paper hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    </form>
  );
}
