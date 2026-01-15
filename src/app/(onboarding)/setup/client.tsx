"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Loader2,
  Plus,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createOrganization, inviteMembers } from "@/lib/actions/org-actions";

interface InviteEntry {
  email: string;
  role: string; // owner, admin, technician
}

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Organization
  const [orgName, setOrgName] = useState("");

  // Step 2: Invites
  const [invites, setInvites] = useState<InviteEntry[]>([
    { email: "", role: "technician" },
  ]);

  // Track created org ID
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);

  const handleCreateOrg = async () => {
    if (!orgName.trim()) {
      toast.error("Vennligst skriv inn et organisasjonsnavn");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createOrganization(orgName.trim());
      if (!result.success) {
        toast.error(result.error || "Kunne ikke opprette organisasjon");
        return;
      }

      setCreatedOrgId(result.organization?.id ?? null);
      toast.success("Organisasjon opprettet!");
      setStep(2);
    } catch (_error) {
      toast.error("Noe gikk galt");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInvite = () => {
    setInvites([...invites, { email: "", role: "technician" }]);
  };

  const handleRemoveInvite = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index));
  };

  const handleInviteChange = (
    index: number,
    field: "email" | "role",
    value: string,
  ) => {
    const updated = [...invites];
    if (field === "email") {
      updated[index].email = value;
    } else {
      updated[index].role = value;
    }
    setInvites(updated);
  };

  const handleSendInvites = async () => {
    if (!createdOrgId) return;

    const validInvites = invites.filter((i) => i.email.trim());
    if (validInvites.length === 0) {
      // Skip invites
      router.push("/");
      return;
    }

    setIsLoading(true);
    try {
      const result = await inviteMembers(createdOrgId, validInvites);
      if (!result.success) {
        toast.error(result.error || "Kunne ikke sende invitasjoner");
        return;
      }

      toast.success(`${result.count} invitasjon(er) sendt!`);
      router.push("/");
    } catch (_error) {
      toast.error("Noe gikk galt");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.push("/");
  };

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-4">
        <div
          className={`flex items-center gap-2 ${
            step >= 1 ? "text-blue-400" : "text-slate-500"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1
                ? "bg-blue-500/20 border border-blue-500"
                : "bg-slate-800 border border-slate-700"
            }`}
          >
            {step > 1 ? <Check className="w-4 h-4" /> : "1"}
          </div>
          <span className="text-sm font-medium hidden sm:inline">
            Organisasjon
          </span>
        </div>

        <div className="w-12 h-px bg-slate-700" />

        <div
          className={`flex items-center gap-2 ${
            step >= 2 ? "text-blue-400" : "text-slate-500"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2
                ? "bg-blue-500/20 border border-blue-500"
                : "bg-slate-800 border border-slate-700"
            }`}
          >
            2
          </div>
          <span className="text-sm font-medium hidden sm:inline">
            Inviter team
          </span>
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-blue-400" />
                </div>
                <CardTitle className="text-xl text-white">
                  Opprett din organisasjon
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Dette er firmaet eller teamet ditt som vil bruke Rapport til
                  servicerapporter.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="orgName" className="text-slate-300">
                    Organisasjonsnavn
                  </Label>
                  <Input
                    id="orgName"
                    placeholder="F.eks. Maskinservice AS"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="h-14 text-lg bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                    autoFocus
                  />
                </div>

                <Button
                  onClick={handleCreateOrg}
                  disabled={isLoading || !orgName.trim()}
                  className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Fortsett
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-green-400" />
                </div>
                <CardTitle className="text-xl text-white">
                  Inviter teammedlemmer
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Legg til teknikere eller administratorer. Du kan også gjøre
                  dette senere.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {invites.map((invite, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="tekniker@firma.no"
                        value={invite.email}
                        onChange={(e) =>
                          handleInviteChange(index, "email", e.target.value)
                        }
                        className="flex-1 h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                      />
                      <Select
                        value={invite.role}
                        onValueChange={(value) =>
                          handleInviteChange(index, "role", value)
                        }
                      >
                        <SelectTrigger className="w-36 h-12 bg-slate-800/50 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technician">Tekniker</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {invites.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveInvite(index)}
                          className="h-12 w-12 text-slate-400 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={handleAddInvite}
                  className="w-full h-12 border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Legg til flere
                </Button>

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="h-12 text-slate-400 hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Tilbake
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="flex-1 h-12 border-slate-600 text-slate-300"
                  >
                    Hopp over
                  </Button>
                  <Button
                    onClick={handleSendInvites}
                    disabled={isLoading}
                    className="flex-1 h-12 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Fullfør
                        <Check className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
