"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Edit3, Plus, Trash2, WalletCards } from "lucide-react";
import { createItem, deleteItem, patchItem } from "@/lib/clientData";
import type { CostItem, CostStatus, Project } from "@/lib/types";

const statusLabel: Record<CostStatus, string> = {
  planned: "计划中",
  approved: "已确认",
  paid: "已支付",
};

const categoryOptions = ["场地", "设备", "人员", "交通", "道具", "版权", "投流", "餐饮", "其他"];

function money(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(value);
}

type CostForm = {
  title: string;
  category: string;
  amount: string;
  status: CostStatus;
  vendor: string;
  date: string;
  note: string;
};

const emptyForm: CostForm = {
  title: "",
  category: "其他",
  amount: "",
  status: "planned",
  vendor: "",
  date: "",
  note: "",
};

export default function ProjectCostLedger({
  project,
  initialCosts,
}: {
  project: Project;
  initialCosts: CostItem[];
}) {
  const [costs, setCosts] = useState(initialCosts);
  const [budget, setBudget] = useState(project.budget ?? 0);
  const [budgetInput, setBudgetInput] = useState(String(project.budget ?? ""));
  const [editingBudget, setEditingBudget] = useState(false);
  const [form, setForm] = useState<CostForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...costs].sort((a, b) => (b.date ?? b.createdAt).localeCompare(a.date ?? a.createdAt)),
    [costs]
  );
  const total = costs.reduce((sum, item) => sum + item.amount, 0);
  const paid = costs.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0);
  const committed = costs.filter((item) => item.status !== "planned").reduce((sum, item) => sum + item.amount, 0);
  const remaining = budget - total;

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function editCost(item: CostItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      category: item.category,
      amount: String(item.amount),
      status: item.status,
      vendor: item.vendor ?? "",
      date: item.date ?? "",
      note: item.note ?? "",
    });
    setShowForm(true);
  }

  async function saveBudget() {
    const value = Math.max(0, Number(budgetInput) || 0);
    setPending(true);
    setError(null);
    try {
      const updated = await patchItem<Project>("projects", project.id, { budget: value });
      setBudget(updated.budget ?? 0);
      setBudgetInput(String(updated.budget ?? ""));
      setEditingBudget(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "预算保存失败。");
    } finally {
      setPending(false);
    }
  }

  async function saveCost(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.amount) return;
    setPending(true);
    setError(null);
    const payload = {
      projectId: project.id,
      title: form.title,
      category: form.category,
      amount: Number(form.amount),
      status: form.status,
      vendor: form.vendor,
      date: form.date,
      note: form.note,
    };
    try {
      if (editingId) {
        const updated = await patchItem<CostItem>("costs", editingId, payload);
        setCosts((current) => current.map((item) => (item.id === editingId ? updated : item)));
      } else {
        const created = await createItem<CostItem>("costs", payload);
        setCosts((current) => [created, ...current]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "费用保存失败。");
    } finally {
      setPending(false);
    }
  }

  async function updateStatus(item: CostItem, status: CostStatus) {
    setError(null);
    try {
      const updated = await patchItem<CostItem>("costs", item.id, { status });
      setCosts((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "状态更新失败。");
    }
  }

  async function removeCost(item: CostItem) {
    if (!window.confirm(`删除费用「${item.title}」？`)) return;
    setError(null);
    try {
      await deleteItem("costs", item.id);
      setCosts((current) => current.filter((entry) => entry.id !== item.id));
      if (editingId === item.id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败。");
    }
  }

  return (
    <section aria-labelledby="cost-heading">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="cost-heading" className="text-lg font-semibold text-ink">项目成本</h2>
          <p className="mt-1 text-xs leading-5 text-ink-soft">计划、确认与实付分开记录，预算变化会实时反映。</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showForm) resetForm();
            else {
              setForm(emptyForm);
              setEditingId(null);
              setShowForm(true);
            }
          }}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-xs font-medium text-paper hover:bg-ink/85"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {showForm ? "收起" : "登记费用"}
        </button>
      </div>

      {error && <p className="mb-4 text-xs text-red-500">{error}</p>}

      <div className="mb-7 grid grid-cols-2 border-y border-line/70 sm:grid-cols-4">
        <div className="py-4 pr-3">
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-ink-soft">项目预算</p>
            <button type="button" onClick={() => setEditingBudget(true)} title="编辑预算" aria-label="编辑预算" className="text-ink-soft hover:text-accent"><Edit3 className="h-3 w-3" /></button>
          </div>
          {editingBudget ? (
            <div className="mt-2 flex items-center gap-1">
              <input type="number" min="0" value={budgetInput} onChange={(event) => setBudgetInput(event.target.value)} className="h-8 min-w-0 flex-1 rounded border border-line bg-paper px-2 text-sm focus:border-accent focus:outline-none" />
              <button type="button" onClick={saveBudget} disabled={pending} title="保存预算" aria-label="保存预算" className="flex h-8 w-8 items-center justify-center rounded bg-accent text-white"><Check className="h-4 w-4" /></button>
            </div>
          ) : <p className="mt-1 text-lg font-semibold text-ink">{money(budget)}</p>}
        </div>
        <div className="border-l border-line/70 px-3 py-4">
          <p className="text-[11px] text-ink-soft">预计总成本</p>
          <p className="mt-1 text-lg font-semibold text-ink">{money(total)}</p>
        </div>
        <div className="border-l-0 border-t border-line/70 px-0 py-4 pr-3 sm:border-l sm:border-t-0 sm:px-3">
          <p className="text-[11px] text-ink-soft">已确认 / 已支付</p>
          <p className="mt-1 text-lg font-semibold text-ink">{money(committed)} <span className="text-xs font-normal text-ink-soft">/ {money(paid)}</span></p>
        </div>
        <div className="border-l border-t border-line/70 px-3 py-4 sm:border-t-0">
          <p className="text-[11px] text-ink-soft">预算余额</p>
          <p className={`mt-1 text-lg font-semibold ${remaining < 0 ? "text-red-500" : "text-emerald-600"}`}>{money(remaining)}</p>
        </div>
      </div>

      {(remaining < 0 || committed > paid) && (
        <div className={`mb-6 flex items-start gap-3 border-l-2 px-4 py-3 text-xs leading-5 ${remaining < 0 ? "border-red-500 bg-red-500/5 text-red-600" : "border-amber-500 bg-amber-500/5 text-amber-700"}`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{remaining < 0 ? `预计成本已超出预算 ${money(Math.abs(remaining))}，请调整费用或补充预算。` : `还有 ${money(committed - paid)} 已确认费用尚未支付，请核对付款节点与发票。`}</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={saveCost} className="mb-7 grid grid-cols-1 gap-3 border-b border-line pb-7 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="cost-title">费用名称</label>
            <input id="cost-title" required value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="例如：摄影棚半天" className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="cost-amount">金额</label>
            <input id="cost-amount" required type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm((value) => ({ ...value, amount: event.target.value }))} placeholder="0.00" className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="cost-category">分类</label>
            <select id="cost-category" value={form.category} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))} className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none">
              {categoryOptions.map((category) => <option key={category}>{category}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="cost-status">状态</label>
            <select id="cost-status" value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as CostStatus }))} className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none">
              {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="cost-date">日期</label>
            <input id="cost-date" type="date" value={form.date} onChange={(event) => setForm((value) => ({ ...value, date: event.target.value }))} className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="cost-vendor">供应方 / 收款人</label>
            <input id="cost-vendor" value={form.vendor} onChange={(event) => setForm((value) => ({ ...value, vendor: event.target.value }))} placeholder="可选" className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="mb-1.5 block text-xs text-ink-soft" htmlFor="cost-note">备注</label>
            <input id="cost-note" value={form.note} onChange={(event) => setForm((value) => ({ ...value, note: event.target.value }))} placeholder="报价范围、付款节点或发票信息" className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none" />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-4">
            <button type="button" onClick={resetForm} className="h-9 rounded-md border border-line px-4 text-xs text-ink-soft">取消</button>
            <button type="submit" disabled={pending} className="h-9 rounded-md bg-accent px-4 text-xs font-medium text-white disabled:opacity-50">{pending ? "保存中…" : editingId ? "保存费用" : "加入台账"}</button>
          </div>
        </form>
      )}

      {sorted.length > 0 ? (
        <div className="divide-y divide-line/70 border-y border-line/70">
          {sorted.map((item) => (
            <div key={item.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_110px_130px_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-paper-soft px-2 py-0.5 text-[10px] text-ink-soft">{item.category}</span>
                  <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                </div>
                <p className="mt-1 text-xs text-ink-soft">{[item.vendor, item.date, item.note].filter(Boolean).join(" · ") || "暂无补充信息"}</p>
              </div>
              <p className="text-sm font-semibold text-ink sm:text-right">{money(item.amount)}</p>
              <select value={item.status} onChange={(event) => updateStatus(item, event.target.value as CostStatus)} aria-label={`${item.title}的状态`} className="h-8 rounded border border-line bg-paper px-2 text-xs text-ink focus:border-accent focus:outline-none">
                {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <div className="flex gap-1">
                <button type="button" onClick={() => editCost(item)} title="编辑" aria-label="编辑费用" className="flex h-8 w-8 items-center justify-center rounded text-ink-soft hover:bg-paper-soft hover:text-ink"><Edit3 className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => removeCost(item)} title="删除" aria-label="删除费用" className="flex h-8 w-8 items-center justify-center rounded text-ink-soft hover:bg-red-500/10 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-y border-dashed border-line py-12 text-center">
          <WalletCards className="mx-auto h-5 w-5 text-ink-soft" aria-hidden="true" />
          <p className="mt-3 text-sm text-ink">还没有成本记录</p>
          <p className="mt-1 text-xs text-ink-soft">先设置预算，再登记场地、人员、设备和投流费用。</p>
        </div>
      )}
    </section>
  );
}
