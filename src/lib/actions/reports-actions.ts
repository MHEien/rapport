"use server";

import { z } from "zod";
import type { ReportStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrg, requireAdmin, verifyReportAccess } from "./utils/auth";

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

const reportFiltersSchema = z.object({
  status: z.enum(["DRAFT", "SYNCED", "COMPLETED", "ARCHIVED"]).optional(),
  search: z.string().optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
});

const getReportsSchema = z.object({
  filters: reportFiltersSchema.optional(),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
});

const assignReportSchema = z.object({
  reportId: z.string().min(1),
  userId: z.string().min(1),
});

export type ReportFilters = z.infer<typeof reportFiltersSchema>;

/**
 * Get reports for the current user's organization
 */
export async function getReports(
  filters?: ReportFilters,
  page = 1,
  limit = 20,
) {
  const { organization } = await requireOrg();

  // Validate inputs
  const parsedFilters = filters ? reportFiltersSchema.parse(filters) : undefined;
  const parsedPage = z.number().min(1).parse(page);
  const parsedLimit = z.number().min(1).max(100).parse(limit);

  const where: {
    organizationId: string;
    status?: ReportStatus;
    OR?: Array<{
      customerName?: { contains: string; mode: "insensitive" };
    }>;
  } = {
    organizationId: organization.id,
  };

  if (parsedFilters?.status) {
    where.status = parsedFilters.status;
  }

  // Note: productName and serialNumber are now on equipment relation
  // For now, only search by customerName - could add equipment-level search later
  if (parsedFilters?.search?.trim()) {
    where.OR = [
      { customerName: { contains: parsedFilters.search, mode: "insensitive" } },
    ];
  }

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (parsedPage - 1) * parsedLimit,
      take: parsedLimit,
      select: {
        id: true,
        reportNumber: true,
        customerName: true,
        status: true,
        serviceDate: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { id: true, name: true },
        },
        assignedTo: {
          select: { id: true, name: true },
        },
        equipment: {
          select: {
            id: true,
            productName: true,
            productType: true,
          },
          take: 3, // Only fetch first 3 for preview
        },
        _count: {
          select: { equipment: true },
        },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return {
    reports,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
}

/**
 * Delete a report (must be in user's org)
 */
export async function deleteReport(reportId: unknown) {
  const { organization } = await requireOrg();
  const parsedId = z.string().min(1).parse(reportId);

  // Verify report belongs to org
  await verifyReportAccess(parsedId, organization.id);

  await prisma.report.delete({
    where: { id: parsedId },
  });

  return { success: true };
}

/**
 * Duplicate a report within the same organization
 */
export async function duplicateReport(reportId: unknown) {
  const { organization, userId } = await requireOrg();
  const parsedId = z.string().min(1).parse(reportId);

  const original = await prisma.report.findFirst({
    where: { id: parsedId, organizationId: organization.id },
    include: {
      equipment: {
        include: { checklists: true },
      },
    },
  });

  if (!original) {
    return { success: false, error: "Rapport ikke funnet" };
  }

  const duplicate = await prisma.report.create({
    data: {
      authorId: userId,
      organizationId: organization.id,
      customerName: original.customerName,
      customerAddress: original.customerAddress,
      contactPerson: original.contactPerson,
      status: "DRAFT",
      equipment: {
        create: original.equipment.map((eq, index) => ({
          productType: eq.productType,
          productName: eq.productName,
          model: eq.model,
          serialNumber: eq.serialNumber,
          jobType: eq.jobType,
          sortOrder: index,
        })),
      },
    },
  });

  return { success: true, report: duplicate };
}

/**
 * Assign a report to a technician
 * Only org owners/admins can assign reports
 */
export async function assignReport(reportId: string, userId: string) {
  const { organization } = await requireAdmin();
  const parsedReportId = z.string().min(1).parse(reportId);
  const parsedUserId = z.string().min(1).parse(userId);

  // Verify report belongs to org
  await verifyReportAccess(parsedReportId, organization.id);

  // Verify user is a member of the org
  const member = await prisma.member.findFirst({
    where: { userId: parsedUserId, organizationId: organization.id },
  });

  if (!member) {
    return { success: false, error: "Bruker er ikke medlem av organisasjonen" };
  }

  await prisma.report.update({
    where: { id: parsedReportId },
    data: { assignedToId: parsedUserId },
  });

  return { success: true };
}

/**
 * Remove assignment from a report
 */
export async function unassignReport(reportId: unknown): Promise<{ success: boolean; error?: string }> {
  const { organization } = await requireAdmin();
  const parsedId = z.string().min(1).parse(reportId);

  // Verify report belongs to org
  await verifyReportAccess(parsedId, organization.id);

  await prisma.report.update({
    where: { id: parsedId },
    data: { assignedToId: null },
  });

  return { success: true };
}

/**
 * Get all technicians in the organization for assignment dropdown
 */
export async function getOrganizationTechnicians() {
  const { organization } = await requireOrg();

  const members = await prisma.member.findMany({
    where: { organizationId: organization.id },
    select: {
      userId: true,
      role: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
  }));
}
