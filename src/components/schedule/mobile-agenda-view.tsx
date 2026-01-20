"use client";

import { format, isSameDay, isToday, isTomorrow } from "date-fns";
import { nb } from "date-fns/locale";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AssignmentCard } from "./assignment-card";

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

interface MobileAgendaViewProps {
  assignments: Assignment[];
  userId: string | null;
  onEdit: (assignment: Assignment) => void;
  onDelete: (id: string) => void;
  onAdd: (date: Date) => void;
}

export function MobileAgendaView({
  assignments,
  userId,
  onEdit,
  onDelete,
  onAdd,
}: MobileAgendaViewProps) {
  // 1. Filter assignments for the current user
  const myAssignments = assignments
    .filter((a) => a.technicianId === userId)
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

  // 2. Group by date
  const grouped = myAssignments.reduce(
    (acc, assignment) => {
      const dateKey = format(new Date(assignment.startTime), "yyyy-MM-dd");
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(assignment);
      return acc;
    },
    {} as Record<string, Assignment[]>,
  );

  // Get all unique dates from assignments, plus today if not present
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const sortedDates = Object.keys(grouped).sort();

  // If no assignments at all, show friendly state
  if (myAssignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <div className="bg-muted p-4 rounded-full">
          <Plus className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-lg">Ingen oppdrag</h3>
          <p className="text-muted-foreground max-w-[250px]">
            Det ser ikke ut til at du har noen oppdrag denne uken.
          </p>
        </div>
        <Button onClick={() => onAdd(new Date())}>
          <Plus className="size-4 mr-2" />
          Registrer oppdrag
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Today's Action Button (Floating or Top) */}
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border">
        <div>
          <h3 className="font-medium">Jobber du nå?</h3>
          <p className="text-xs text-muted-foreground">
            Registrer nytt oppdrag raskt
          </p>
        </div>
        <Button size="sm" onClick={() => onAdd(new Date())}>
          <Plus className="size-4 mr-2" />
          Nytt oppdrag
        </Button>
      </div>

      {sortedDates.map((dateStr) => {
        const date = new Date(dateStr);
        const dailyAssignments = grouped[dateStr];

        let title = format(date, "EEEE d. MMMM", { locale: nb });
        if (isToday(date)) title = "I dag";
        if (isTomorrow(date)) title = "I morgen";

        return (
          <div key={dateStr} className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  isToday(date) ? "bg-blue-500" : "bg-muted-foreground/30",
                )}
              />
              {title}
            </h3>
            <div className="grid gap-3">
              {dailyAssignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  canEdit={true}
                  onEdit={() => onEdit(assignment)}
                  onDelete={() => onDelete(assignment.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
