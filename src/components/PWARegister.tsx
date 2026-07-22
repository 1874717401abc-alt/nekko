"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function PWARegister() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const updateNetworkState = () => setOnline(navigator.onLine);
    updateNetworkState();
    window.addEventListener("online", updateNetworkState);
    window.addEventListener("offline", updateNetworkState);

    const local = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!(window.isSecureContext || local) || !("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener("online", updateNetworkState);
        window.removeEventListener("offline", updateNetworkState);
      };
    }

    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;
    const handleControllerChange = () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    let registration: ServiceWorkerRegistration | undefined;
    const checkForUpdate = () => registration?.update().catch(() => undefined);
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then((value) => {
        registration = value;
        if (document.visibilityState === "visible") checkForUpdate();
      })
      .catch(() => undefined);
    document.addEventListener("visibilitychange", checkForUpdate);

    return () => {
      window.removeEventListener("online", updateNetworkState);
      window.removeEventListener("offline", updateNetworkState);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      document.removeEventListener("visibilitychange", checkForUpdate);
    };
  }, []);

  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-[70] flex h-9 items-center justify-center gap-2 bg-amber-500 px-4 text-xs font-medium text-zinc-950 shadow-sm">
      <WifiOff className="h-3.5 w-3.5" />当前离线，重新联网后会自动恢复
    </div>
  );
}
