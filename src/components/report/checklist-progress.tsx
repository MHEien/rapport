"use client";

import { cn } from "@/lib/utils";

import { Check } from "lucide-react";

interface ChecklistProgressProps {
  total: number;
  current: number;
  completed: number[];
  onNavigate?: (index: number) => void;
}

export function ChecklistProgress({
  total,
  current,
  completed,
  onNavigate,
}: ChecklistProgressProps) {
  // For many items, show a condensed view
  const showDots = total <= 12;

  if (showDots) {
    return (
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, index) => {
          const isCompleted = completed.includes(index);
          const isCurrent = index === current;

          return (
            <button
              key={index}
              type="button"
              onClick={() => onNavigate?.(index)}
              className={cn(
                "size-3 rounded-full transition-all duration-200",
                isCurrent &&
                  "size-4 ring-2 ring-primary ring-offset-1 ring-offset-background",
                isCompleted
                  ? "bg-[var(--status-ok)]"
                  : isCurrent
                    ? "bg-primary"
                    : "bg-muted-foreground/30",
              )}
              aria-label={`Go to item ${index + 1}`}
            />
          );
        })}
      </div>
    );
  }

  // For many items, show text-based progress
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-mono text-lg font-bold text-foreground">
          {current + 1}
        </span>
        <span>/</span>
        <span>{total}</span>
      </div>
      {/* Mini progress bar */}
      <div className="h-2 flex-1 max-w-32 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-[var(--status-ok)] transition-all duration-300"
          style={{ width: `${(completed.length / total) * 100}%` }}
        />
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="size-3.5 text-[var(--status-ok)]" />
        <span>{completed.length}</span>
      </div>
    </div>
  );
}
