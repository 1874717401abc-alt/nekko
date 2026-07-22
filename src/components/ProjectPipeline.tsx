"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";
import { patchItem } from "@/lib/clientData";
import type { Project, ProjectStage } from "@/lib/types";

const stages: { value: ProjectStage; label: string }[] = [
  { value: "idea", label: "选题" },
  { value: "research", label: "调研" },
  { value: "script", label: "脚本" },
  { value: "shooting", label: "拍摄" },
  { value: "editing", label: "剪辑" },
  { value: "review", label: "审核" },
  { value: "publishing", label: "发布" },
  { value: "published", label: "已发布" },
  { value: "retrospective", label: "复盘" },
];

export default function ProjectPipeline({ project }: { project: Project }) {
  const [stage, setStage] = useState<ProjectStage>(project.stage ?? "idea");
  const [owner, setOwner] = useState(project.stageOwner ?? "");
  const [blockedReason, setBlockedReason] = useState(project.blockedReason ?? "");
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentIndex = stages.findIndex((item) => item.value === stage);

  async function save(nextStage = stage) {
    setPending(true);
    setError(null);
    try {
      const updated = await patchItem<Project>("projects", project.id, {
        stage: nextStage,
        stageOwner: owner,
        blockedReason,
      });
      setStage(updated.stage ?? nextStage);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "制作阶段保存失败。");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mb-8 border-y border-line/70 py-5" aria-labelledby="pipeline-heading">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="pipeline-heading" className="text-sm font-semibold text-ink">内容生产流程</h2>
          <p className="mt-1 text-xs text-ink-soft">当前负责人：{owner || "未指定"}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing((value) => !value)} className="h-8 rounded-md border border-line px-3 text-xs text-ink-soft hover:border-accent hover:text-accent">{editing ? "收起" : "流程设置"}</button>
          {currentIndex < stages.length - 1 && (
            <button type="button" onClick={() => save(stages[currentIndex + 1].value)} disabled={pending} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ink px-3 text-xs font-medium text-paper disabled:opacity-50">
              推进到{stages[currentIndex + 1].label}<ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[820px] items-start">
          {stages.map((item, index) => {
            const done = index < currentIndex;
            const active = index === currentIndex;
            return (
              <button key={item.value} type="button" onClick={() => save(item.value)} disabled={pending} className="group flex min-w-0 flex-1 items-start text-left">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${done ? "border-emerald-500 bg-emerald-500 text-white" : active ? "border-accent bg-accent text-white" : "border-line bg-paper text-ink-soft"}`}>
                  {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1 pt-3.5">
                  <span className={`block h-px ${index === stages.length - 1 ? "bg-transparent" : done ? "bg-emerald-500" : "bg-line"}`} />
                  <span className={`mt-2 block text-[11px] ${active ? "font-semibold text-accent" : "text-ink-soft"}`}>{item.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {editing && (
        <div className="mt-4 grid gap-3 border-t border-line/70 pt-4 sm:grid-cols-2">
          <label className="text-xs text-ink-soft">阶段负责人
            <input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="姓名或角色" className="mt-1.5 w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none" />
          </label>
          <label className="text-xs text-ink-soft">阻塞原因
            <input value={blockedReason} onChange={(event) => setBlockedReason(event.target.value)} placeholder="没有阻塞可留空" className="mt-1.5 w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none" />
          </label>
          <div className="flex justify-end sm:col-span-2">
            <button type="button" onClick={() => save()} disabled={pending} className="h-9 rounded-md bg-accent px-4 text-xs font-medium text-white disabled:opacity-50">{pending ? "保存中…" : "保存流程"}</button>
          </div>
        </div>
      )}
      {blockedReason && !editing && <p className="mt-3 flex items-center gap-2 text-xs text-amber-600"><AlertTriangle className="h-3.5 w-3.5" />{blockedReason}</p>}
      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
    </section>
  );
}
