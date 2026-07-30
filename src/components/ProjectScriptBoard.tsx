"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Clock3, Edit3, Plus, Trash2 } from "lucide-react";
import { createItem, deleteItem, patchItem } from "@/lib/clientData";
import type { ScriptScene, ScriptSceneStatus, ScriptSceneType } from "@/lib/types";

const sceneTypeLabel: Record<ScriptSceneType, string> = {
  hook: "钩子",
  narration: "口播",
  broll: "画面",
  interview: "访谈",
  outro: "收尾",
};

const sceneTypeColor: Record<ScriptSceneType, string> = {
  hook: "bg-accent",
  narration: "bg-sky-500",
  broll: "bg-emerald-500",
  interview: "bg-amber-500",
  outro: "bg-fuchsia-500",
};

const sceneStatusLabel: Record<ScriptSceneStatus, string> = {
  draft: "草稿",
  ready: "可拍摄",
  shot: "已拍摄",
};

function formatDuration(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${seconds}s`;
}

type SceneForm = {
  title: string;
  type: ScriptSceneType;
  duration: string;
  script: string;
  visual: string;
  assignee: string;
  status: ScriptSceneStatus;
};

const emptyForm: SceneForm = {
  title: "",
  type: "narration",
  duration: "15",
  script: "",
  visual: "",
  assignee: "",
  status: "draft",
};

export default function ProjectScriptBoard({
  projectId,
  initialScenes,
  onScenesChange,
}: {
  projectId: string;
  initialScenes: ScriptScene[];
  onScenesChange?: (scenes: ScriptScene[]) => void;
}) {
  const [scenes, setScenes] = useState(initialScenes);
  const [form, setForm] = useState<SceneForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(initialScenes.length === 0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutatingRef = useRef(false);

  const syncTeamScenes = useCallback(async () => {
    if (mutatingRef.current) return;
    try {
      const response = await fetch("/api/data/scripts", { cache: "no-store" });
      if (!response.ok) return;
      const data: unknown = await response.json();
      if (!Array.isArray(data)) return;
      const next = (data as ScriptScene[]).filter((scene) => scene.projectId === projectId);
      if (JSON.stringify(scenes) === JSON.stringify(next)) return;
      setScenes(next);
      onScenesChange?.(next);
    } catch {
      // Keep the current timeline during brief network interruptions.
    }
  }, [onScenesChange, projectId, scenes]);

  useEffect(() => {
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") void syncTeamScenes();
    };
    const interval = window.setInterval(syncWhenVisible, 8_000);
    window.addEventListener("focus", syncWhenVisible);
    document.addEventListener("visibilitychange", syncWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", syncWhenVisible);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [syncTeamScenes]);

  const sorted = useMemo(
    () => [...scenes].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt)),
    [scenes]
  );
  const totalDuration = sorted.reduce((sum, scene) => sum + scene.duration, 0);
  const readyCount = sorted.filter((scene) => scene.status !== "draft").length;
  const timeline = useMemo(
    () =>
      sorted.map((scene, index) => ({
        scene,
        start: sorted.slice(0, index).reduce((sum, item) => sum + item.duration, 0),
      })),
    [sorted]
  );

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function editScene(scene: ScriptScene) {
    setEditingId(scene.id);
    setForm({
      title: scene.title,
      type: scene.type,
      duration: String(scene.duration),
      script: scene.script,
      visual: scene.visual ?? "",
      assignee: scene.assignee ?? "",
      status: scene.status,
    });
    setShowForm(true);
  }

  async function saveScene(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    setPending(true);
    setError(null);
    const payload = {
      projectId,
      title: form.title,
      type: form.type,
      duration: Number(form.duration) || 1,
      script: form.script,
      visual: form.visual,
      assignee: form.assignee,
      status: form.status,
      order: editingId
        ? scenes.find((scene) => scene.id === editingId)?.order ?? scenes.length
        : Math.max(-1, ...scenes.map((scene) => scene.order)) + 1,
    };
    try {
      mutatingRef.current = true;
      if (editingId) {
        const updated = await patchItem<ScriptScene>("scripts", editingId, payload);
        const next = scenes.map((scene) => (scene.id === editingId ? updated : scene));
        setScenes(next);
        onScenesChange?.(next);
      } else {
        const created = await createItem<ScriptScene>("scripts", payload);
        const next = [...scenes, created];
        setScenes(next);
        onScenesChange?.(next);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "脚本保存失败。");
    } finally {
      mutatingRef.current = false;
      setPending(false);
    }
  }

  async function removeScene(scene: ScriptScene) {
    if (!window.confirm(`删除镜头「${scene.title}」？`)) return;
    setError(null);
    try {
      mutatingRef.current = true;
      await deleteItem("scripts", scene.id);
      const next = scenes.filter((item) => item.id !== scene.id);
      setScenes(next);
      onScenesChange?.(next);
      if (editingId === scene.id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败。");
    } finally {
      mutatingRef.current = false;
    }
  }

  async function moveScene(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;
    const current = sorted[index];
    const target = sorted[targetIndex];
    setError(null);
    try {
      mutatingRef.current = true;
      const [nextCurrent, nextTarget] = await Promise.all([
        patchItem<ScriptScene>("scripts", current.id, { order: target.order }),
        patchItem<ScriptScene>("scripts", target.id, { order: current.order }),
      ]);
      const next = scenes.map((item) =>
        item.id === nextCurrent.id ? nextCurrent : item.id === nextTarget.id ? nextTarget : item
      );
      setScenes(next);
      onScenesChange?.(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "排序失败。");
    } finally {
      mutatingRef.current = false;
    }
  }

  return (
    <section aria-labelledby="script-heading">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="script-heading" className="text-lg font-semibold text-ink">脚本时间轴</h2>
          <p className="mt-1 text-xs leading-5 text-ink-soft">
            每个镜头按时长自动排列，口播、画面和拍摄状态保持在同一条线上。
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showForm) resetForm();
            else {
              setEditingId(null);
              setForm(emptyForm);
              setShowForm(true);
            }
          }}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-xs font-medium text-paper transition-colors hover:bg-ink/85"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {showForm ? "收起" : "添加镜头"}
        </button>
      </div>

      {error && <p className="mb-4 text-xs text-red-500">{error}</p>}

      <div className="mb-6 grid grid-cols-3 border-y border-line/70 py-4">
        <div>
          <p className="text-[11px] text-ink-soft">镜头</p>
          <p className="mt-1 text-lg font-semibold text-ink">{sorted.length}</p>
        </div>
        <div className="border-x border-line/70 px-4">
          <p className="text-[11px] text-ink-soft">总时长</p>
          <p className="mt-1 text-lg font-semibold text-ink">{formatDuration(totalDuration)}</p>
        </div>
        <div className="pl-4">
          <p className="text-[11px] text-ink-soft">已就绪</p>
          <p className="mt-1 text-lg font-semibold text-ink">{readyCount}/{sorted.length}</p>
        </div>
      </div>

      {sorted.length > 0 ? (
        <div className="mb-7 overflow-x-auto pb-2">
          <div className="min-w-[720px]">
            <div className="mb-2 flex h-5 items-end text-[10px] text-ink-soft">
              {timeline.map(({ scene, start }) => {
                return (
                  <div key={scene.id} style={{ width: Math.max(112, scene.duration * 7) }} className="shrink-0">
                    {formatDuration(start)}
                  </div>
                );
              })}
              <span className="shrink-0">{formatDuration(totalDuration)}</span>
            </div>
            <div className="flex border-y border-line bg-paper-soft py-2">
              {sorted.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => editScene(scene)}
                  style={{ width: Math.max(112, scene.duration * 7) }}
                  className="group relative h-24 shrink-0 border-r border-paper px-3 py-2 text-left text-white transition-opacity hover:opacity-90"
                >
                  <span className={`absolute inset-0 ${sceneTypeColor[scene.type]}`} aria-hidden="true" />
                  <span className="relative block text-[10px] font-medium text-white/80">
                    {sceneTypeLabel[scene.type]} · {formatDuration(scene.duration)}
                  </span>
                  <span className="relative mt-2 block line-clamp-2 text-xs font-semibold leading-5">
                    {scene.title}
                  </span>
                  <span className="relative mt-1 block text-[10px] text-white/80">
                    {sceneStatusLabel[scene.status]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 border-y border-dashed border-line py-12 text-center">
          <Clock3 className="mx-auto h-5 w-5 text-ink-soft" aria-hidden="true" />
          <p className="mt-3 text-sm text-ink">从第一个镜头开始搭脚本</p>
          <p className="mt-1 text-xs text-ink-soft">时间轴会根据每段时长自动生成。</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={saveScene} className="mb-7 grid grid-cols-1 gap-3 border-b border-line pb-7 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="scene-title">镜头标题</label>
            <input
              id="scene-title"
              value={form.title}
              onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
              required
              placeholder="例如：开场反差钩子"
              className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="scene-type">类型</label>
              <select
                id="scene-type"
                value={form.type}
                onChange={(event) => setForm((value) => ({ ...value, type: event.target.value as ScriptSceneType }))}
                className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
              >
                {Object.entries(sceneTypeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="scene-duration">时长（秒）</label>
              <input
                id="scene-duration"
                type="number"
                min="1"
                max="3600"
                value={form.duration}
                onChange={(event) => setForm((value) => ({ ...value, duration: event.target.value }))}
                className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="scene-status">状态</label>
              <select
                id="scene-status"
                value={form.status}
                onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as ScriptSceneStatus }))}
                className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
              >
                {Object.entries(sceneStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="scene-assignee">负责人</label>
              <input
                id="scene-assignee"
                value={form.assignee}
                onChange={(event) => setForm((value) => ({ ...value, assignee: event.target.value }))}
                placeholder="可选"
                className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="scene-script">台词 / 旁白</label>
            <textarea
              id="scene-script"
              rows={5}
              value={form.script}
              onChange={(event) => setForm((value) => ({ ...value, script: event.target.value }))}
              placeholder="写下这一段真正要说的内容"
              className="w-full resize-y rounded-md border border-line bg-paper px-3.5 py-3 text-sm leading-6 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="scene-visual">画面 / 运镜</label>
            <textarea
              id="scene-visual"
              rows={5}
              value={form.visual}
              onChange={(event) => setForm((value) => ({ ...value, visual: event.target.value }))}
              placeholder="景别、素材、字幕、转场或镜头动作"
              className="w-full resize-y rounded-md border border-line bg-paper px-3.5 py-3 text-sm leading-6 focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={resetForm} className="h-9 rounded-md border border-line px-4 text-xs text-ink-soft hover:border-ink-soft">取消</button>
            <button type="submit" disabled={pending} className="h-9 rounded-md bg-accent px-4 text-xs font-medium text-white disabled:opacity-50">
              {pending ? "保存中…" : editingId ? "保存镜头" : "添加到时间轴"}
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-line/70 border-y border-line/70">
        {sorted.map((scene, index) => (
          <div key={scene.id} className="grid gap-3 py-4 sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-paper-soft text-xs font-semibold text-ink-soft">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${sceneTypeColor[scene.type]}`} />
                <p className="font-medium text-ink">{scene.title}</p>
                <span className="text-[11px] text-ink-soft">{sceneTypeLabel[scene.type]} · {formatDuration(scene.duration)} · {sceneStatusLabel[scene.status]}</span>
              </div>
              {scene.script && <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-soft">{scene.script}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => moveScene(index, -1)} disabled={index === 0} title="上移" aria-label="上移镜头" className="flex h-8 w-8 items-center justify-center rounded text-ink-soft hover:bg-paper-soft hover:text-ink disabled:opacity-25"><ChevronUp className="h-4 w-4" /></button>
              <button type="button" onClick={() => moveScene(index, 1)} disabled={index === sorted.length - 1} title="下移" aria-label="下移镜头" className="flex h-8 w-8 items-center justify-center rounded text-ink-soft hover:bg-paper-soft hover:text-ink disabled:opacity-25"><ChevronDown className="h-4 w-4" /></button>
              <button type="button" onClick={() => editScene(scene)} title="编辑" aria-label="编辑镜头" className="flex h-8 w-8 items-center justify-center rounded text-ink-soft hover:bg-paper-soft hover:text-ink"><Edit3 className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => removeScene(scene)} title="删除" aria-label="删除镜头" className="flex h-8 w-8 items-center justify-center rounded text-ink-soft hover:bg-red-500/10 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
