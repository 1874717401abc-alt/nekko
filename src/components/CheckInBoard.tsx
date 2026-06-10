"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HoverCard, StaggerContainer, StaggerItem } from "@/components/motion";
import type { CheckIn, TeamMember } from "@/lib/types";

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

async function persist(checkins: CheckIn[]) {
  await fetch("/api/data/checkins", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkins),
  });
}

export default function CheckInBoard({
  members,
  initialCheckins,
}: {
  members: TeamMember[];
  initialCheckins: CheckIn[];
}) {
  const [checkins, setCheckins] = useState<CheckIn[]>(initialCheckins);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const today = todayKey();

  async function handleCheckIn(member: string) {
    const newEntry: CheckIn = {
      id: `checkin-${crypto.randomUUID()}`,
      member,
      date: today,
      time: new Date().toISOString(),
      note: notes[member]?.trim() || undefined,
    };
    const next = [...checkins, newEntry];
    setCheckins(next);
    setNotes((n) => ({ ...n, [member]: "" }));
    await persist(next);
  }

  async function handleUndo(id: string) {
    const next = checkins.filter((c) => c.id !== id);
    setCheckins(next);
    await persist(next);
  }

  // history grouped by date, most recent first
  const dateKeys = Array.from(new Set(checkins.map((c) => c.date))).sort((a, b) =>
    a < b ? 1 : -1
  );

  return (
    <div>
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
        {members.map((member) => {
          const todays = checkins.filter(
            (c) => c.member === member.name && c.date === today
          );
          const checkedIn = todays.length > 0;

          return (
            <StaggerItem key={member.id}>
              <HoverCard className="rounded-2xl border border-line/70 bg-card p-6 h-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-serif-display text-2xl text-ink">{member.name}</h3>
                    <p className="text-xs text-ink-soft mt-0.5">{member.role}</p>
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
                              className="text-xs text-ink-soft hover:text-accent"
                            >
                              撤销
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2">
                  <input
                    value={notes[member.name] ?? ""}
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [member.name]: e.target.value }))
                    }
                    placeholder="今天打算做什么？（可选）"
                    className="flex-1 rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCheckIn(member.name)}
                    className="text-sm px-5 py-2.5 rounded-full bg-accent text-paper hover:bg-accent/90 transition-colors shrink-0"
                  >
                    打卡
                  </motion.button>
                </div>
              </HoverCard>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

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
                        {c.member} · {formatTime(c.time)}
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
