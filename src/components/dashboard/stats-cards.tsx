"use client";

import { CheckCircle2, Clock, CloudOff, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  stats: {
    today: number;
    pending: number;
    thisWeek: number;
    pendingSync: number;
  };
}

const cardConfigs = [
  {
    key: "today" as const,
    label: "I dag",
    icon: FileText,
    gradient: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
    borderColor: "border-blue-500/20",
  },
  {
    key: "pending" as const,
    label: "Påbegynt",
    icon: Clock,
    gradient: "from-amber-500/20 to-amber-600/10",
    iconColor: "text-amber-400",
    borderColor: "border-amber-500/20",
  },
  {
    key: "thisWeek" as const,
    label: "Denne uken",
    icon: CheckCircle2,
    gradient: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/20",
  },
  {
    key: "pendingSync" as const,
    label: "Venter på sync",
    icon: CloudOff,
    gradient: "from-rose-500/20 to-rose-600/10",
    iconColor: "text-rose-400",
    borderColor: "border-rose-500/20",
  },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6">
      {cardConfigs.map((config) => {
        const Icon = config.icon;
        const value = stats[config.key];

        return (
          <div
            key={config.key}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-4 lg:p-6",
              "bg-gradient-to-br backdrop-blur-sm",
              config.gradient,
              config.borderColor,
            )}
          >
            {/* Background glow */}
            <div className="absolute -top-12 -right-12 size-24 rounded-full bg-white/5 blur-2xl" />

            <div className="relative">
              {/* Icon */}
              <div
                className={cn(
                  "inline-flex p-2 rounded-xl bg-white/5 mb-3",
                  config.iconColor,
                )}
              >
                <Icon className="size-5" />
              </div>

              {/* Value */}
              <p className="text-3xl lg:text-4xl font-bold text-white mb-1">
                {value}
              </p>

              {/* Label */}
              <p className="text-sm text-slate-400">{config.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
