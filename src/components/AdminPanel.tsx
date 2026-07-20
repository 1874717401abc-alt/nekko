"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, ImageIcon, RotateCcw, Save, ShieldCheck, Trash2, Type, Upload } from "lucide-react";
import Avatar from "@/components/Avatar";
import type { HeroContent, TrashItem, User } from "@/lib/types";

const SLIDE_LABELS = ["轮播图 1（主图）", "轮播图 2", "轮播图 3"];
const MAX_BYTES = 5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminPanel({
  currentUser,
  users,
  heroImages,
  heroContent,
  trashItems,
}: {
  currentUser: User;
  users: User[];
  heroImages: string[];
  heroContent: HeroContent;
  trashItems: TrashItem[];
}) {
  const router = useRouter();
  const [memberError, setMemberError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([
    heroImages[0] || "",
    heroImages[1] || "",
    heroImages[2] || "",
  ]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const [content, setContent] = useState<HeroContent>(heroContent);
  const [contentSaving, setContentSaving] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [contentSaved, setContentSaved] = useState(false);
  const [trash, setTrash] = useState<TrashItem[]>(trashItems);
  const [trashError, setTrashError] = useState<string | null>(null);
  const [trashPending, setTrashPending] = useState<string | null>(null);

  function updateSlideField(index: number, field: keyof HeroContent["slides"][number], value: string) {
    setContentSaved(false);
    setContent((c) => ({
      ...c,
      slides: c.slides.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  }

  function updateLatestField(field: "latestLabel" | "latestTitle" | "latestDesc", value: string) {
    setContentSaved(false);
    setContent((c) => ({ ...c, [field]: value }));
  }

  async function saveContent() {
    setContentSaving(true);
    setContentError(null);
    setContentSaved(false);
    try {
      const res = await fetch("/api/admin/hero-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setContentError(data?.error ?? "保存失败，请重试。");
        return;
      }
      const updated = await res.json();
      setContent(updated);
      setContentSaved(true);
      router.refresh();
    } catch {
      setContentError("保存失败，请重试。");
    } finally {
      setContentSaving(false);
    }
  }

  async function toggleAdmin(userId: string, makeAdmin: boolean) {
    setMemberError(null);
    setPendingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: makeAdmin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMemberError(data?.error ?? "操作失败，请重试。");
        return;
      }
      router.refresh();
    } catch {
      setMemberError("操作失败，请重试。");
    } finally {
      setPendingId(null);
    }
  }

  async function handleHeroFileChange(slot: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (file.size > MAX_BYTES) {
      setUploadError("图片太大了（最大 5MB）。");
      if (fileInputRefs[slot].current) fileInputRefs[slot].current!.value = "";
      return;
    }

    setUploadingSlot(slot);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await fetch("/api/admin/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, image: dataUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setUploadError(data?.error ?? "上传失败，请重试。");
        return;
      }
      const updated = await res.json();
      setImages(updated);
      router.refresh();
    } catch {
      setUploadError("上传失败，请重试。");
    } finally {
      setUploadingSlot(null);
      if (fileInputRefs[slot].current) fileInputRefs[slot].current!.value = "";
    }
  }

  async function handleHeroReset(slot: number) {
    setUploadError(null);
    setUploadingSlot(slot);
    try {
      const res = await fetch("/api/admin/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, image: null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setUploadError(data?.error ?? "操作失败，请重试。");
        return;
      }
      const updated = await res.json();
      setImages(updated);
      router.refresh();
    } catch {
      setUploadError("操作失败，请重试。");
    } finally {
      setUploadingSlot(null);
    }
  }

  async function handleTrashAction(item: TrashItem, action: "restore" | "purge") {
    if (action === "purge" && !window.confirm(`确定永久删除「${item.title}」吗？此操作不能恢复。`)) {
      return;
    }

    const key = `${item.resource}:${item.id}`;
    setTrashError(null);
    setTrashPending(key);
    try {
      const res = await fetch(`/api/admin/trash/${item.resource}/${item.id}`, {
        method: action === "restore" ? "PATCH" : "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setTrashError(data?.error ?? "操作失败，请重试。");
        return;
      }
      setTrash((current) =>
        current.filter((entry) => entry.resource !== item.resource || entry.id !== item.id)
      );
      router.refresh();
    } catch {
      setTrashError("操作失败，请重试。");
    } finally {
      setTrashPending(null);
    }
  }

  function formatTrashTime(iso: string) {
    return new Date(iso).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const resourceLabel: Record<TrashItem["resource"], string> = {
    projects: "项目",
    progress: "任务",
    inspiration: "灵感",
    library: "资料",
    checkins: "打卡",
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-lg border border-line/70 bg-card p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
          <Download size={16} aria-hidden="true" />
          数据备份
        </h2>
        <p className="text-xs text-ink-soft mb-5">
          导出当前工作台数据，包含项目、任务、灵感、资料、打卡、活动记录和成员资料。
        </p>
        <a
          href="/api/admin/export"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-xs font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent"
        >
          <Download size={14} aria-hidden="true" />
          导出 JSON 备份
        </a>
      </section>

      <section className="rounded-lg border border-line/70 bg-card p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
          <Trash2 size={16} aria-hidden="true" />
          回收站
        </h2>
        <p className="text-xs text-ink-soft mb-5">
          最近删除的项目、任务、灵感、资料和打卡会先进入这里，管理员可以恢复或永久删除。
        </p>
        {trashError && <p className="text-xs text-red-400 mb-3">{trashError}</p>}
        <div className="flex flex-col gap-3">
          {trash.map((item) => {
            const key = `${item.resource}:${item.id}`;
            return (
              <div
                key={key}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-3 border-b border-line/70 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-paper-soft px-2 py-0.5 text-[11px] text-ink-soft">
                      {resourceLabel[item.resource]}
                    </span>
                    <p className="text-sm font-medium text-ink truncate">{item.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {item.subtitle ? `${item.subtitle} · ` : ""}
                    {item.deletedBy ? `${item.deletedBy} 删除 · ` : ""}
                    {formatTrashTime(item.deletedAt)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTrashAction(item, "restore")}
                    disabled={trashPending === key}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-3 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                    恢复
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTrashAction(item, "purge")}
                    disabled={trashPending === key}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-3 text-xs text-ink-soft transition-colors hover:border-red-400 hover:text-red-500 disabled:opacity-50"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    永久删除
                  </button>
                </div>
              </div>
            );
          })}
          {trash.length === 0 && <p className="text-sm text-ink-soft">回收站是空的。</p>}
        </div>
      </section>

      <section className="rounded-lg border border-line/70 bg-card p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
          <ShieldCheck size={16} aria-hidden="true" />
          成员管理
        </h2>
        <p className="text-xs text-ink-soft mb-5">
          {currentUser.isOwner
            ? "你是网站所有者，可以授予或撤销其他成员的控制台权限。"
            : "你拥有控制台权限，可以查看所有成员。"}
        </p>
        {memberError && <p className="text-xs text-red-400 mb-3">{memberError}</p>}
        <div className="flex flex-col gap-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-4 px-1 py-2.5 border-b border-line/70 last:border-b-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar src={u.avatarUrl || undefined} name={u.displayName} size={36} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {u.displayName}
                    {u.isOwner && (
                      <span className="ml-2 align-middle text-[10px] text-accent">
                        所有者
                      </span>
                    )}
                    {!u.isOwner && u.isAdmin && (
                      <span className="ml-2 align-middle text-[10px] text-ink-soft">
                        管理员
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-soft truncate">@{u.username}</p>
                </div>
              </div>
              {currentUser.isOwner && !u.isOwner && (
                <button
                  onClick={() => toggleAdmin(u.id, !u.isAdmin)}
                  disabled={pendingId === u.id}
                  className="h-8 shrink-0 rounded-md border border-line px-3 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {pendingId === u.id ? "处理中…" : u.isAdmin ? "撤销管理员" : "设为管理员"}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line/70 bg-card p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
          <ImageIcon size={16} aria-hidden="true" />
          首页轮播图
        </h2>
        <p className="text-xs text-ink-soft mb-5">
          上传图片替换首页主轮播的背景图，建议使用横向图片（约 16:9）。
        </p>
        {uploadError && <p className="text-xs text-red-400 mb-3">{uploadError}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SLIDE_LABELS.map((label, i) => (
            <div key={i} className="flex flex-col gap-2">
              <p className="text-xs font-medium text-ink-soft">{label}</p>
              <div className="relative aspect-video rounded-lg overflow-hidden border border-line bg-paper-soft">
                {images[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={images[i]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-ink-soft">
                    默认图片
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRefs[i].current?.click()}
                  disabled={uploadingSlot === i}
                  className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-line px-3 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  <Upload size={13} aria-hidden="true" />
                  {uploadingSlot === i ? "上传中…" : "上传图片"}
                </button>
                {images[i] && (
                  <button
                    type="button"
                    onClick={() => handleHeroReset(i)}
                    disabled={uploadingSlot === i}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-3 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                    重置
                  </button>
                )}
              </div>
              <input
                ref={fileInputRefs[i]}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleHeroFileChange(i, e)}
                className="hidden"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line/70 bg-card p-5 sm:p-6 xl:col-span-2">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
          <Type size={16} aria-hidden="true" />
          首页轮播文字
        </h2>
        <p className="text-xs text-ink-soft mb-5">
          编辑首页轮播图模块和最新动态板块的文案。
        </p>
        {contentError && <p className="text-xs text-red-400 mb-3">{contentError}</p>}
        <div className="flex flex-col gap-6">
          {content.slides.map((slide, i) => (
            <div key={i} className="flex flex-col gap-3 border-t border-line/70 py-5 first:border-t-0 first:pt-0">
              <p className="text-xs font-medium text-accent">
                {SLIDE_LABELS[i]}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs text-ink-soft">
                  竖排小标题
                  <input
                    value={slide.vertical}
                    onChange={(e) => updateSlideField(i, "vertical", e.target.value)}
                    className="rounded-lg border border-line bg-paper-soft px-3 py-2 text-sm text-ink"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-ink-soft">
                  分类标签
                  <input
                    value={slide.category}
                    onChange={(e) => updateSlideField(i, "category", e.target.value)}
                    className="rounded-lg border border-line bg-paper-soft px-3 py-2 text-sm text-ink"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-ink-soft sm:col-span-2">
                  大标题
                  <input
                    value={slide.title}
                    onChange={(e) => updateSlideField(i, "title", e.target.value)}
                    className="rounded-lg border border-line bg-paper-soft px-3 py-2 text-sm text-ink"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-ink-soft sm:col-span-2">
                  描述文字
                  <textarea
                    value={slide.desc}
                    onChange={(e) => updateSlideField(i, "desc", e.target.value)}
                    rows={2}
                    className="rounded-lg border border-line bg-paper-soft px-3 py-2 text-sm text-ink resize-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-ink-soft">
                  右侧卡片标签
                  <input
                    value={slide.posterLabel}
                    onChange={(e) => updateSlideField(i, "posterLabel", e.target.value)}
                    className="rounded-lg border border-line bg-paper-soft px-3 py-2 text-sm text-ink"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-ink-soft">
                  右侧卡片说明
                  <input
                    value={slide.posterSub}
                    onChange={(e) => updateSlideField(i, "posterSub", e.target.value)}
                    className="rounded-lg border border-line bg-paper-soft px-3 py-2 text-sm text-ink"
                  />
                </label>
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-3 border-t border-line/70 pt-5">
            <p className="text-xs font-medium text-accent">最新动态板块</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs text-ink-soft">
                小标签
                <input
                  value={content.latestLabel}
                  onChange={(e) => updateLatestField("latestLabel", e.target.value)}
                  className="rounded-lg border border-line bg-paper-soft px-3 py-2 text-sm text-ink"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-ink-soft sm:col-span-2">
                标题
                <input
                  value={content.latestTitle}
                  onChange={(e) => updateLatestField("latestTitle", e.target.value)}
                  className="rounded-lg border border-line bg-paper-soft px-3 py-2 text-sm text-ink"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-ink-soft sm:col-span-2">
                描述文字
                <textarea
                  value={content.latestDesc}
                  onChange={(e) => updateLatestField("latestDesc", e.target.value)}
                  rows={2}
                  className="rounded-lg border border-line bg-paper-soft px-3 py-2 text-sm text-ink resize-none"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={saveContent}
              disabled={contentSaving}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-xs font-medium text-paper transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              <Save size={14} aria-hidden="true" />
              {contentSaving ? "保存中…" : "保存文字"}
            </button>
            {contentSaved && <p className="text-xs text-accent">已保存。</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
