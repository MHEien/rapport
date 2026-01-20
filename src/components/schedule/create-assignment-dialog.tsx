"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createAssignment,
  updateAssignment,
  type CreateAssignmentInput,
  type UpdateAssignmentInput,
} from "@/lib/actions/schedule-actions";
import { searchProjects } from "@/lib/actions/project-actions";

interface Technician {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

interface ExistingAssignment {
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

interface InitialData {
  technicianId: string;
  technicianName: string;
  date: Date;
}

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  initialData: InitialData | null;
  technicians: Technician[];
  existingAssignment?: ExistingAssignment | null;
  currentUserId: string | null;
  isAdmin: boolean;
}

export function CreateAssignmentDialog({
  open,
  onOpenChange,
  onClose,
  initialData,
  technicians,
  existingAssignment,
  currentUserId,
  isAdmin,
}: AssignmentDialogProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!existingAssignment;

  const [formData, setFormData] = useState({
    referenceType: "SERVICE_ORDER" as "SERVICE_ORDER" | "PROJECT",
    serviceOrderNumber: "",
    projectNumber: "",
    title: "",
    technicianId: "",
    startTime: "",
    endTime: "",
    status: "SCHEDULED" as
      | "SCHEDULED"
      | "IN_PROGRESS"
      | "COMPLETE"
      | "CANCELLED",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Combobox state
  const [openCombobox, setOpenCombobox] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [foundProjects, setFoundProjects] = useState<
    { id: string; projectNumber: string; name: string }[]
  >([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Debounced search for projects
  useEffect(() => {
    if (!openCombobox) return;

    const timer = setTimeout(async () => {
      setLoadingProjects(true);
      try {
        const res = await searchProjects(projectSearch);
        if (res.success && res.projects) {
          setFoundProjects(res.projects);
        }
      } catch (err) {
        console.error("Project search failed", err);
      } finally {
        setLoadingProjects(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [projectSearch, openCombobox]);

  // Initialize form based on mode
  useEffect(() => {
    if (existingAssignment) {
      // Edit mode - populate from existing
      const start = new Date(existingAssignment.startTime);
      const end = new Date(existingAssignment.endTime);
      setFormData({
        referenceType: existingAssignment.referenceType,
        serviceOrderNumber: existingAssignment.serviceOrderNumber || "",
        projectNumber: existingAssignment.project?.projectNumber || "",
        title: existingAssignment.title,
        technicianId: existingAssignment.technicianId,
        startTime: format(start, "yyyy-MM-dd'T'HH:mm"),
        endTime: format(end, "yyyy-MM-dd'T'HH:mm"),
        status: existingAssignment.status,
        notes: existingAssignment.notes || "",
      });
    } else if (initialData) {
      // Create mode - use initial slot data
      const dateStr = format(initialData.date, "yyyy-MM-dd");
      setFormData({
        referenceType: "SERVICE_ORDER",
        serviceOrderNumber: "",
        projectNumber: "",
        title: "",
        technicianId: initialData.technicianId,
        startTime: `${dateStr}T08:00`,
        endTime: `${dateStr}T16:00`,
        status: "SCHEDULED",
        notes: "",
      });
    }
    setErrors({});
  }, [existingAssignment, initialData, open]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Oppdrag opprettet");
        queryClient.invalidateQueries({ queryKey: ["assignments"] });
        onClose();
      } else {
        toast.error(result.error ?? "Kunne ikke opprette oppdrag");
      }
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: updateAssignment,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Oppdrag oppdatert");
        queryClient.invalidateQueries({ queryKey: ["assignments"] });
        onClose();
      } else {
        toast.error(result.error ?? "Kunne ikke oppdatere oppdrag");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate reference number
    if (
      formData.referenceType === "SERVICE_ORDER" &&
      !formData.serviceOrderNumber.trim()
    ) {
      setErrors({ serviceOrderNumber: "Serviceordrenummer er påkrevd" });
      return;
    }
    if (
      formData.referenceType === "PROJECT" &&
      !formData.projectNumber.trim()
    ) {
      setErrors({ projectNumber: "Prosjektnummer er påkrevd" });
      return;
    }

    if (isEditMode && existingAssignment) {
      const input: UpdateAssignmentInput = {
        id: existingAssignment.id,
        referenceType: formData.referenceType,
        serviceOrderNumber: formData.serviceOrderNumber || undefined,
        projectNumber: formData.projectNumber || undefined,
        title: formData.title,
        technicianId: formData.technicianId,
        startTime: new Date(formData.startTime),
        endTime: new Date(formData.endTime),
        status: formData.status,
        notes: formData.notes || undefined,
      };
      updateMutation.mutate(input);
    } else {
      const input: CreateAssignmentInput = {
        referenceType: formData.referenceType,
        serviceOrderNumber: formData.serviceOrderNumber || undefined,
        projectNumber: formData.projectNumber || undefined,
        title: formData.title,
        technicianId: formData.technicianId,
        startTime: new Date(formData.startTime),
        endTime: new Date(formData.endTime),
        notes: formData.notes || undefined,
      };
      createMutation.mutate(input);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Filter technicians
  const availableTechnicians = isAdmin
    ? technicians
    : technicians.filter((t) => t.id === currentUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Rediger oppdrag" : "Nytt oppdrag"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Oppdater oppdragsinformasjon"
                : initialData &&
                  `Planlegg oppdrag for ${initialData.technicianName} - ${format(
                    initialData.date,
                    "EEEE d. MMMM",
                    { locale: nb },
                  )}`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Reference Type Toggle */}
            <div className="space-y-2">
              <Label>Referansetype</Label>
              <RadioGroup
                value={formData.referenceType}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    referenceType: value as "SERVICE_ORDER" | "PROJECT",
                  }))
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SERVICE_ORDER" id="so" />
                  <Label htmlFor="so" className="font-normal cursor-pointer">
                    Serviceordre
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PROJECT" id="project" />
                  <Label
                    htmlFor="project"
                    className="font-normal cursor-pointer"
                  >
                    Prosjekt
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Service Order Number */}
            {formData.referenceType === "SERVICE_ORDER" && (
              <div className="space-y-2">
                <Label
                  htmlFor="serviceOrderNumber"
                  className="flex items-center gap-1"
                >
                  Serviceordrenummer <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="serviceOrderNumber"
                  placeholder="SO-12345"
                  value={formData.serviceOrderNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      serviceOrderNumber: e.target.value,
                    }))
                  }
                  className={errors.serviceOrderNumber ? "border-red-500" : ""}
                  autoFocus
                />
                {errors.serviceOrderNumber && (
                  <p className="text-sm text-red-500">
                    {errors.serviceOrderNumber}
                  </p>
                )}
              </div>
            )}

            {/* Project Number Combobox */}
            {formData.referenceType === "PROJECT" && (
              <div className="space-y-2">
                <Label
                  htmlFor="projectNumber"
                  className="flex items-center gap-1"
                >
                  Prosjekt <span className="text-red-500">*</span>
                </Label>

                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox}
                      className={cn(
                        "w-full justify-between",
                        errors.projectNumber && "border-red-500",
                      )}
                    >
                      {formData.projectNumber
                        ? foundProjects.find(
                            (p) => p.projectNumber === formData.projectNumber,
                          )
                          ? `${
                              foundProjects.find(
                                (p) =>
                                  p.projectNumber === formData.projectNumber,
                              )?.projectNumber
                            } - ${
                              foundProjects.find(
                                (p) =>
                                  p.projectNumber === formData.projectNumber,
                              )?.name
                            }`
                          : formData.projectNumber
                        : "Søk etter prosjekt..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Søk på nummer, navn..."
                        value={projectSearch}
                        onValueChange={setProjectSearch}
                      />
                      <CommandList>
                        {loadingProjects && (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" />
                            Laster prosjekter...
                          </div>
                        )}
                        {!loadingProjects && foundProjects.length === 0 && (
                          <CommandEmpty>
                            {projectSearch ? (
                              <button
                                type="button"
                                className="w-full text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                                onClick={() => {
                                  // Use input as new project number
                                  setFormData((prev) => ({
                                    ...prev,
                                    projectNumber: projectSearch,
                                    // Also set title if empty
                                    title:
                                      prev.title ||
                                      `Nytt prosjekt: ${projectSearch}`,
                                  }));
                                  setOpenCombobox(false);
                                }}
                              >
                                Trykk her for å opprette "{projectSearch}"
                              </button>
                            ) : (
                              "Ingen prosjekter funnet"
                            )}
                          </CommandEmpty>
                        )}
                        <CommandGroup>
                          {foundProjects.map((project) => (
                            <CommandItem
                              key={project.id}
                              value={`${project.projectNumber} ${project.name}`}
                              onSelect={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  projectNumber: project.projectNumber,
                                  // Autofill title if empty
                                  title: prev.title || project.name,
                                }));
                                setOpenCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.projectNumber ===
                                    project.projectNumber
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {project.projectNumber}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {project.name}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {errors.projectNumber && (
                  <p className="text-sm text-red-500">{errors.projectNumber}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Søk etter nummer eller navn for å fylle ut automatisk
                </p>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Tittel <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Beskrivelse av jobben"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>

            {/* Technician - Only show dropdown if admin or has options */}
            {availableTechnicians.length > 0 && (
              <div className="space-y-2">
                <Label>
                  Tekniker <span className="text-red-500">*</span>
                </Label>
                {isAdmin ? (
                  <Select
                    value={formData.technicianId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, technicianId: value }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Velg tekniker" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name ?? tech.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={
                      availableTechnicians[0]?.name ||
                      availableTechnicians[0]?.email ||
                      ""
                    }
                    disabled
                    className="bg-muted"
                  />
                )}
              </div>
            )}

            {/* Start/End Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Starttid</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startTime: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Sluttid</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endTime: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            {/* Status - Only in edit mode */}
            {isEditMode && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: value as typeof formData.status,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULED">Planlagt</SelectItem>
                    <SelectItem value="IN_PROGRESS">Pågår</SelectItem>
                    <SelectItem value="COMPLETE">Fullført</SelectItem>
                    <SelectItem value="CANCELLED">Avlyst</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notater</Label>
              <Textarea
                id="notes"
                placeholder="Tilleggsinformasjon..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditMode
                  ? "Lagrer..."
                  : "Oppretter..."
                : isEditMode
                  ? "Lagre endringer"
                  : "Opprett oppdrag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
