"use server";

import { prisma } from "@/lib/prisma";

export async function getDashboardStats(authorId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [today, pending, thisWeek] = await Promise.all([
    // Reports created today
    prisma.report.count({
      where: {
        authorId,
        createdAt: { gte: startOfDay },
      },
    }),
    // Draft reports (pending completion)
    prisma.report.count({
      where: {
        authorId,
        status: "DRAFT",
      },
    }),
    // Reports this week
    prisma.report.count({
      where: {
        authorId,
        createdAt: { gte: startOfWeek },
      },
    }),
  ]);

  // Check local storage pending sync count is handled client-side
  return {
    today,
    pending,
    thisWeek,
    pendingSync: 0, // Will be updated client-side
  };
}

export async function getRecentReports(authorId: string, limit = 5) {
  const reports = await prisma.report.findMany({
    where: { authorId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      customerName: true,
      productName: true,
      status: true,
      updatedAt: true,
    },
  });

  return reports;
}

export async function createReport(input: {
  authorId: string;
  customerName: string;
  productName: string;
  productType: string;
  serialNumber?: string;
}) {
  const report = await prisma.report.create({
    data: {
      authorId: input.authorId,
      customerName: input.customerName,
      productName: input.productName,
      productType: input.productType,
      serialNumber: input.serialNumber ?? "",
      status: "DRAFT",
    },
  });

  return report;
}
