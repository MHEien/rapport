"use client";

import { useState } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  ChevronDown,
  FileText,
  User,
  Users,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TeamMember {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  totalReports: number;
  drafts: number;
  completed: number;
}

interface TeamReport {
  id: string;
  reportNumber: number;
  customerName: string;
  status: string;
  serviceDate: Date;
  updatedAt: Date;
  author: { id: string; name: string | null };
  assignedTo: { id: string; name: string | null } | null;
  equipment: Array<{ id: string; productName: string }>;
}

interface AdminDashboardProps {
  members: TeamMember[];
  reports: TeamReport[];
  isAdmin: boolean;
}

const roleLabels: Record<string, string> = {
  owner: "Eier",
  admin: "Administrator",
  technician: "Tekniker",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  SYNCED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  COMPLETED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ARCHIVED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Utkast",
  SYNCED: "Synkronisert",
  COMPLETED: "Fullført",
  ARCHIVED: "Arkivert",
};

export function AdminDashboard({
  members,
  reports,
  isAdmin,
}: AdminDashboardProps) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [isTeamOpen, setIsTeamOpen] = useState(true);

  if (!isAdmin) {
    return null;
  }

  const totalReports = members.reduce((sum, m) => sum + m.totalReports, 0);
  const totalDrafts = members.reduce((sum, m) => sum + m.drafts, 0);
  const totalCompleted = members.reduce((sum, m) => sum + m.completed, 0);

  const filteredReports = selectedMember
    ? reports.filter((r) => r.author.id === selectedMember)
    : reports;

  return (
    <div className="space-y-6 px-6">
      {/* Team Overview Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-purple-500/20">
          <Users className="size-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Team Oversikt</h2>
          <p className="text-sm text-slate-400">
            {members.length} medlemmer · {totalReports} rapporter totalt
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="size-5 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {members.length}
                </p>
                <p className="text-xs text-slate-400">Teammedlemmer</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-emerald-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {totalCompleted}
                </p>
                <p className="text-xs text-slate-400">Fullførte</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-600/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Clock className="size-5 text-amber-400" />
              <div>
                <p className="text-2xl font-bold text-white">{totalDrafts}</p>
                <p className="text-xs text-slate-400">Utkast</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members List */}
      <Collapsible open={isTeamOpen} onOpenChange={setIsTeamOpen}>
        <Card className="border-slate-700/50 bg-slate-800/30">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-slate-700/20 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Teammedlemmer</CardTitle>
                  <CardDescription>
                    Klikk på en tekniker for å filtrere rapporter
                  </CardDescription>
                </div>
                <ChevronDown
                  className={cn(
                    "size-5 text-slate-400 transition-transform",
                    isTeamOpen && "rotate-180",
                  )}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {/* All members button */}
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-auto py-3",
                    selectedMember === null &&
                      "bg-purple-500/20 hover:bg-purple-500/30",
                  )}
                  onClick={() => setSelectedMember(null)}
                >
                  <div className="p-2 rounded-full bg-slate-700">
                    <Users className="size-4 text-slate-300" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-white">Alle medlemmer</p>
                    <p className="text-xs text-slate-400">
                      {totalReports} rapporter
                    </p>
                  </div>
                </Button>

                {/* Individual members */}
                {members.map((member) => (
                  <Button
                    key={member.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 h-auto py-3",
                      selectedMember === member.userId &&
                        "bg-purple-500/20 hover:bg-purple-500/30",
                    )}
                    onClick={() => setSelectedMember(member.userId)}
                  >
                    <Avatar className="size-10">
                      <AvatarImage src={member.image || undefined} />
                      <AvatarFallback className="bg-slate-700 text-white">
                        {member.name?.[0] || member.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">
                          {member.name || member.email}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-xs border-slate-600"
                        >
                          {roleLabels[member.role] || member.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400">
                        {member.totalReports} rapporter · {member.drafts} utkast
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Filtered Reports */}
      <Card className="border-slate-700/50 bg-slate-800/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="size-5" />
                {selectedMember
                  ? `Rapporter fra ${members.find((m) => m.userId === selectedMember)?.name || "valgt tekniker"}`
                  : "Alle rapporter"}
              </CardTitle>
              <CardDescription>
                {filteredReports.length} rapporter
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <p className="text-center text-slate-400 py-8">
              Ingen rapporter funnet
            </p>
          ) : (
            <div className="space-y-2">
              {filteredReports.map((report) => (
                <a
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-700">
                      <FileText className="size-4 text-slate-300" />
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {report.customerName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {report.equipment[0]?.productName || "Ingen utstyr"} ·{" "}
                        {format(new Date(report.updatedAt), "d. MMM yyyy", {
                          locale: nb,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.assignedTo && (
                      <Badge
                        variant="outline"
                        className="text-xs border-purple-500/30 text-purple-400"
                      >
                        <User className="size-3 mr-1" />
                        {report.assignedTo.name}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={cn("text-xs", statusColors[report.status])}
                    >
                      {statusLabels[report.status] || report.status}
                    </Badge>
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
