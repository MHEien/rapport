"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "./org-actions";

/**
 * Get dashboard stats for the current organization
 */
export async function getDashboardStats() {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { today: 0, pending: 0, thisWeek: 0, pendingSync: 0 };
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [today, pending, thisWeek] = await Promise.all([
    // Reports created today in org
    prisma.report.count({
      where: {
        organizationId: orgData.organization.id,
        createdAt: { gte: startOfDay },
      },
    }),
    // Draft reports (pending completion) in org
    prisma.report.count({
      where: {
        organizationId: orgData.organization.id,
        status: "DRAFT",
      },
    }),
    // Reports this week in org
    prisma.report.count({
      where: {
        organizationId: orgData.organization.id,
        createdAt: { gte: startOfWeek },
      },
    }),
  ]);

  return {
    today,
    pending,
    thisWeek,
    pendingSync: 0, // Will be updated client-side
  };
}

/**
 * Get recent reports for the current organization
 */
export async function getRecentReports(limit = 5) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return [];
  }

  const reports = await prisma.report.findMany({
    where: { organizationId: orgData.organization.id },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      customerName: true,
      status: true,
      updatedAt: true,
      equipment: {
        select: {
          id: true,
          productName: true,
          productType: true,
        },
        take: 1,
      },
      _count: {
        select: { equipment: true },
      },
    },
  });

  return reports;
}

// Note: createReport is deprecated - use createReportWithEquipment from equipment-actions.ts
