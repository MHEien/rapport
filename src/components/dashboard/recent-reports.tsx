"use client";

import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  CloudOff,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ReportStatus = "DRAFT" | "SYNCED" | "COMPLETED" | "ARCHIVED";

interface Equipment {
  id: string;
  productName: string;
  productType: string;
}

interface Report {
  id: string;
  customerName: string;
  status: ReportStatus;
  updatedAt: Date;
  equipment: Equipment[];
  _count: { equipment: number };
}

interface RecentReportsProps {
  reports: Report[];
}

const statusConfig: Record<
  ReportStatus,
  { label: string; icon: typeof FileText; className: string }
> = {
  DRAFT: {
    label: "Utkast",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  SYNCED: {
    label: "Synkronisert",
    icon: CloudOff,
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  COMPLETED: {
    label: "Fullført",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  ARCHIVED: {
    label: "Arkivert",
    icon: FileText,
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
};

export function RecentReports({ reports }: RecentReportsProps) {
  if (reports.length === 0) {
    return (
      <section className="px-6 py-8">
        <h2 className="text-lg font-semibold text-white mb-4">
          Nylige rapporter
        </h2>
        <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center">
          <FileText className="size-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">Ingen rapporter ennå</p>
          <p className="text-sm text-slate-500">
            Trykk på "Ny Rapport" for å komme i gang
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Nylige rapporter</h2>
        <Link
          href="/reports"
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          Se alle
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="rounded-2xl border border-white/5 overflow-hidden bg-white/[0.02]">
        {reports.map((report, index) => {
          const config = statusConfig[report.status];
          const StatusIcon = config.icon;
          const timeAgo = formatDistanceToNow(new Date(report.updatedAt), {
            addSuffix: true,
            locale: nb,
          });
          const equipmentName = report.equipment[0]?.productName ?? "Ingen utstyr";
          const equipmentCount = report._count.equipment;

          return (
            <Link
              key={report.id}
              href={
                report.status === "DRAFT"
                  ? `/reports/${report.id}/edit`
                  : `/reports/${report.id}`
              }
              className={cn(
                "flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group",
                index !== reports.length - 1 && "border-b border-white/5",
              )}
            >
              {/* Icon */}
              <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 flex items-center justify-center shrink-0">
                <FileText className="size-5 text-blue-400" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                  {report.customerName}
                </p>
                <p className="text-sm text-slate-400 truncate">
                  {equipmentName}{equipmentCount > 1 && ` +${equipmentCount - 1}`}
                </p>
              </div>

              {/* Meta */}
              <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                <Badge
                  variant="outline"
                  className={cn("gap-1", config.className)}
                >
                  <StatusIcon className="size-3" />
                  {config.label}
                </Badge>
                <span className="text-xs text-slate-500">{timeAgo}</span>
              </div>

              {/* Mobile: just show chevron */}
              <ChevronRight className="size-5 text-slate-500 sm:hidden" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
