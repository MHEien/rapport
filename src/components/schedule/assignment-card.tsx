"use client";

import { format } from "date-fns";
import {
  Clock,
  FileText,
  FolderKanban,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Assignment {
  id: string;
  referenceType: "SERVICE_ORDER" | "PROJECT";
  serviceOrderNumber: string | null;
  title: string;
  startTime: Date | string;
  endTime: Date | string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETE" | "CANCELLED";
  notes: string | null;
  technicianId: string;
  project?: {
    id: string;
    projectNumber: string;
    name: string;
  } | null;
}

interface AssignmentCardProps {
  assignment: Assignment;
  onEdit?: () => void;
  onDelete: () => void;
  canEdit: boolean;
}

const statusConfig = {
  SCHEDULED: {
    label: "Planlagt",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  IN_PROGRESS: {
    label: "Pågår",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  COMPLETE: {
    label: "Fullført",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  CANCELLED: {
    label: "Avlyst",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

export function AssignmentCard({
  assignment,
  onEdit,
  onDelete,
  canEdit,
}: AssignmentCardProps) {
  const startTime = new Date(assignment.startTime);
  const endTime = new Date(assignment.endTime);
  const config = statusConfig[assignment.status];

  // Get display reference
  const isProject = assignment.referenceType === "PROJECT";
  const referenceNumber = isProject
    ? assignment.project?.projectNumber
    : assignment.serviceOrderNumber;

  return (
    <div
      className={cn(
        "p-2 rounded-lg border text-xs group/card",
        "bg-gradient-to-r from-slate-800/50 to-slate-900/50",
        "hover:from-slate-800/70 hover:to-slate-900/70",
        "transition-colors",
        canEdit && "cursor-pointer",
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1 text-muted-foreground">
          {isProject ? (
            <FolderKanban className="size-3" />
          ) : (
            <FileText className="size-3" />
          )}
          <span className="font-mono">{referenceNumber || "—"}</span>
        </div>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="size-5 p-0 opacity-0 group-hover/card:opacity-100"
              >
                <MoreHorizontal className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
              >
                <Pencil className="size-4 mr-2" />
                Rediger
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-red-500 focus:text-red-500"
              >
                <Trash2 className="size-4 mr-2" />
                Slett
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Title */}
      <p className="font-medium text-white mt-1 line-clamp-2">
        {assignment.title}
      </p>

      {/* Time */}
      <div className="flex items-center gap-1 text-muted-foreground mt-1">
        <Clock className="size-3" />
        <span>
          {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
        </span>
      </div>

      {/* Status badge */}
      <Badge
        variant="outline"
        className={cn("mt-2 text-[10px]", config.className)}
      >
        {config.label}
      </Badge>
    </div>
  );
}
