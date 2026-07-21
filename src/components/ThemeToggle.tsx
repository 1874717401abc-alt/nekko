"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  return document.documentElement.classList.contains("light");
}

function getServerSnapshot() {
  return true;
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const isLight = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !isLight;
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("theme", next ? "light" : "dark");
    window.dispatchEvent(new Event("storage"));
  }

  return (
    <button
      onClick={toggle}
      aria-label="切换主题"
      className={`flex items-center justify-center rounded-full border border-line text-ink-soft hover:text-accent hover:border-accent/50 transition-colors ${className}`}
    >
      {isLight ? <Moon className="h-[18px] w-[18px]" strokeWidth={1.7} /> : <Sun className="h-[18px] w-[18px]" strokeWidth={1.7} />}
    </button>
  );
}
