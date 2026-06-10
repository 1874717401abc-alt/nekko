"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname?.startsWith("/login");

  return (
    <>
      <Sidebar />
      <main className={`flex-1 min-h-screen ${isLogin ? "" : "md:ml-64"}`}>{children}</main>
    </>
  );
}
