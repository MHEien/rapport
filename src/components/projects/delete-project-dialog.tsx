"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteProject } from "@/lib/actions/project-actions";

interface DeleteProjectDialogProps {
  projectId: string;
  projectNumber: string;
  projectName: string;
  onDeleted: () => void;
}

export function DeleteProjectDialog({
  projectId,
  projectNumber,
  projectName,
  onDeleted,
}: DeleteProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "Slett") return;

    setIsDeleting(true);
    try {
      const result = await deleteProject(projectId);
      if (result.success) {
        toast.success("Prosjekt slettet");
        setOpen(false);
        onDeleted();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Kunne ikke slette prosjektet");
    } finally {
      setIsDeleting(false);
      setConfirmText("");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="size-5" />
            Slett prosjekt?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Er du sikker på at du vil slette prosjekt{" "}
                <span className="font-semibold text-foreground">
                  {projectNumber} - {projectName}
                </span>
                ?
              </p>
              <p className="text-red-500 font-medium">
                ⚠️ Denne handlingen kan ikke angres.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="confirm">
            Skriv <span className="font-bold">Slett</span> for å bekrefte:
          </Label>
          <Input
            id="confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Slett"
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmText !== "Slett" || isDeleting}
          >
            {isDeleting ? "Sletter..." : "Slett prosjekt"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
