"use client";

import { AlertTriangle, Loader2, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  deleteOrganization,
  updateOrganization,
} from "@/lib/actions/org-actions";

interface OrgSettingsClientProps {
  organizationId: string;
  initialName: string;
  initialSlug: string;
  role: string;
}

export function OrgSettingsClient({
  organizationId,
  initialName,
  initialSlug,
  role,
}: OrgSettingsClientProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const handleUpdate = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const result = await updateOrganization(organizationId, { name });
      if (result.success) {
        toast.success("Organisasjon oppdatert");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (_error) {
      toast.error("Kunne ikke oppdatere organisasjon");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== name) return;

    setIsDeleting(true);
    try {
      const result = await deleteOrganization(organizationId);
      if (result.success) {
        toast.success("Organisasjon slettet");
        router.push("/setup"); // Redirect to setup to create new org
      } else {
        toast.error(result.error);
        setIsDeleting(false);
      }
    } catch (_error) {
      toast.error("Kunne ikke slette organisasjon");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Organisasjonsinnstillinger
        </h1>
        <p className="text-slate-400">
          Administrer generelle innstillinger for organisasjonen
        </p>
      </div>

      <Card className="bg-white/[0.02] border-white/5">
        <CardHeader>
          <CardTitle>Generelt</CardTitle>
          <CardDescription>
            Endre organisasjonens navn og visningsinformasjon.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName" className="text-slate-200">
              Organisasjonsnavn
            </Label>
            <Input
              id="orgName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgSlug" className="text-slate-200">
              URL-identifikator (Slug)
            </Label>
            <Input
              id="orgSlug"
              value={initialSlug}
              disabled
              className="bg-slate-900/50 border-slate-800 text-slate-500 max-w-md cursor-not-allowed"
            />
            <p className="text-xs text-slate-500">
              Denne brukes i URL-er og kan ikke endres.
            </p>
          </div>
        </CardContent>
        <CardFooter className="border-t border-white/5 pt-6">
          <Button
            onClick={handleUpdate}
            disabled={isSaving || name === initialName || !name.trim()}
            className="bg-blue-600 hover:bg-blue-500"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Save className="size-4 mr-2" />
            )}
            Lagre endringer
          </Button>
        </CardFooter>
      </Card>

      {role === "owner" && (
        <Card className="bg-red-950/10 border-red-900/20">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="size-5" />
              Fareområde
            </CardTitle>
            <CardDescription className="text-red-400/70">
              Handlinger her kan ikke angres.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 text-sm mb-4">
              Sletting av organisasjonen vil fjerne alle data, inkludert
              rapporter, medlemmer og innstillinger. Dette kan ikke angres.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50"
                >
                  <Trash2 className="size-4 mr-2" />
                  Slett organisasjon
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-red-900/20 text-white">
                <DialogHeader>
                  <DialogTitle className="text-red-400">
                    Er du helt sikker?
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Dette vil permanent slette{" "}
                    <span className="font-bold text-white">{initialName}</span>{" "}
                    og alle tilhørende data.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Label className="text-slate-300">
                    Skriv inn organisasjonsnavnet for å bekrefte:
                  </Label>
                  <Input
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder={initialName}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleDelete}
                    disabled={isDeleting || deleteConfirmation !== initialName}
                    variant="destructive"
                    className="w-full"
                  >
                    {isDeleting ? (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    ) : (
                      "Jeg forstår konsekvensene, slett alt"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
