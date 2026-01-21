"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrg, requireAdmin } from "./utils/auth";

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

const searchProjectsSchema = z.object({
  query: z.string(),
});

const createProjectSchema = z.object({
  projectNumber: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  customerId: z.string().optional(),
});

const updateProjectSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().optional(),
  description: z.string().optional(),
  customerId: z.string().nullable().optional(),
});

// ============================================================================
// PROJECT ACTIONS
// ============================================================================

/**
 * Search for projects by number or name (Accessible to ALL members)
 */
export async function searchProjects(data: unknown) {
  const { organization } = await requireOrg();
  const input = searchProjectsSchema.parse(data);

  // No role check - technicians need to search projects to log hours

  const projects = await prisma.project.findMany({
    where: {
      organizationId: organization.id,
      OR: [
        { projectNumber: { contains: input.query, mode: "insensitive" } },
        { name: { contains: input.query, mode: "insensitive" } },
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
  const { organization } = await requireAdmin();

  const projects = await prisma.project.findMany({
    where: { organizationId: organization.id },
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
export async function getProjectWithStats(projectId: unknown) {
  const { organization } = await requireAdmin();
  const parsedId = z.string().min(1).parse(projectId);

  const project = await prisma.project.findFirst({
    where: { id: parsedId, organizationId: organization.id },
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
export async function createProject(data: unknown) {
  const { organization } = await requireAdmin();
  const input = createProjectSchema.parse(data);

  // Check for duplicate project number
  const existing = await prisma.project.findFirst({
    where: {
      organizationId: organization.id,
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
      organizationId: organization.id,
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
export async function updateProject(data: unknown) {
  const { organization } = await requireAdmin();
  const input = updateProjectSchema.parse(data);

  const existing = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId: organization.id },
  });

  if (!existing) {
    return { success: false, error: "Prosjekt ikke funnet" };
  }

  const project = await prisma.project.update({
    where: { id: input.projectId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.customerId !== undefined && { customerId: input.customerId }),
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
export async function deleteProject(projectId: unknown) {
  const { organization } = await requireAdmin();
  const parsedId = z.string().min(1).parse(projectId);

  const existing = await prisma.project.findFirst({
    where: { id: parsedId, organizationId: organization.id },
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

  await prisma.project.delete({ where: { id: parsedId } });

  return { success: true };
}
