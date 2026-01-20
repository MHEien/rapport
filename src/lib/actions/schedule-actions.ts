"use server";

import { z } from "zod";
import type {
  AssignmentStatus,
  ReferenceType,
} from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/server";
import { getCurrentOrganization } from "./org-actions";

// ============================================================================
// ZOD VALIDATION SCHEMAS (private - can't export objects from "use server")
// ============================================================================

const createAssignmentSchema = z
  .object({
    referenceType: z.enum(["SERVICE_ORDER", "PROJECT"]),
    serviceOrderNumber: z.string().optional(),
    projectNumber: z.string().optional(),
    title: z.string().min(1, "Title is required").trim(),
    technicianId: z.string().min(1, "Technician is required"),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    notes: z.string().optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  })
  .refine(
    (data) => {
      if (data.referenceType === "SERVICE_ORDER") {
        return !!data.serviceOrderNumber?.trim();
      }
      if (data.referenceType === "PROJECT") {
        return !!data.projectNumber?.trim();
      }
      return false;
    },
    {
      message: "Reference number is required",
      path: ["serviceOrderNumber"],
    },
  );

const updateAssignmentSchema = z
  .object({
    id: z.string().min(1),
    referenceType: z.enum(["SERVICE_ORDER", "PROJECT"]),
    serviceOrderNumber: z.string().optional(),
    projectNumber: z.string().optional(),
    title: z.string().min(1, "Title is required").trim(),
    technicianId: z.string().min(1, "Technician is required"),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETE", "CANCELLED"]),
    notes: z.string().optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  })
  .refine(
    (data) => {
      if (data.referenceType === "SERVICE_ORDER") {
        return !!data.serviceOrderNumber?.trim();
      }
      if (data.referenceType === "PROJECT") {
        return !!data.projectNumber?.trim();
      }
      return false;
    },
    {
      message: "Reference number is required",
      path: ["serviceOrderNumber"],
    },
  );

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;

// ============================================================================
// AUTHORIZATION HELPERS
// ============================================================================

