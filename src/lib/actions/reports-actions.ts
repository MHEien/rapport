"use server";

import type { ReportStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type ReportFilters = {
  status?: ReportStatus;
  search?: string;
};

export async function getReports(
  authorId: string,
  filters?: ReportFilters,
  page = 1,
  limit = 20,
) {
  const where: {
    authorId: string;
    status?: ReportStatus;
    OR?: Array<{
      customerName?: { contains: string; mode: "insensitive" };
      productName?: { contains: string; mode: "insensitive" };
      serialNumber?: { contains: string; mode: "insensitive" };
    }>;
  } = {
    authorId,
  };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.search?.trim()) {
    where.OR = [
      { customerName: { contains: filters.search, mode: "insensitive" } },
      { productName: { contains: filters.search, mode: "insensitive" } },
      { serialNumber: { contains: filters.search, mode: "insensitive" } },
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
        productName: true,
        productType: true,
        serialNumber: true,
        status: true,
        serviceDate: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { checklists: true },
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

export async function deleteReport(reportId: string, authorId: string) {
  // Verify ownership
  const report = await prisma.report.findFirst({
    where: { id: reportId, authorId },
  });

  if (!report) {
    return { success: false, error: "Rapport ikke funnet" };
  }

  await prisma.report.delete({
    where: { id: reportId },
  });

  return { success: true };
}

export async function duplicateReport(reportId: string, authorId: string) {
  const original = await prisma.report.findFirst({
    where: { id: reportId, authorId },
    include: { checklists: true },
  });

  if (!original) {
    return { success: false, error: "Rapport ikke funnet" };
  }

  const duplicate = await prisma.report.create({
    data: {
      authorId,
      customerName: original.customerName,
      customerAddress: original.customerAddress,
      contactPerson: original.contactPerson,
      productName: original.productName,
      productType: original.productType,
      serialNumber: original.serialNumber,
      type: original.type,
      status: "DRAFT",
    },
  });

  return { success: true, report: duplicate };
}
