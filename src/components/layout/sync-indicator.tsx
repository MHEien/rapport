"use client";

import { Cloud, CloudOff, Loader2, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type SyncState = "synced" | "syncing" | "pending" | "offline";

export function SyncIndicator() {
  const [syncState, setSyncState] = useState<SyncState>("synced");
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setSyncState("syncing");
      // Simulate sync completion
      setTimeout(() => setSyncState("synced"), 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncState("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check localStorage for pending mutations
    const checkPending = () => {
      try {
        const queue = localStorage.getItem("rapport_offline_queue");
        if (queue) {
          const items = JSON.parse(queue);
          const pending = items.filter(
            (i: { status: string }) => i.status === "pending",
          );
          setPendingCount(pending.length);
          if (pending.length > 0 && isOnline) {
            setSyncState("pending");
          }
        }
      } catch {
        // Ignore errors
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  const config = {
    synced: {
      icon: Cloud,
      label: "Synkronisert",
      className: "text-emerald-400 bg-emerald-500/10",
    },
    syncing: {
      icon: Loader2,
      label: "Synkroniserer...",
      className: "text-blue-400 bg-blue-500/10",
      animate: true,
    },
    pending: {
      icon: CloudOff,
      label: `${pendingCount} venter`,
      className: "text-amber-400 bg-amber-500/10",
    },
    offline: {
      icon: WifiOff,
      label: "Frakoblet",
      className: "text-rose-400 bg-rose-500/10",
    },
  };

  const {
    icon: Icon,
    label,
    className,
    animate,
  } = config[syncState] as {
    icon: typeof Cloud;
    label: string;
    className: string;
    animate?: boolean;
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all",
        className,
      )}
    >
      <Icon className={cn("size-3.5", animate && "animate-spin")} />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
