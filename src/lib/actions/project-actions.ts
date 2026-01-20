"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "./org-actions";

// ============================================================================
// AUTHORIZATION HELPER
// ============================================================================

async function requireAdminOrOwner() {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { error: "Ikke autentisert", orgData: null };
  }

  if (
    orgData.membership.role !== "owner" &&
    orgData.membership.role !== "admin"
  ) {
    return {
      error: "Kun administratorer har tilgang til prosjekter",
      orgData: null,
    };
  }

  return { error: null, orgData };
}

// ============================================================================
// PROJECT ACTIONS
// ============================================================================

/**
 * Search for projects by number or name (Accessible to ALL members)
 */
export async function searchProjects(query: string) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ikke autentisert", projects: [] };
  }

  // No role check - technicians need to search projects to log hours

  const projects = await prisma.project.findMany({
    where: {
      organizationId: orgData.organization.id,
      OR: [
        { projectNumber: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      projectNumber: true,
      name: true,
      customer: {
        select: { name: true },
      },
    },
    take: 10,
    orderBy: { projectNumber: "asc" },
  });

  return { success: true, projects };
}

/**
 * Get all projects for the organization (admin only)
 */
export async function getProjects() {
  const { error, orgData } = await requireAdminOrOwner();
  if (error || !orgData) {
    return { success: false, error: error ?? "Ikke autentisert", projects: [] };
  }

  const projects = await prisma.project.findMany({
    where: { organizationId: orgData.organization.id },
    include: {
      customer: {
        select: { id: true, name: true },
      },
      _count: {
        select: { assignments: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return { success: true, projects };
}

/**
 * Get project with detailed stats (workers and days)
 */
export async function getProjectWithStats(projectId: string) {
  const { error, orgData } = await requireAdminOrOwner();
  if (error || !orgData) {
    return { success: false, error: error ?? "Ikke autentisert" };
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: orgData.organization.id },
    include: {
      customer: true,
      assignments: {
        include: {
          technician: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { startTime: "asc" },
      },
    },
  });

  if (!project) {
    return { success: false, error: "Prosjekt ikke funnet" };
  }

  // Calculate worker stats
  const workerStatsMap = new Map<
    string,
    {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      days: number;
      totalHours: number;
    }
  >();

  for (const assignment of project.assignments) {
    const tech = assignment.technician;
    const existing = workerStatsMap.get(tech.id);

    // Calculate hours for this assignment
    const hours =
      (new Date(assignment.endTime).getTime() -
        new Date(assignment.startTime).getTime()) /
      (1000 * 60 * 60);

    if (existing) {
      existing.days += 1;
      existing.totalHours += hours;
    } else {
      workerStatsMap.set(tech.id, {
        id: tech.id,
        name: tech.name,
        email: tech.email,
        image: tech.image,
        days: 1,
        totalHours: hours,
      });
    }
  }

  const workerStats = Array.from(workerStatsMap.values()).sort(
    (a, b) => b.days - a.days,
  );

  return {
    success: true,
    project: {
      id: project.id,
      projectNumber: project.projectNumber,
      name: project.name,
      description: project.description,
      customer: project.customer,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      totalAssignments: project.assignments.length,
      workerStats,
    },
  };
}

/**
 * Create a new project
 */
export async function createProject(input: {
  projectNumber: string;
  name: string;
  description?: string;
  customerId?: string;
}) {
  const { error, orgData } = await requireAdminOrOwner();
  if (error || !orgData) {
    return { success: false, error: error ?? "Ikke autentisert" };
  }

  // Check for duplicate project number
  const existing = await prisma.project.findFirst({
    where: {
      organizationId: orgData.organization.id,
      projectNumber: input.projectNumber,
    },
  });

  if (existing) {
    return { success: false, error: "Prosjektnummer finnes allerede" };
  }

  const project = await prisma.project.create({
    data: {
      projectNumber: input.projectNumber,
      name: input.name,
      description: input.description,
      customerId: input.customerId || null,
      organizationId: orgData.organization.id,
    },
    include: {
      customer: true,
    },
  });

  return { success: true, project };
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  input: {
    name?: string;
    description?: string;
    customerId?: string | null;
  },
) {
  const { error, orgData } = await requireAdminOrOwner();
  if (error || !orgData) {
    return { success: false, error: error ?? "Ikke autentisert" };
  }

  const existing = await prisma.project.findFirst({
    where: { id: projectId, organizationId: orgData.organization.id },
  });

  if (!existing) {
    return { success: false, error: "Prosjekt ikke funnet" };
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      name: input.name,
      description: input.description,
      customerId: input.customerId,
    },
    include: {
      customer: true,
    },
  });

  return { success: true, project };
}

/**
 * Delete a project (only if no assignments)
 */
export async function deleteProject(projectId: string) {
  const { error, orgData } = await requireAdminOrOwner();
  if (error || !orgData) {
    return { success: false, error: error ?? "Ikke autentisert" };
  }

  const existing = await prisma.project.findFirst({
    where: { id: projectId, organizationId: orgData.organization.id },
    include: { _count: { select: { assignments: true } } },
  });

  if (!existing) {
    return { success: false, error: "Prosjekt ikke funnet" };
  }

  if (existing._count.assignments > 0) {
    return {
      success: false,
      error: `Kan ikke slette prosjekt med ${existing._count.assignments} oppdrag`,
    };
  }

  await prisma.project.delete({ where: { id: projectId } });

  return { success: true };
}
