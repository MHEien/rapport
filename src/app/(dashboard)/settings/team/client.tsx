"use client";

import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Link2, Loader2, Mail, MoreVertical, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  cancelInvitation,
  inviteMembers,
  removeMember,
  updateMemberRole,
} from "@/lib/actions/org-actions";

interface MemberUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Member {
  id: string;
  role: string;
  userId: string;
  user: MemberUser;
}

interface InvitationInviter {
  name: string | null;
  email: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  inviter: InvitationInviter;
}

interface TeamSettingsClientProps {
  organizationId: string;
  initialMembers: Member[];
  initialInvitations: Invitation[];
  currentUserRole: string;
  currentUserId: string;
}

export function TeamSettingsClient({
  organizationId,
  initialMembers,
  initialInvitations,
  currentUserRole,
  currentUserId,
}: TeamSettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"members" | "invites">("members");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviteLoading, setIsInviteLoading] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("technician");

  const getInviteLink = (invitationId: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/accept-invitation/${invitationId}`;
  };

  const handleCopyLink = async (invitationId: string) => {
    const link = getInviteLink(invitationId);
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invitasjonslenke kopiert!");
    } catch (_error) {
      toast.error("Kunne ikke kopiere lenke");
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;

    setIsInviteLoading(true);
    try {
      const result = await inviteMembers(organizationId, [
        { email: inviteEmail, role: inviteRole },
      ]);

      if (result.success) {
        toast.success(`Invitasjon sendt til ${inviteEmail}`);
        setInviteEmail("");
        setInviteRole("technician");
        setIsInviteDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (_error) {
      toast.error("Noe gikk galt");
    } finally {
      setIsInviteLoading(false);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    try {
      const result = await cancelInvitation(invitationId);
      if (result.success) {
        toast.success("Invitasjon kansellert");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (_error) {
      toast.error("Kunne ikke kansellere invitasjon");
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const result = await updateMemberRole(memberId, newRole);
      if (result.success) {
        toast.success("Rolle oppdatert");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (_error) {
      toast.error("Kunne ikke oppdatere rolle");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Er du sikker på at du vil fjerne dette medlemmet?")) return;

    try {
      const result = await removeMember(memberId);
      if (result.success) {
        toast.success("Medlem fjernet");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (_error) {
      toast.error("Kunne ikke fjerne medlem");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Teammedlemmer</h1>
          <p className="text-slate-400">
            Administrer tilgang og roller for ditt team
          </p>
        </div>

        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-500">
              <Plus className="size-4 mr-2" />
              Inviter medlem
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle>Inviter nytt medlem</DialogTitle>
              <DialogDescription className="text-slate-400">
                Send en invitasjon på e-post. Mottakeren vil motta en lenke for
                å bli med.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label
                  htmlFor="invite-email"
                  className="text-sm font-medium text-slate-200"
                >
                  E-postadresse
                </Label>
                <Input
                  id="invite-email"
                  placeholder="navn@bedrift.no"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="invite-role"
                  className="text-sm font-medium text-slate-200"
                >
                  Rolle
                </Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger
                    id="invite-role"
                    className="bg-slate-800 border-slate-700 text-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="technician">
                      Tekniker (Standard)
                    </SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="owner">Eier</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  {inviteRole === "technician" &&
                    "Kan opprette og redigere egne rapporter."}
                  {inviteRole === "admin" &&
                    "Kan administrere medlemmer og innstillinger."}
                  {inviteRole === "owner" &&
                    "Har full tilgang til alt, inkludert fakturering."}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsInviteDialogOpen(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Avbryt
              </Button>
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail || isInviteLoading}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {isInviteLoading ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <Mail className="size-4 mr-2" />
                )}
                Send invitasjon
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Totalt antall medlemmer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {initialMembers.length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Ventende invitasjoner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {initialInvitations.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex border-b border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "members"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Medlemmer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("invites")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "invites"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Invitasjoner ({initialInvitations.length})
          </button>
        </div>

        {activeTab === "members" ? (
          <Card className="bg-white/[0.02] border-white/5">
            <div className="divide-y divide-white/5">
              {initialMembers.map((member) => (
                <div
                  key={member.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.user.image || undefined} />
                      <AvatarFallback className="bg-blue-600/20 text-blue-400">
                        {member.user.name?.[0] ||
                          member.user.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-white">
                        {member.user.name || "Uten navn"}
                        {member.userId === currentUserId && (
                          <span className="ml-2 text-xs text-slate-500">
                            (Deg)
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400">
                        {member.user.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge
                      variant="outline"
                      className={`capitalize ${
                        member.role === "owner"
                          ? "border-purple-500 text-purple-400 bg-purple-500/10"
                          : member.role === "admin"
                            ? "border-blue-500 text-blue-400 bg-blue-500/10"
                            : "border-slate-500 text-slate-400 bg-slate-500/10"
                      }`}
                    >
                      {member.role}
                    </Badge>

                    {/* Only allow actions if current user is owner/admin AND targeting someone else (or lower rank) */}
                    {member.userId !== currentUserId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-white"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-slate-900 border-slate-800 text-white w-48"
                        >
                          <DropdownMenuLabel>Handlinger</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-slate-800" />

                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateRole(member.id, "technician")
                            }
                          >
                            Sett til Tekniker
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleUpdateRole(member.id, "admin")}
                          >
                            Sett til Admin
                          </DropdownMenuItem>
                          {currentUserRole === "owner" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdateRole(member.id, "owner")
                              }
                            >
                              Sett til Eier
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator className="bg-slate-800" />
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="size-4 mr-2" />
                            Fjern medlem
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="bg-white/[0.02] border-white/5">
            <div className="divide-y divide-white/5">
              {initialInvitations.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  Ingen ventende invitasjoner
                </div>
              ) : (
                initialInvitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-slate-800 flex items-center justify-center">
                        <Mail className="size-5 text-slate-400" />
                      </div>
                      <div>
                        <div className="font-medium text-white">
                          {invite.email}
                        </div>
                        <div className="text-sm text-slate-400">
                          Invitert av{" "}
                          {invite.inviter.name || invite.inviter.email} •{" "}
                          {format(new Date(invite.createdAt), "d. MMM yyyy", {
                            locale: nb,
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge
                        variant="outline"
                        className="border-slate-500 text-slate-400 bg-slate-500/10 capitalize"
                      >
                        {invite.role}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyLink(invite.id)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                      >
                        <Link2 className="size-4 mr-1" />
                        Kopier lenke
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvite(invite.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        Kanseller
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
