"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HoverCard } from "@/components/motion";
import { createItem, deleteItem } from "@/lib/clientData";
import type { CheckIn, User } from "@/lib/types";

const easeOut = [0.22, 1, 0.36, 1] as const;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateLabel(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export default function CheckInBoard({
  currentUser,
  initialCheckins,
}: {
  currentUser: Pick<User, "id" | "displayName" | "role">;
  initialCheckins: CheckIn[];
}) {
  const [checkins, setCheckins] = useState<CheckIn[]>(initialCheckins);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = todayKey();

  const todays = checkins.filter((c) => c.userId === currentUser.id && c.date === today);
  const checkedIn = todays.length > 0;

  async function handleCheckIn() {
    setSaving(true);
    setError(null);
    try {
      const newEntry = await createItem<CheckIn>("checkins", { note });
      setCheckins((current) => [...current, newEntry]);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "打卡失败，请重试。");
    } finally {
      setSaving(false);
    }
  }

  async function handleUndo(id: string) {
    setPendingId(id);
    setError(null);
    try {
      await deleteItem("checkins", id);
      setCheckins((current) => current.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "撤销失败，请重试。");
    } finally {
      setPendingId(null);
    }
  }

  // history grouped by date, most recent first
  const dateKeys = Array.from(new Set(checkins.map((c) => c.date))).sort((a, b) =>
    a < b ? 1 : -1
  );

  return (
    <div>
      <div className="mb-16">
        <HoverCard className="rounded-2xl border border-line/70 bg-card p-6 max-w-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif-display text-2xl text-ink">{currentUser.displayName}</h3>
              {currentUser.role && <p className="text-xs text-ink-soft mt-0.5">{currentUser.role}</p>}
            </div>
            <motion.span
              key={checkedIn ? "in" : "out"}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: easeOut }}
              className={`text-[11px] px-3 py-1 rounded-full ${
                checkedIn ? "bg-accent/10 text-accent" : "bg-paper-soft text-ink-soft"
              }`}
            >
              {checkedIn ? "今日已打卡" : "今日未打卡"}
            </motion.span>
          </div>

          <AnimatePresence initial={false}>
            {todays.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: easeOut }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-2 mb-4">
                  {todays.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl bg-paper-soft px-4 py-2.5"
                    >
                      <div>
                        <span className="text-sm text-ink font-medium">
                          {formatTime(c.time)}
                        </span>
                        {c.note && (
                          <span className="ml-2 text-xs text-ink-soft">{c.note}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleUndo(c.id)}
                        disabled={pendingId === c.id}
                        className="text-xs text-ink-soft hover:text-accent disabled:opacity-40"
                      >
                        {pendingId === c.id ? "处理中" : "撤销"}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="今天打算做什么？（可选）"
              className="flex-1 rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCheckIn}
              disabled={saving}
              className="text-sm px-5 py-2.5 rounded-full bg-accent text-paper hover:bg-accent/90 transition-colors shrink-0 disabled:opacity-50"
            >
              {saving ? "打卡中…" : "打卡"}
            </motion.button>
          </div>
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </HoverCard>
      </div>

      <section>
        <h2 className="font-serif-display text-2xl text-ink mb-4">打卡记录</h2>
        <div className="flex flex-col">
          <AnimatePresence initial={false}>
            {dateKeys.slice(0, 14).map((dateKey) => {
              const entries = checkins
                .filter((c) => c.date === dateKey)
                .sort((a, b) => +new Date(a.time) - +new Date(b.time));
              return (
                <motion.div
                  key={dateKey}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: easeOut }}
                  className="border-b border-line/70 px-1 py-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-ink">{formatDateLabel(dateKey)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entries.map((c) => (
                      <span
                        key={c.id}
                        className="text-[11px] px-3 py-1 rounded-full bg-paper-soft text-ink-soft"
                      >
                        {c.memberName} · {formatTime(c.time)}
                        {c.note ? ` · ${c.note}` : ""}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {dateKeys.length === 0 && (
            <p className="text-sm text-ink-soft">还没有打卡记录，今天先打一个吧。</p>
          )}
        </div>
      </section>
    </div>
  );
}
