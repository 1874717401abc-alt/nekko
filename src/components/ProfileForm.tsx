"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Save, UserRound } from "lucide-react";
import Avatar from "@/components/Avatar";
import AvatarCropper from "@/components/AvatarCropper";
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
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setCropFile(file);
  }

  async function handleCropConfirm(dataUrl: string) {
    setCropFile(null);
    setAvatarUploading(true);
    setAvatarError(null);

    try {
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

  function handleCropCancel() {
    setCropFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
          .map((item) => item.trim())
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
    <>
      {cropFile && (
        <AvatarCropper file={cropFile} onCancel={handleCropCancel} onConfirm={handleCropConfirm} />
      )}
      <form
        onSubmit={handleSubmit}
        className="grid overflow-hidden rounded-lg border border-line/70 bg-card lg:grid-cols-[260px_minmax(0,1fr)]"
      >
        <aside className="border-b border-line/70 bg-paper-soft/45 p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <div className="mb-5 flex items-center gap-2 text-xs font-medium text-ink-soft">
            <UserRound size={15} aria-hidden="true" />
            账号身份
          </div>
          <div className="flex items-center gap-4 lg:flex-col lg:items-start">
            <Avatar
              src={avatarUrl || undefined}
              name={displayName || user.displayName}
              size={76}
            />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-ink">
                {displayName || user.displayName}
              </p>
              <p className="mt-0.5 truncate text-xs text-ink-soft">@{user.username}</p>
            </div>
          </div>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-card px-3 text-xs font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
            >
              <Camera size={14} aria-hidden="true" />
              {avatarUploading ? "上传中…" : "更换头像"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            {avatarError && <p className="mt-2 text-xs text-red-400">{avatarError}</p>}
          </div>
          <p className="mt-5 border-t border-line/70 pt-4 text-xs leading-5 text-ink-soft">
            头像与资料会同步显示在团队、评论和任务记录中。
          </p>
        </aside>

        <div className="p-5 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-ink">成员资料</h2>
            <p className="mt-1 text-xs text-ink-soft">维护团队内部可见的职责与联系方式。</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">昵称</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">角色 / 职责</label>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="例如：策划 / 出镜 / 剪辑"
                className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">简介</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="介绍一下自己……"
                className="w-full resize-none rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">专长标签</label>
              <input
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="拍摄, 剪辑, 配乐"
                className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-soft">联系方式</label>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="微信 / QQ / 邮箱等"
                className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6 flex min-h-9 flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-5">
            <div aria-live="polite">
              {error && <p className="text-xs text-red-400">{error}</p>}
              {saved && !error && <p className="text-xs text-accent">资料已保存。</p>}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-paper transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              <Save size={15} aria-hidden="true" />
              {saving ? "保存中…" : "保存资料"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
