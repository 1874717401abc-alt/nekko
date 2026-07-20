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
        className={`min-h-screen min-w-0 flex-1 ${isAuthPage ? "" : "pb-20 md:ml-60 md:pb-0"}`}
      >
        {children}
      </main>
    </>
  );
}
