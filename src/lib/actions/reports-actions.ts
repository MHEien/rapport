"use server";

import type { ReportStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "./org-actions";

export type ReportFilters = {
  status?: ReportStatus;
  search?: string;
};

/**
 * Get reports for the current user's organization
 */
export async function getReports(
  filters?: ReportFilters,
  page = 1,
  limit = 20,
) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return {
      reports: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const where: {
    organizationId: string;
    status?: ReportStatus;
    OR?: Array<{
      customerName?: { contains: string; mode: "insensitive" };
    }>;
  } = {
    organizationId: orgData.organization.id,
  };

  if (filters?.status) {
    where.status = filters.status;
  }

  // Note: productName and serialNumber are now on equipment relation
  // For now, only search by customerName - could add equipment-level search later
  if (filters?.search?.trim()) {
    where.OR = [
      { customerName: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
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
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Delete a report (must be in user's org)
 */
export async function deleteReport(reportId: string) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Verify report belongs to org
  const report = await prisma.report.findFirst({
    where: { id: reportId, organizationId: orgData.organization.id },
  });

  if (!report) {
    return { success: false, error: "Rapport ikke funnet" };
  }

  await prisma.report.delete({
    where: { id: reportId },
  });

  return { success: true };
}

/**
 * Duplicate a report within the same organization
 */
export async function duplicateReport(reportId: string) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ikke autentisert" };
  }

  const original = await prisma.report.findFirst({
    where: { id: reportId, organizationId: orgData.organization.id },
    include: {
      equipment: {
        include: { checklists: true },
      },
    },
  });

  if (!original) {
    return { success: false, error: "Rapport ikke funnet" };
  }

  // Get current session for authorId
  const { getSession } = await import("@/lib/server");
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "Ikke autentisert" };
  }

  const duplicate = await prisma.report.create({
    data: {
      authorId: session.user.id,
      organizationId: orgData.organization.id,
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
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Check if current user is owner/admin
  if (
    orgData.membership.role !== "owner" &&
    orgData.membership.role !== "admin"
  ) {
    return { success: false, error: "Kun administratorer kan tildele rapporter" };
  }

  // Verify report belongs to org
  const report = await prisma.report.findFirst({
    where: { id: reportId, organizationId: orgData.organization.id },
  });

  if (!report) {
    return { success: false, error: "Rapport ikke funnet" };
  }

  // Verify user is a member of the org
  const member = await prisma.member.findFirst({
    where: { userId, organizationId: orgData.organization.id },
  });

  if (!member) {
    return { success: false, error: "Bruker er ikke medlem av organisasjonen" };
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { assignedToId: userId },
  });

  return { success: true };
}

/**
 * Remove assignment from a report
 */
export async function unassignReport(reportId: string) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Check if current user is owner/admin
  if (
    orgData.membership.role !== "owner" &&
    orgData.membership.role !== "admin"
  ) {
    return {
      success: false,
      error: "Kun administratorer kan fjerne tildeling",
    };
  }

  // Verify report belongs to org
  const report = await prisma.report.findFirst({
    where: { id: reportId, organizationId: orgData.organization.id },
  });

  if (!report) {
    return { success: false, error: "Rapport ikke funnet" };
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { assignedToId: null },
  });

  return { success: true };
}

/**
 * Get all technicians in the organization for assignment dropdown
 */
export async function getOrganizationTechnicians() {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return [];
  }

  const members = await prisma.member.findMany({
    where: { organizationId: orgData.organization.id },
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
