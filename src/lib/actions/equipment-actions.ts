"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/server";
import { getCurrentOrganization } from "./org-actions";
import type { ReportType } from "@/app/generated/prisma/client";

// ============================================================================
// CREATE EQUIPMENT
// ============================================================================

export interface CreateEquipmentInput {
  reportId: string;
  productType: string;
  productName: string;
  model?: string;
  serialNumber?: string;
  runningHours?: number;
  jobType?: ReportType;
  sortOrder?: number;
}

export async function addEquipmentToReport(input: CreateEquipmentInput) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Ikke autentisert");
  }

  const equipment = await prisma.reportEquipment.create({
    data: {
      reportId: input.reportId,
      productType: input.productType,
      productName: input.productName,
      model: input.model,
      serialNumber: input.serialNumber,
      runningHours: input.runningHours,
      jobType: input.jobType ?? "SERVICE",
      sortOrder: input.sortOrder ?? 0,
    },
  });

  return { success: true, equipment };
}

// ============================================================================
// BULK CREATE EQUIPMENT (for new report creation)
// ============================================================================

export interface BulkEquipmentInput {
  productType: string;
  productName: string;
  model?: string;
  serialNumber?: string;
  runningHours?: number;
  jobType?: ReportType;
  included?: boolean;
}

export async function createReportWithEquipment(input: {
  customerName: string;
  contactPerson?: string;
  equipment: BulkEquipmentInput[];
}) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Ikke autentisert");
  }

  const orgData = await getCurrentOrganization();
  if (!orgData) {
    throw new Error("Ingen organisasjon funnet");
  }

  // Create report with equipment in a transaction
  const report = await prisma.report.create({
    data: {
      authorId: session.user.id,
      organizationId: orgData.organization.id,
      customerName: input.customerName,
      contactPerson: input.contactPerson,
      status: "DRAFT",
      equipment: {
        create: input.equipment
          .filter(eq => eq.included !== false)
          .map((eq, index) => ({
            productType: eq.productType,
            productName: eq.productName,
            model: eq.model,
            serialNumber: eq.serialNumber,
            runningHours: eq.runningHours,
            jobType: eq.jobType ?? "SERVICE",
            sortOrder: index,
          })),
      },
    },
    include: {
      equipment: true,
    },
  });

  return report;
}

// ============================================================================
// UPDATE EQUIPMENT
// ============================================================================

export interface UpdateEquipmentInput {
  equipmentId: string;
  productType?: string;
  productName?: string;
  model?: string;
  serialNumber?: string;
  runningHours?: number;
  jobType?: ReportType;
  included?: boolean;
}

export async function updateReportEquipment(input: UpdateEquipmentInput) {
  const { equipmentId, ...data } = input;

  const equipment = await prisma.reportEquipment.update({
    where: { id: equipmentId },
    data: {
      ...(data.productType && { productType: data.productType }),
      ...(data.productName && { productName: data.productName }),
      ...(data.model !== undefined && { model: data.model }),
      ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
      ...(data.runningHours !== undefined && { runningHours: data.runningHours }),
      ...(data.jobType && { jobType: data.jobType }),
      ...(data.included !== undefined && { included: data.included }),
    },
  });

  return { success: true, equipment };
}

// ============================================================================
// REMOVE EQUIPMENT
// ============================================================================

export async function removeReportEquipment(equipmentId: string) {
  await prisma.reportEquipment.delete({
    where: { id: equipmentId },
  });

  return { success: true };
}

// ============================================================================
// REORDER EQUIPMENT
// ============================================================================

export async function reorderReportEquipment(
  reportId: string,
  orderedIds: string[]
) {
  // Update sort order for each equipment item
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.reportEquipment.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  return { success: true };
}

// ============================================================================
// GET EQUIPMENT FOR REPORT
// ============================================================================

export async function getReportEquipment(reportId: string) {
  const equipment = await prisma.reportEquipment.findMany({
    where: { reportId },
    orderBy: { sortOrder: "asc" },
    include: {
      checklists: {
        include: {
          photos: true,
        },
      },
    },
  });

  return equipment;
}
