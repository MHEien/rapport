"use client";

import { format, formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudOff,
  Copy,
  Eye,
  FileText,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ReportStatus } from "@/app/generated/prisma/client";
import { AssignmentDialog } from "@/components/report/assignment-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { deleteReport, duplicateReport } from "@/lib/actions/reports-actions";
import { cn } from "@/lib/utils";

// Types
interface Equipment {
  id: string;
  productName: string;
  productType: string;
}

interface Report {
  id: string;
  reportNumber: number;
  customerName: string;
  status: ReportStatus;
  serviceDate: Date;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: { id: string; name: string | null } | null;
  equipment: Equipment[];
  _count: { equipment: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ReportsClientProps {
  initialReports: Report[];
  initialPagination: Pagination;
}

// Status config
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
    icon: Archive,
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
};

const statusFilters: { value: ReportStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Alle" },
  { value: "DRAFT", label: "Utkast" },
  { value: "SYNCED", label: "Synkronisert" },
  { value: "COMPLETED", label: "Fullført" },
  { value: "ARCHIVED", label: "Arkivert" },
];


export function ReportsClient({
  initialReports,
  initialPagination,
}: ReportsClientProps) {
  const router = useRouter();
  const [_isPending, startTransition] = useTransition();
  
  // State
  const [reports, setReports] = useState(initialReports);
  const [pagination, setPagination] = useState(initialPagination);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "ALL">("ALL");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  
  // Assignment State
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [reportToAssign, setReportToAssign] = useState<string | null>(null);
  const [currentAssigneeId, setCurrentAssigneeId] = useState<string | null>(null);

  // Handlers
  const handleSearch = (value: string) => {
    setSearch(value);
    startTransition(() => {
      const params = new URLSearchParams();
      if (value) params.set("search", value);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      router.push(`/reports?${params.toString()}`);
    });
  };

  const handleStatusFilter = (status: ReportStatus | "ALL") => {
    setStatusFilter(status);
    startTransition(() => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status !== "ALL") params.set("status", status);
      router.push(`/reports?${params.toString()}`);
    });
  };

  const handleDelete = async () => {
    if (!reportToDelete) return;

    const result = await deleteReport(reportToDelete);
    if (result.success) {
      setReports(reports.filter((r) => r.id !== reportToDelete));
      setPagination((p) => ({ ...p, total: p.total - 1 }));
    }
    setDeleteDialogOpen(false);
    setReportToDelete(null);
  };

  const handleDuplicate = async (reportId: string) => {
    const result = await duplicateReport(reportId);
    if (result.success && result.report) {
      router.push(`/reports/${result.report.id}/edit`);
    }
  };

  const handleAssign = (reportId: string, assigneeId?: string) => {
    setReportToAssign(reportId);
    setCurrentAssigneeId(assigneeId || null);
    setAssignmentDialogOpen(true);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur border-b border-white/5">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white">Rapporter</h1>
              <p className="text-sm text-slate-400">
                {pagination.total}{" "}
                {pagination.total === 1 ? "rapport" : "rapporter"}
              </p>
            </div>
            <Button
              asChild
              className="bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20"
            >
              <Link href="/reports/new">
                <Plus className="size-4 mr-2" />
                Ny rapport
              </Link>
            </Button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Søk etter kunde, produkt eller serienummer..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-11 bg-white/5 border-white/10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              {statusFilters.map((filter) => (
                <Button
                  key={filter.value}
                  onClick={() => handleStatusFilter(filter.value)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    statusFilter === filter.value
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10",
                  )}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Reports List */}
      <main className="px-4 lg:px-6 py-6">
        {reports.length === 0 ? (
          // ... existing empty state ...
           <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
            {/* ... same content ... */}
             <FileText className="size-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {search || statusFilter !== "ALL"
                ? "Ingen resultater"
                : "Ingen rapporter ennå"}
            </h3>
            <p className="text-slate-400 mb-6">
              {search || statusFilter !== "ALL"
                ? "Prøv å endre søket eller filteret"
                : "Opprett din første rapport for å komme i gang"}
            </p>
            {!search && statusFilter === "ALL" && (
              <Button asChild>
                <Link href="/reports/new">
                  <Plus className="size-4 mr-2" />
                  Opprett rapport
                </Link>
              </Button>
            )}
           </div>
        ) : (
          <div className="rounded-2xl border border-white/5 overflow-hidden bg-white/[0.02]">
            {/* Table header - hidden on mobile */}
            <div className="hidden lg:grid lg:grid-cols-[1fr,1fr,120px,120px,100px,48px] gap-4 px-4 py-3 bg-white/5 border-b border-white/5 text-sm text-slate-400 font-medium">
              <div>Kunde</div>
              <div>Produkt</div>
              <div>Dato</div>
              <div>Sjekkliste</div>
              <div>Status</div>
              <div></div>
            </div>

            {/* Report rows */}
            {reports.map((report, index) => {
              const config = statusConfig[report.status];
              const StatusIcon = config.icon;

              return (
                <div
                  key={report.id}
                  className={cn(
                    "group",
                    index !== reports.length - 1 && "border-b border-white/5",
                  )}
                >
                  {/* Desktop row */}
                  <div className="hidden lg:grid lg:grid-cols-[1fr,1fr,120px,120px,100px,48px] gap-4 px-4 py-4 items-center hover:bg-white/5 transition-colors">
                    <Link
                      href={
                        report.status === "DRAFT"
                          ? `/reports/${report.id}/edit`
                          : `/reports/${report.id}`
                      }
                      className="cursor-pointer block"
                    >
                      <p className="font-medium text-white">
                        {report.customerName}
                      </p>
                      <p className="text-sm text-slate-400">
                        #{report.reportNumber}
                      </p>
                    </Link>
                    <div>
                      <p className="text-white">
                        {report.equipment[0]?.productName ?? "—"}
                        {report._count.equipment > 1 && (
                          <span className="text-slate-400 ml-1">
                            +{report._count.equipment - 1}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-slate-400">
                        {report.equipment[0]?.productType ?? "—"}
                      </p>
                    </div>
                    <div className="text-sm text-slate-400">
                      {format(new Date(report.serviceDate), "d. MMM yyyy", {
                        locale: nb,
                      })}
                    </div>
                    <div className="text-sm text-slate-400">
                      {report._count.equipment} utstyr
                    </div>
                    <div>
                      <Badge
                        variant="outline"
                        className={cn("gap-1", config.className)}
                      >
                        <StatusIcon className="size-3" />
                        {config.label}
                      </Badge>
                       {/* Show assignee if exists */}
                       {report.assignedTo && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <span className="size-4 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-[10px]">
                                {report.assignedTo.name?.substring(0, 1) || "?"}
                            </span>
                            <span className="truncate max-w-[80px]">{report.assignedTo.name?.split(" ")[0]}</span>
                        </div>
                       )}
                    </div>
                    <div>
                      <ReportActions
                        onView={() => router.push(`/reports/${report.id}`)}
                        onEdit={() => router.push(`/reports/${report.id}/edit`)}
                        onDuplicate={() => handleDuplicate(report.id)}
                        onDelete={() => {
                            setReportToDelete(report.id);
                            setDeleteDialogOpen(true);
                        }}
                        onAssign={() => handleAssign(report.id, report.assignedTo?.id)}
                      />
                    </div>
                  </div>

                  {/* Mobile row */}
                  <Link
                    href={
                      report.status === "DRAFT"
                        ? `/reports/${report.id}/edit`
                        : `/reports/${report.id}`
                    }
                    className="flex lg:hidden items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                   {/* ... existing mobile row content ... */}
                    <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 flex items-center justify-center shrink-0">
                      <FileText className="size-6 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {report.customerName}
                      </p>
                      <p className="text-sm text-slate-400 truncate">
                        {report.equipment[0]?.productName ?? "Ingen utstyr"}
                        {report._count.equipment > 1 &&
                          ` +${report._count.equipment - 1}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={cn("text-xs gap-1", config.className)}
                        >
                          <StatusIcon className="size-2.5" />
                          {config.label}
                        </Badge>
                         {/* Show assignee mobile */}
                        {report.assignedTo && (
                           <span className="text-xs text-slate-500 flex items-center gap-1">
                              • {report.assignedTo.name?.split(" ")[0]}
                           </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(report.updatedAt), {
                            addSuffix: true,
                            locale: nb,
                          })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="size-5 text-slate-500" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-slate-400">
              Viser {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              av {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => {
                  const params = new URLSearchParams();
                  if (search) params.set("search", search);
                  if (statusFilter !== "ALL")
                    params.set("status", statusFilter);
                  params.set("page", String(pagination.page - 1));
                  router.push(`/reports?${params.toString()}`);
                }}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => {
                  const params = new URLSearchParams();
                  if (search) params.set("search", search);
                  if (statusFilter !== "ALL")
                    params.set("status", statusFilter);
                  params.set("page", String(pagination.page + 1));
                  router.push(`/reports?${params.toString()}`);
                }}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Assignment Dialog */}
      <AssignmentDialog 
        open={assignmentDialogOpen} 
        onOpenChange={setAssignmentDialogOpen}
        reportId={reportToAssign}
        currentAssigneeId={currentAssigneeId}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Slett rapport?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette denne rapporten? Denne handlingen
              kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10">
              Avbryt
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Report actions dropdown
function ReportActions({
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onAssign,
}: {
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAssign: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-slate-900 border-white/10">
        <DropdownMenuItem onClick={onAssign} className="gap-2">
          <UserIcon className="size-4" />
          Tildel tekniker
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onView} className="gap-2">
          {/* We need to import Eye icon if not imported, but it is imported at top */}
          <Eye className="size-4" />
          Vis rapport
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit} className="gap-2">
          <Pencil className="size-4" />
          Rediger
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate} className="gap-2">
          <Copy className="size-4" />
          Dupliser
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onClick={onDelete}
          className="gap-2 text-red-400 focus:text-red-400"
        >
          <Trash2 className="size-4" />
          Slett
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
