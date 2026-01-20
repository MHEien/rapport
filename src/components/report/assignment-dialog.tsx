"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  assignReport,
  getOrganizationTechnicians,
  unassignReport,
} from "@/lib/actions/reports-actions";

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string | null;
  currentAssigneeId?: string | null;
}

export function AssignmentDialog({
  open,
  onOpenChange,
  reportId,
  currentAssigneeId,
}: AssignmentDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch technicians
  const { data: technicians = [] } = useQuery({
    queryKey: ["organization-technicians"],
    queryFn: async () => {
      return getOrganizationTechnicians();
    },
    enabled: open, // Only fetch when dialog opens
  });

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!reportId) throw new Error("No report selected");
      const result = await assignReport(reportId, userId);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success("Rapport tildelt");
      onOpenChange(false);
      router.refresh(); // Refresh server components
      // Invalidate queries if we were using a list query
      queryClient.invalidateQueries({ queryKey: ["reports"] }); // If using RQ for list
    },
    onError: (error) => {
      toast.error(error.message || "Kunne ikke tildele rapport");
    },
  });

  // Unassign mutation
  const unassignMutation = useMutation({
    mutationFn: async () => {
      if (!reportId) throw new Error("No report selected");
      const result = await unassignReport(reportId);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success("Tildeling fjernet");
      onOpenChange(false);
      router.refresh();
      // Invalidate queries if needed
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error) => {
      toast.error(error.message || "Kunne ikke fjerne tildeling");
    },
  });

  const handleSelect = (userId: string) => {
    if (userId === currentAssigneeId) {
      // If clicking current assignee, do nothing or unassign?
      // Let's keep unassign as a separate action for clarity
      return;
    }
    assignMutation.mutate(userId);
  };

  const handleUnassign = () => {
    unassignMutation.mutate();
  };

  if (!reportId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Tildel rapport</DialogTitle>
          <DialogDescription className="text-slate-400">
            Velg tekniker som skal utføre denne jobben.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Command className="bg-transparent border border-white/10 rounded-lg">
            <CommandInput
              placeholder="Søk i teknikere..."
              className="placeholder:text-slate-500"
            />
            <CommandList>
              <CommandEmpty>Ingen teknikere funnet.</CommandEmpty>
              <CommandGroup>
                {technicians.map((tech) => (
                  <CommandItem
                    key={tech.id}
                    value={tech.name || tech.email}
                    onSelect={() => handleSelect(tech.id)}
                    className="flex items-center gap-3 aria-selected:bg-white/10 cursor-pointer py-3"
                  >
                    <Avatar className="size-8 border-white/10">
                      <AvatarFallback className="bg-blue-500/20 text-blue-300 text-xs">
                        {tech.name?.substring(0, 2).toUpperCase() || "T"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-medium truncate">
                        {tech.name || "Ukjent bruker"}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {tech.email}
                      </p>
                    </div>
                    {currentAssigneeId === tech.id && (
                      <Check className="size-4 text-blue-400" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>

        {currentAssigneeId && (
          <div className="flex justify-between items-center pt-2 border-t border-white/10 mt-2">
            <span className="text-xs text-slate-500">Nåværende: </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUnassign}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8"
              disabled={unassignMutation.isPending}
            >
              Fjern tildeling
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
