"use client";

import { AlertTriangle, Check, MinusCircle, XCircle } from "lucide-react";
import type { ChecklistStatus } from "@/app/generated/prisma/client";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  ChecklistStatus,
  {
    label: string;
    icon: React.ElementType;
    className: string;
    description: string;
  }
> = {
  OK: {
    label: "OK",
    icon: Check,
    className:
      "bg-[var(--status-ok)] text-[var(--status-ok-foreground)] hover:bg-[var(--status-ok)]/90 active:scale-95",
    description: "Passes inspection",
  },
  BOR_UTBEDRES: {
    label: "Should Fix",
    icon: AlertTriangle,
    className:
      "bg-[var(--status-should-fix)] text-[var(--status-should-fix-foreground)] hover:bg-[var(--status-should-fix)]/90 active:scale-95",
    description: "Needs attention soon",
  },
  MA_UTBEDRES: {
    label: "Must Fix",
    icon: XCircle,
    className:
      "bg-[var(--status-must-fix)] text-[var(--status-must-fix-foreground)] hover:bg-[var(--status-must-fix)]/90 active:scale-95",
    description: "Critical issue",
  },
  IKKE_AKTUELT: {
    label: "N/A",
    icon: MinusCircle,
    className:
      "bg-[var(--status-na)] text-[var(--status-na-foreground)] hover:bg-[var(--status-na)]/90 active:scale-95",
    description: "Not applicable",
  },
};

interface StatusButtonProps {
  status: ChecklistStatus;
  isSelected?: boolean;
  isCompact?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function StatusButton({
  status,
  isSelected,
  isCompact = false,
  onClick,
  disabled = false,
}: StatusButtonProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Base styles - large touch target
        "relative flex flex-col items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200",
        // Size - minimum 64px for gloved operation
        isCompact ? "h-14 px-4" : "h-20 min-w-[100px] flex-1 px-6",
        // Status-specific colors
        config.className,
        // Selected state
        isSelected &&
          "ring-4 ring-white/50 ring-offset-2 ring-offset-background",
        // Disabled state
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <Icon
        className={cn("shrink-0", isCompact ? "size-5" : "size-7")}
        strokeWidth={2.5}
      />
      <span className={cn("tracking-wide", isCompact ? "text-xs" : "text-sm")}>
        {config.label}
      </span>
    </button>
  );
}

// Row of all primary status buttons (OK, Should Fix, Must Fix)
interface StatusButtonRowProps {
  selectedStatus?: ChecklistStatus;
  onSelect: (status: ChecklistStatus) => void;
  disabled?: boolean;
}

export function StatusButtonRow({
  selectedStatus,
  onSelect,
  disabled = false,
}: StatusButtonRowProps) {
  const primaryStatuses: ChecklistStatus[] = [
    "OK",
    "BOR_UTBEDRES",
    "MA_UTBEDRES",
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Primary status row */}
      <div className="flex gap-3">
        {primaryStatuses.map((status) => (
          <StatusButton
            key={status}
            status={status}
            isSelected={selectedStatus === status}
            onClick={() => onSelect(status)}
            disabled={disabled}
          />
        ))}
      </div>
      {/* N/A as secondary option */}
      <StatusButton
        status="IKKE_AKTUELT"
        isSelected={selectedStatus === "IKKE_AKTUELT"}
        isCompact
        onClick={() => onSelect("IKKE_AKTUELT")}
        disabled={disabled}
      />
    </div>
  );
}

export { statusConfig };
