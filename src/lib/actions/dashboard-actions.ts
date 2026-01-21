"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "./utils/auth";

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

const getTeamReportsSchema = z.object({
  technicianId: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(10),
});

const getRecentReportsSchema = z.object({
  limit: z.number().min(1).max(50).optional().default(5),
});

// ============================================================================
// DASHBOARD ACTIONS
// ============================================================================

/**
 * Get dashboard stats for the current organization
 */
export async function getDashboardStats() {
  const { organization } = await requireOrg();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [today, pending, thisWeek] = await Promise.all([
    // Reports created today in org
    prisma.report.count({
      where: {
        organizationId: organization.id,
        createdAt: { gte: startOfDay },
      },
    }),
    // Draft reports (pending completion) in org
    prisma.report.count({
      where: {
        organizationId: organization.id,
        status: "DRAFT",
      },
    }),
    // Reports this week in org
    prisma.report.count({
      where: {
        organizationId: organization.id,
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
export async function getRecentReports(data?: unknown) {
  const { organization } = await requireOrg();

  const input = getRecentReportsSchema.parse(data ?? {});

  const reports = await prisma.report.findMany({
    where: { organizationId: organization.id },
    orderBy: { updatedAt: "desc" },
    take: input.limit,
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

/**
 * Get team stats for admin dashboard (owners/admins only)
 * Returns per-technician breakdown of reports
 */
export async function getTeamStats() {
  const { organization, membership } = await requireOrg();

  const isAdmin = membership.role === "owner" || membership.role === "admin";

  // Get all members with their report counts
  const members = await prisma.member.findMany({
    where: { organizationId: organization.id },
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
    where: { organizationId: organization.id },
    _count: { id: true },
  });

  // Get draft counts per author
  const draftCounts = await prisma.report.groupBy({
    by: ["authorId"],
    where: { organizationId: organization.id, status: "DRAFT" },
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
export async function getTeamReports(data?: unknown) {
  const { organization } = await requireOrg();

  const input = getTeamReportsSchema.parse(data ?? {});

  const where: {
    organizationId: string;
    authorId?: string;
    assignedToId?: string;
  } = {
    organizationId: organization.id,
  };

  // If filtering by technician, check both author and assignee
  if (input.technicianId) {
    where.authorId = input.technicianId;
  }

  const reports = await prisma.report.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: input.limit,
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
