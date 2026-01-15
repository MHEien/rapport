"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "rapport_offline_queue";

type QueuedMutation = {
  id: string;
  timestamp: number;
  action: string;
  payload: unknown;
  status: "pending" | "syncing" | "failed";
};

// Load queued mutations from localStorage
function loadQueue(): QueuedMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save queue to localStorage
function saveQueue(queue: QueuedMutation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Failed to save offline queue:", error);
  }
}

export type SyncStatus = "synced" | "pending" | "offline";

export function useOfflineMutation<TData, TPayload>(
  mutationFn: (payload: TPayload) => Promise<TData>,
  options?: {
    actionName?: string;
    onSuccess?: (data: TData, payload: TPayload) => void;
    onError?: (error: Error, payload: TPayload) => void;
    onOptimisticUpdate?: (payload: TPayload) => void;
  },
) {
  const [queue, setQueue] = useState<QueuedMutation[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [isOnline, setIsOnline] = useState(true);

  // Load queue on mount
  useEffect(() => {
    setQueue(loadQueue());
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when back online
      processQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [
    // Trigger sync when back online
    processQueue,
  ]);

  // Update status based on queue
  useEffect(() => {
    if (!isOnline) {
      setSyncStatus("offline");
    } else if (
      queue.some((m) => m.status === "pending" || m.status === "failed")
    ) {
      setSyncStatus("pending");
    } else {
      setSyncStatus("synced");
    }
  }, [queue, isOnline]);

  // Process queued mutations
  const processQueue = useCallback(async () => {
    const currentQueue = loadQueue();
    const pendingMutations = currentQueue.filter(
      (m) => m.status === "pending" || m.status === "failed",
    );

    for (const mutation of pendingMutations) {
      try {
        await mutationFn(mutation.payload as TPayload);
        // Remove from queue on success
        const updatedQueue = currentQueue.filter((m) => m.id !== mutation.id);
        saveQueue(updatedQueue);
        setQueue(updatedQueue);
      } catch (_error) {
        // Mark as failed but keep in queue
        const updatedQueue = currentQueue.map((m) =>
          m.id === mutation.id ? { ...m, status: "failed" as const } : m,
        );
        saveQueue(updatedQueue);
        setQueue(updatedQueue);
      }
    }
  }, [mutationFn]);

  // Main mutation
  const mutation = useMutation({
    mutationFn: async (payload: TPayload) => {
      // Apply optimistic update immediately
      options?.onOptimisticUpdate?.(payload);

      if (!navigator.onLine) {
        // Queue for later
        const queuedMutation: QueuedMutation = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          action: options?.actionName || "unknown",
          payload,
          status: "pending",
        };

        const newQueue = [...queue, queuedMutation];
        saveQueue(newQueue);
        setQueue(newQueue);
        setSyncStatus("pending");

        // Return a placeholder - the actual sync will happen later
        throw new Error("OFFLINE_QUEUED");
      }

      return mutationFn(payload);
    },
    onSuccess: (data, payload) => {
      setSyncStatus("synced");
      options?.onSuccess?.(data, payload);
    },
    onError: (error, payload) => {
      if ((error as Error).message === "OFFLINE_QUEUED") {
        // This is expected for offline mutations
        return;
      }
      options?.onError?.(error as Error, payload);
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError && mutation.error?.message !== "OFFLINE_QUEUED",
    error: mutation.error?.message === "OFFLINE_QUEUED" ? null : mutation.error,
    syncStatus,
    queuedCount: queue.filter((m) => m.status === "pending").length,
    processQueue,
    isOnline,
  };
}
