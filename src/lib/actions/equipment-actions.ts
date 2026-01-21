"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ReportType } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireOrg,
  verifyReportAccess,
  verifyEquipmentAccess,
} from "./utils/auth";

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

const createEquipmentSchema = z.object({
  reportId: z.string().min(1),
  productType: z.string().min(1),
  productName: z.string().min(1),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  runningHours: z.number().optional(),
  jobType: z.enum(["SERVICE", "COMMISSIONING"]).optional().default("SERVICE"),
  sortOrder: z.number().optional().default(0),
});

const bulkEquipmentItemSchema = z.object({
  productType: z.string().min(1),
  productName: z.string().min(1),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  runningHours: z.number().optional(),
  jobType: z.enum(["SERVICE", "COMMISSIONING"]).optional().default("SERVICE"),
  included: z.boolean().optional().default(true),
  customerEquipmentId: z.string().optional(),
});

const createReportWithEquipmentSchema = z.object({
  customerName: z.string().min(1),
  contactPerson: z.string().optional(),
  customerId: z.string().optional(),
  soNumber: z.string().optional(),
  equipment: z.array(bulkEquipmentItemSchema),
});

const updateEquipmentSchema = z.object({
  equipmentId: z.string().min(1),
  productType: z.string().optional(),
  productName: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  runningHours: z.number().optional(),
  jobType: z.enum(["SERVICE", "COMMISSIONING"]).optional(),
  included: z.boolean().optional(),
});

const reorderEquipmentSchema = z.object({
  reportId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)),
});

// ============================================================================
// CREATE EQUIPMENT
// ============================================================================

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;

export async function addEquipmentToReport(data: unknown) {
  const { organization } = await requireOrg();
  const input = createEquipmentSchema.parse(data);

  // Verify report belongs to user's organization
  await verifyReportAccess(input.reportId, organization.id);

  const equipment = await prisma.reportEquipment.create({
    data: {
      reportId: input.reportId,
      productType: input.productType,
      productName: input.productName,
      model: input.model,
      serialNumber: input.serialNumber,
      runningHours: input.runningHours,
      jobType: input.jobType as ReportType,
      sortOrder: input.sortOrder,
    },
  });

  return { success: true, equipment };
}

// ============================================================================
// BULK CREATE EQUIPMENT (for new report creation)
// ============================================================================

export type BulkEquipmentInput = z.infer<typeof bulkEquipmentItemSchema>;

export async function createReportWithEquipment(data: unknown) {
  const { organization, userId } = await requireOrg();
  const input = createReportWithEquipmentSchema.parse(data);

  // Create report with equipment in a transaction
  const report = await prisma.report.create({
    data: {
      authorId: userId,
      organizationId: organization.id,
      customerName: input.customerName,
      contactPerson: input.contactPerson,
      customerId: input.customerId,
      soNumber: input.soNumber,
      status: "DRAFT",
      equipment: {
        create: input.equipment
          .filter((eq) => eq.included !== false)
          .map((eq, index) => ({
            productType: eq.productType,
            productName: eq.productName,
            model: eq.model,
            serialNumber: eq.serialNumber,
            runningHours: eq.runningHours,
            jobType: (eq.jobType ?? "SERVICE") as ReportType,
            sortOrder: index,
            customerEquipmentId: eq.customerEquipmentId,
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

export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;

export async function updateReportEquipment(data: unknown) {
  const { organization } = await requireOrg();
  const input = updateEquipmentSchema.parse(data);

  // Verify equipment belongs to user's organization
  await verifyEquipmentAccess(input.equipmentId, organization.id);

  const equipment = await prisma.reportEquipment.update({
    where: { id: input.equipmentId },
    data: {
      ...(input.productType && { productType: input.productType }),
      ...(input.productName && { productName: input.productName }),
      ...(input.model !== undefined && { model: input.model }),
      ...(input.serialNumber !== undefined && {
        serialNumber: input.serialNumber,
      }),
      ...(input.runningHours !== undefined && {
        runningHours: input.runningHours,
      }),
      ...(input.jobType && { jobType: input.jobType as ReportType }),
      ...(input.included !== undefined && { included: input.included }),
    },
  });

  revalidatePath("/reports/[id]/edit", "page");
  return { success: true, equipment };
}

// ============================================================================
// REMOVE EQUIPMENT
// ============================================================================

export async function removeReportEquipment(equipmentId: unknown) {
  const { organization } = await requireOrg();
  const parsedId = z.string().min(1).parse(equipmentId);

  // Verify equipment belongs to user's organization
  await verifyEquipmentAccess(parsedId, organization.id);

  await prisma.reportEquipment.delete({
    where: { id: parsedId },
  });

  return { success: true };
}

// ============================================================================
// REORDER EQUIPMENT
// ============================================================================

export async function reorderReportEquipment(data: unknown) {
  const { organization } = await requireOrg();
  const input = reorderEquipmentSchema.parse(data);

  // Verify report belongs to user's organization
  await verifyReportAccess(input.reportId, organization.id);

  // Also verify each equipment ID belongs to this report
  const existingEquipment = await prisma.reportEquipment.findMany({
    where: {
      reportId: input.reportId,
      id: { in: input.orderedIds },
    },
    select: { id: true },
  });

  const existingIds = new Set(existingEquipment.map((e) => e.id));
  for (const id of input.orderedIds) {
    if (!existingIds.has(id)) {
      throw new Error("Utstyr ikke funnet i rapporten");
    }
  }

  // Update sort order for each equipment item
  await prisma.$transaction(
    input.orderedIds.map((id, index) =>
      prisma.reportEquipment.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  return { success: true };
}

// ============================================================================
// GET EQUIPMENT FOR REPORT
// ============================================================================

export async function getReportEquipment(reportId: unknown) {
  const { organization } = await requireOrg();
  const parsedId = z.string().min(1).parse(reportId);

  // Verify report belongs to user's organization
  await verifyReportAccess(parsedId, organization.id);

  const equipment = await prisma.reportEquipment.findMany({
    where: { reportId: parsedId },
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
