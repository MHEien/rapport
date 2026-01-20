"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addDays,
  addWeeks,
  eachDayOfInterval,
  format,
  isSameDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { nb } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getAssignments,
  deleteAssignment,
} from "@/lib/actions/schedule-actions";
import { CreateAssignmentDialog } from "./create-assignment-dialog";
import { AssignmentCard } from "./assignment-card";
import { MobileAgendaView } from "./mobile-agenda-view";

interface ScheduleCalendarProps {
  organizationId: string;
}

type SlotSelection = {
  technicianId: string;
  technicianName: string;
  date: Date;
};

type ExistingAssignment = {
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
};

export function ScheduleCalendar({ organizationId }: ScheduleCalendarProps) {
  const queryClient = useQueryClient();
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [selectedSlot, setSelectedSlot] = useState<SlotSelection | null>(null);
  const [editingAssignment, setEditingAssignment] =
    useState<ExistingAssignment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Calculate week dates
  const weekEnd = addDays(currentWeekStart, 6);
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  // Fetch assignments and technicians
  const { data, isLoading } = useQuery({
    queryKey: ["assignments", currentWeekStart.toISOString()],
    queryFn: () => getAssignments(currentWeekStart, addDays(weekEnd, 1)),
  });

  const assignments = data?.assignments ?? [];
  const technicians = data?.technicians ?? [];
  const currentUserId = data?.currentUserId ?? null;
  const isAdmin = data?.isAdmin ?? false;

  const currentUser = technicians.find((t) => t.id === currentUserId);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Oppdrag slettet");
        queryClient.invalidateQueries({ queryKey: ["assignments"] });
      } else {
        toast.error(result.error);
      }
    },
  });

  // Navigation
  const goToPreviousWeek = () =>
    setCurrentWeekStart((prev) => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeekStart((prev) => addWeeks(prev, 1));
  const goToToday = () =>
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Handle slot click (for creating new assignment)
  const handleSlotClick = (
    technicianId: string,
    technicianName: string,
    date: Date,
  ) => {
    // Non-admins can only add to their own row
    if (!isAdmin && technicianId !== currentUserId) {
      return;
    }
    setSelectedSlot({ technicianId, technicianName, date });
    setEditingAssignment(null);
    setDialogOpen(true);
  };

  // Handle mobile add button
  const handleMobileAdd = (date: Date) => {
    if (currentUserId && currentUser) {
      handleSlotClick(currentUserId, currentUser.name ?? "Meg", date);
    } else {
      toast.error("Fant ikke din brukerprofil");
    }
  };

  // Handle edit assignment
  const handleEditAssignment = (assignment: ExistingAssignment) => {
    setEditingAssignment(assignment);
    setSelectedSlot(null);
    setDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedSlot(null);
    setEditingAssignment(null);
  };

  // Get assignments for a specific technician and day
  const getAssignmentsForSlot = (technicianId: string, date: Date) => {
    return assignments.filter(
      (a) =>
        a.technicianId === technicianId &&
        (isSameDay(new Date(a.startTime), date) ||
          isSameDay(new Date(a.endTime), date)),
    );
  };

  // Check if user can edit a specific assignment
  const canEditAssignment = (assignment: ExistingAssignment) => {
    return isAdmin || assignment.technicianId === currentUserId;
  };

  // Check if user can add to a technician's row
  const canAddToRow = (technicianId: string) => {
    return isAdmin || technicianId === currentUserId;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Laster timeplan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile View (Visible on small screens) */}
      <div className="md:hidden">
        <MobileAgendaView
          assignments={assignments as any[]}
          userId={currentUserId}
          onEdit={(assignment) =>
            handleEditAssignment(assignment as ExistingAssignment)
          }
          onDelete={(id) => deleteMutation.mutate(id)}
          onAdd={handleMobileAdd}
        />
      </div>

      {/* Desktop View (Hidden on small screens) */}
      <div className="hidden md:block space-y-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              I dag
            </Button>
          </div>
          <h2 className="text-lg font-semibold">
            {format(currentWeekStart, "d. MMMM", { locale: nb })} -{" "}
            {format(weekEnd, "d. MMMM yyyy", { locale: nb })}
          </h2>
        </div>

        {/* Calendar Grid */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              {/* Header with days */}
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-semibold w-48 sticky left-0 bg-muted/50 z-10">
                    Tekniker
                  </th>
                  {weekDays.map((day) => (
                    <th
                      key={day.toISOString()}
                      className={cn(
                        "p-3 text-center font-medium min-w-[120px]",
                        isSameDay(day, new Date()) && "bg-blue-500/10",
                      )}
                    >
                      <div className="text-xs text-muted-foreground uppercase">
                        {format(day, "EEE", { locale: nb })}
                      </div>
                      <div
                        className={cn(
                          "text-lg",
                          isSameDay(day, new Date()) &&
                            "text-blue-500 font-bold",
                        )}
                      >
                        {format(day, "d")}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Technician rows */}
              <tbody>
                {technicians.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-12 text-muted-foreground"
                    >
                      Ingen teknikere i organisasjonen
                    </td>
                  </tr>
                ) : (
                  technicians.map((tech) => (
                    <tr key={tech.id} className="border-b last:border-0">
                      {/* Technician info */}
                      <td className="p-3 sticky left-0 bg-background z-10 border-r">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarImage src={tech.image ?? undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                              {tech.name?.[0] ?? tech.email?.[0] ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate text-sm">
                              {tech.name ?? "Ukjent"}
                              {tech.id === currentUserId && (
                                <span className="text-muted-foreground ml-1">
                                  (deg)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {tech.role}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Day cells */}
                      {weekDays.map((day) => {
                        const slotAssignments = getAssignmentsForSlot(
                          tech.id,
                          day,
                        );
                        const isToday = isSameDay(day, new Date());
                        const canAdd = canAddToRow(tech.id);

                        return (
                          <td
                            key={day.toISOString()}
                            className={cn(
                              "p-2 align-top min-h-[100px] group relative",
                              isToday && "bg-blue-500/5",
                            )}
                          >
                            {/* Assignments */}
                            <div className="space-y-1">
                              {slotAssignments.map((assignment) => (
                                <AssignmentCard
                                  key={assignment.id}
                                  assignment={assignment as ExistingAssignment}
                                  onEdit={() =>
                                    handleEditAssignment(
                                      assignment as ExistingAssignment,
                                    )
                                  }
                                  onDelete={() =>
                                    deleteMutation.mutate(assignment.id)
                                  }
                                  canEdit={canEditAssignment(
                                    assignment as ExistingAssignment,
                                  )}
                                />
                              ))}
                            </div>

                            {/* Add button (on hover) - only if user can add */}
                            {canAdd && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute bottom-1 right-1 size-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() =>
                                  handleSlotClick(
                                    tech.id,
                                    tech.name ?? "Ukjent",
                                    day,
                                  )
                                }
                              >
                                <Plus className="size-4" />
                              </Button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <CreateAssignmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onClose={handleDialogClose}
        initialData={selectedSlot}
        technicians={technicians}
        existingAssignment={editingAssignment}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