async function getOrgAndUser() {
  const [orgData, session] = await Promise.all([
    getCurrentOrganization(),
    getSession(),
  ]);

  if (!orgData || !session?.user) {
    return { orgData: null, userId: null, isAdmin: false };
  }

  const isAdmin =
    orgData.membership.role === "owner" || orgData.membership.role === "admin";

  return { orgData, userId: session.user.id, isAdmin };
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Get all service assignments for a date range
 * All authenticated users can view
 */
export async function getAssignments(
  startDate: Date | string,
  endDate: Date | string,
) {
  try {
    const start =
      typeof startDate === "string" ? new Date(startDate) : startDate;
    const end = typeof endDate === "string" ? new Date(endDate) : endDate;

    const { orgData, userId, isAdmin } = await getOrgAndUser();
    if (!orgData) {
      return {
        assignments: [],
        technicians: [],
        currentUserId: null,
        isAdmin: false,
      };
    }

    const [assignments, members] = await Promise.all([
      prisma.serviceAssignment.findMany({
        where: {
          organizationId: orgData.organization.id,
          OR: [
            { startTime: { gte: start, lte: end } },
            { endTime: { gte: start, lte: end } },
            { AND: [{ startTime: { lte: start } }, { endTime: { gte: end } }] },
          ],
        },
        include: {
          technician: {
            select: { id: true, name: true, email: true, image: true },
          },
          project: {
            select: { id: true, projectNumber: true, name: true },
          },
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.member.findMany({
        where: { organizationId: orgData.organization.id },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const technicians = members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
    }));

    return { assignments, technicians, currentUserId: userId, isAdmin };
  } catch (error) {
    console.error("[getAssignments] Error:", error);
    return {
      assignments: [],
      technicians: [],
      currentUserId: null,
      isAdmin: false,
    };
  }
}

/**
 * Create a new service assignment
 * - Admins can assign to anyone
 * - Technicians can only assign to themselves
 */
export async function createAssignment(input: CreateAssignmentInput) {
  const parsed = createAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      success: false,
      error: firstError?.message ?? "Validation failed",
    };
  }

  const { orgData, userId, isAdmin } = await getOrgAndUser();
  if (!orgData || !userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Permission check: technicians can only assign to themselves
  if (!isAdmin && parsed.data.technicianId !== userId) {
    return {
      success: false,
      error: "Du kan kun opprette oppdrag for deg selv",
    };
  }

  // Verify technician is in the organization
  const member = await prisma.member.findFirst({
    where: {
      userId: parsed.data.technicianId,
      organizationId: orgData.organization.id,
    },
  });

  if (!member) {
    return { success: false, error: "Tekniker ikke funnet i organisasjonen" };
  }

  // Handle project reference - auto-create project if needed
  let projectId: string | null = null;
  if (parsed.data.referenceType === "PROJECT" && parsed.data.projectNumber) {
    const existingProject = await prisma.project.findFirst({
      where: {
        organizationId: orgData.organization.id,
        projectNumber: parsed.data.projectNumber,
      },
    });

    if (existingProject) {
      projectId = existingProject.id;
    } else {
      // Auto-create project
      const newProject = await prisma.project.create({
        data: {
          projectNumber: parsed.data.projectNumber,
          name: parsed.data.title, // Use assignment title as initial name
          organizationId: orgData.organization.id,
        },
      });
      projectId = newProject.id;
    }
  }

  const assignment = await prisma.serviceAssignment.create({
    data: {
      referenceType: parsed.data.referenceType as ReferenceType,
      serviceOrderNumber:
        parsed.data.referenceType === "SERVICE_ORDER"
          ? parsed.data.serviceOrderNumber
          : null,
      projectId,
      title: parsed.data.title,
      technicianId: parsed.data.technicianId,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      notes: parsed.data.notes,
      organizationId: orgData.organization.id,
    },
    include: {
      technician: {
        select: { id: true, name: true, email: true },
      },
      project: true,
    },
  });

  return { success: true, assignment };
}

/**
 * Update an existing service assignment
 * - Admins can edit any assignment
 * - Technicians can only edit their own assignments
 */
export async function updateAssignment(input: UpdateAssignmentInput) {
  const parsed = updateAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      success: false,
      error: firstError?.message ?? "Validation failed",
    };
  }

  const { orgData, userId, isAdmin } = await getOrgAndUser();
  if (!orgData || !userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Verify assignment exists and belongs to org
  const existing = await prisma.serviceAssignment.findFirst({
    where: { id: parsed.data.id, organizationId: orgData.organization.id },
  });

  if (!existing) {
    return { success: false, error: "Oppdrag ikke funnet" };
  }

  // Permission check: technicians can only edit their own
  if (!isAdmin && existing.technicianId !== userId) {
    return { success: false, error: "Du kan kun redigere dine egne oppdrag" };
  }

  // Technicians cannot reassign to others
  if (!isAdmin && parsed.data.technicianId !== userId) {
    return { success: false, error: "Du kan kun tildele oppdrag til deg selv" };
  }

  // Handle project reference
  let projectId: string | null = null;
  if (parsed.data.referenceType === "PROJECT" && parsed.data.projectNumber) {
    const existingProject = await prisma.project.findFirst({
      where: {
        organizationId: orgData.organization.id,
        projectNumber: parsed.data.projectNumber,
      },
    });

    if (existingProject) {
      projectId = existingProject.id;
    } else {
      const newProject = await prisma.project.create({
        data: {
          projectNumber: parsed.data.projectNumber,
          name: parsed.data.title,
          organizationId: orgData.organization.id,
        },
      });
      projectId = newProject.id;
    }
  }

  const assignment = await prisma.serviceAssignment.update({
    where: { id: parsed.data.id },
    data: {
      referenceType: parsed.data.referenceType as ReferenceType,
      serviceOrderNumber:
        parsed.data.referenceType === "SERVICE_ORDER"
          ? parsed.data.serviceOrderNumber
          : null,
      projectId,
      title: parsed.data.title,
      technicianId: parsed.data.technicianId,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      status: parsed.data.status as AssignmentStatus,
      notes: parsed.data.notes,
    },
    include: {
      technician: {
        select: { id: true, name: true, email: true },
      },
      project: true,
    },
  });

  return { success: true, assignment };
}

/**
 * Delete a service assignment
 * - Admins can delete any
 * - Technicians can only delete their own
 */
export async function deleteAssignment(id: string) {
  const { orgData, userId, isAdmin } = await getOrgAndUser();
  if (!orgData || !userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  const existing = await prisma.serviceAssignment.findFirst({
    where: { id, organizationId: orgData.organization.id },
  });

  if (!existing) {
    return { success: false, error: "Oppdrag ikke funnet" };
  }

  // Permission check
  if (!isAdmin && existing.technicianId !== userId) {
    return { success: false, error: "Du kan kun slette dine egne oppdrag" };
  }

  await prisma.serviceAssignment.delete({ where: { id } });

  return { success: true };
}

/**
 * Update assignment status only (for quick status changes)
 */
export async function updateAssignmentStatus(
  id: string,
  status: AssignmentStatus,
) {
  const { orgData, userId, isAdmin } = await getOrgAndUser();
  if (!orgData || !userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  const existing = await prisma.serviceAssignment.findFirst({
    where: { id, organizationId: orgData.organization.id },
  });

  if (!existing) {
    return { success: false, error: "Oppdrag ikke funnet" };
  }

  // Permission check
  if (!isAdmin && existing.technicianId !== userId) {
    return { success: false, error: "Du kan kun oppdatere dine egne oppdrag" };
  }

  const assignment = await prisma.serviceAssignment.update({
    where: { id },
    data: { status },
  });

  return { success: true, assignment };
}
