"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { FolderKanban, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getProjects,
  getProjectWithStats,
} from "@/lib/actions/project-actions";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectsList() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
  });

  const { data: projectDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["project-details", selectedProjectId],
    queryFn: () =>
      selectedProjectId ? getProjectWithStats(selectedProjectId) : null,
    enabled: !!selectedProjectId,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const projects = data?.projects ?? [];

  if (projects.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <FolderKanban className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Ingen prosjekter</h3>
        <p className="text-muted-foreground max-w-sm mt-2">
          Prosjekter opprettes automatisk når du bruker prosjektnummer i
          timeplanen.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setSelectedProjectId(project.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono">
                  {project.projectNumber}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {project._count.assignments} oppdrag
                </span>
              </div>
              <CardTitle className="text-lg mt-2">{project.name}</CardTitle>
              {project.customer && (
                <CardDescription>{project.customer.name}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Opprettet{" "}
                {format(new Date(project.createdAt), "d. MMM yyyy", {
                  locale: nb,
                })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project Details Dialog */}
      <Dialog
        open={!!selectedProjectId}
        onOpenChange={(open) => !open && setSelectedProjectId(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="size-5" />
              {projectDetails?.project?.name ?? "Laster..."}
            </DialogTitle>
            <DialogDescription>
              Prosjekt {projectDetails?.project?.projectNumber}
              {projectDetails?.project?.customer && (
                <> • {projectDetails.project.customer.name}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : projectDetails?.project ? (
            <div className="space-y-6 py-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">
                      {projectDetails.project.totalAssignments}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Totalt oppdrag
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">
                      {projectDetails.project.workerStats.length}
                    </div>
                    <p className="text-sm text-muted-foreground">Teknikere</p>
                  </CardContent>
                </Card>
              </div>

              {/* Worker Stats */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Users className="size-4" />
                  Arbeid per tekniker
                </h4>
                {projectDetails.project.workerStats.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Ingen oppdrag registrert ennå
                  </p>
                ) : (
                  <div className="space-y-2">
                    {projectDetails.project.workerStats.map((worker) => (
                      <div
                        key={worker.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarImage src={worker.image ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {worker.name?.[0] ?? worker.email?.[0] ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {worker.name ?? worker.email}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{worker.days} dager</p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(worker.totalHours)} timer
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
