import type { AutomationRule } from "@/lib/types";

export function nextAutomationRun(rule: Pick<AutomationRule, "cadence" | "time" | "weekday">, from = new Date()) {
  const [hours, minutes] = rule.time.split(":").map(Number);
  const next = new Date(from);
  next.setSeconds(0, 0);
  next.setHours(hours, minutes, 0, 0);
  if (rule.cadence === "daily") {
    if (next <= from) next.setDate(next.getDate() + 1);
  } else {
    const target = rule.weekday ?? 1;
    let days = (target - next.getDay() + 7) % 7;
    if (days === 0 && next <= from) days = 7;
    next.setDate(next.getDate() + days);
  }
  return next.toISOString();
}
