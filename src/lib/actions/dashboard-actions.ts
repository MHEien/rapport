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

/**
 * Get team stats for admin dashboard (owners/admins only)
 * Returns per-technician breakdown of reports
 */
export async function getTeamStats() {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { members: [], isAdmin: false };
  }

  const isAdmin =
    orgData.membership.role === "owner" ||
    orgData.membership.role === "admin";

  // Get all members with their report counts
  const members = await prisma.member.findMany({
    where: { organizationId: orgData.organization.id },
    select: {
      id: true,
      role: true,
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  // Get report counts per author
  const reportCounts = await prisma.report.groupBy({
    by: ["authorId"],
    where: { organizationId: orgData.organization.id },
    _count: { id: true },
  });

  // Get draft counts per author
  const draftCounts = await prisma.report.groupBy({
    by: ["authorId"],
    where: { organizationId: orgData.organization.id, status: "DRAFT" },
    _count: { id: true },
  });

  // Merge data
  const memberStats = members.map((member) => {
    const totalReports =
      reportCounts.find((r) => r.authorId === member.user.id)?._count.id || 0;
    const drafts =
      draftCounts.find((r) => r.authorId === member.user.id)?._count.id || 0;

    return {
      id: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
      role: member.role,
      totalReports,
      drafts,
      completed: totalReports - drafts,
    };
  });

  return { members: memberStats, isAdmin };
}

/**
 * Get team reports for admin dashboard with optional technician filter
 */
export async function getTeamReports(technicianId?: string, limit = 10) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return [];
  }

  const where: {
    organizationId: string;
    authorId?: string;
    assignedToId?: string;
  } = {
    organizationId: orgData.organization.id,
  };

  // If filtering by technician, check both author and assignee
  if (technicianId) {
    where.authorId = technicianId;
  }

  const reports = await prisma.report.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      reportNumber: true,
      customerName: true,
      status: true,
      serviceDate: true,
      updatedAt: true,
      author: {
        select: { id: true, name: true },
      },
      assignedTo: {
        select: { id: true, name: true },
      },
      equipment: {
        select: { id: true, productName: true },
        take: 1,
      },
    },
  });

  return reports;
}
