"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register");

  return (
    <>
      <Sidebar />
      <main
        className={`min-h-dvh min-w-0 flex-1 ${isAuthPage ? "" : "pb-[calc(5rem+env(safe-area-inset-bottom))] md:ml-60 md:pb-0"}`}
      >
        {children}
      </main>
    </>
  );
}
