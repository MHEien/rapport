"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrg, verifyReportAccess } from "./utils/auth";
import { consumeFromInventory, restoreToInventory } from "./inventory-actions";

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

const addPartSchema = z.object({
  reportId: z.string().min(1),
  partNumber: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().min(1),
  unit: z.string().optional().default("stk"),
  inventoryId: z.string().optional(),
  inventorySessionId: z.string().optional(),
});

const updatePartQuantitySchema = z.object({
  reportPartId: z.string().min(1),
  newQuantity: z.number().min(1),
});

const addFromInventorySchema = z.object({
  reportId: z.string().min(1),
  inventoryItemId: z.string().min(1),
  quantity: z.number().min(1),
});

// ============================================================================
// REPORT PARTS MANAGEMENT
// ============================================================================

export type AddPartInput = z.infer<typeof addPartSchema>;

/**
 * Add a part to a report
 * If inventoryId is provided, also consume from inventory
 */
export async function addPartToReport(data: unknown) {
  const { organization } = await requireOrg();
  const input = addPartSchema.parse(data);

  // Verify report belongs to org
  await verifyReportAccess(input.reportId, organization.id);

  // If consuming from inventory, update inventory first
  if (input.inventoryId) {
    const consumeResult = await consumeFromInventory(
      input.inventoryId,
      input.quantity,
    );
    if (!consumeResult.success) {
      return consumeResult;
    }
  }

  // Create the report part
  const part = await prisma.reportPart.create({
    data: {
      reportId: input.reportId,
      partNumber: input.partNumber,
      description: input.description,
      quantity: input.quantity,
      unit: input.unit,
      inventorySessionId: input.inventorySessionId,
    },
  });

  return { success: true, part };
}

/**
 * Remove a part from a report
 * If part was from inventory, restore the quantity
 */
export async function removePartFromReport(reportPartId: unknown) {
  const { organization } = await requireOrg();
  const parsedId = z.string().min(1).parse(reportPartId);

  // Get the part with its report
  const part = await prisma.reportPart.findFirst({
    where: {
      id: parsedId,
      report: { organizationId: organization.id },
    },
    include: {
      report: {
        select: { organizationId: true },
      },
    },
  });

  if (!part) {
    return { success: false, error: "Del ikke funnet" };
  }

  // If the part was from an inventory session, try to restore
  if (part.inventorySessionId) {
    // Find the inventory item to restore to
    const inventoryItem = await prisma.vanInventory.findFirst({
      where: {
        sessionId: part.inventorySessionId,
        partNumber: part.partNumber,
      },
    });

    if (inventoryItem) {
      await restoreToInventory(inventoryItem.id, part.quantity);
    }
  }

  // Delete the report part
  await prisma.reportPart.delete({
    where: { id: parsedId },
  });

  return { success: true };
}

/**
 * Update quantity of a part in a report
 */
export async function updateReportPartQuantity(data: unknown) {
  const { organization } = await requireOrg();
  const input = updatePartQuantitySchema.parse(data);

  const part = await prisma.reportPart.findFirst({
    where: {
      id: input.reportPartId,
      report: { organizationId: organization.id },
    },
    include: {
      report: {
        select: { organizationId: true },
      },
    },
  });

  if (!part) {
    return { success: false, error: "Del ikke funnet" };
  }

  const quantityDiff = input.newQuantity - part.quantity;

  // If from inventory, adjust inventory accordingly
  if (part.inventorySessionId && quantityDiff !== 0) {
    const inventoryItem = await prisma.vanInventory.findFirst({
      where: {
        sessionId: part.inventorySessionId,
        partNumber: part.partNumber,
      },
    });

    if (inventoryItem) {
      if (quantityDiff > 0) {
        // Using more - consume additional
        const consumeResult = await consumeFromInventory(
          inventoryItem.id,
          quantityDiff,
        );
        if (!consumeResult.success) {
          return consumeResult;
        }
      } else {
        // Using less - restore some
        await restoreToInventory(inventoryItem.id, Math.abs(quantityDiff));
      }
    }
  }

  const updated = await prisma.reportPart.update({
    where: { id: input.reportPartId },
    data: { quantity: input.newQuantity },
  });

  return { success: true, part: updated };
}

/**
 * Get all parts for a report
 */
export async function getReportParts(reportId: unknown) {
  const { organization } = await requireOrg();
  const parsedId = z.string().min(1).parse(reportId);

  // Verify report belongs to org
  await verifyReportAccess(parsedId, organization.id);

  const parts = await prisma.reportPart.findMany({
    where: { reportId: parsedId },
    orderBy: { description: "asc" },
  });

  return parts;
}

/**
 * Get parts for PDF export (customer-facing, just the consumed parts)
 */
export async function getReportPartsForPdf(reportId: unknown) {
  const { organization } = await requireOrg();
  const parsedId = z.string().min(1).parse(reportId);

  // Verify report belongs to org
  await verifyReportAccess(parsedId, organization.id);

  const parts = await prisma.reportPart.findMany({
    where: { reportId: parsedId },
    orderBy: { description: "asc" },
    select: {
      partNumber: true,
      description: true,
      quantity: true,
      unit: true,
    },
  });

  return parts;
}

/**
 * Get remaining inventory after a report's consumption
 * This is for the technician dashboard (internal only)
 */
export async function getRemainingInventoryForReport(reportId: unknown) {
  const { organization } = await requireOrg();
  const parsedId = z.string().min(1).parse(reportId);

  // Verify report belongs to org
  await verifyReportAccess(parsedId, organization.id);

  // Get the report's parts to find which session was used
  const reportParts = await prisma.reportPart.findMany({
    where: { reportId: parsedId },
    select: { inventorySessionId: true },
  });

  // Get unique session IDs
  const sessionIds = [
    ...new Set(
      reportParts.map((p) => p.inventorySessionId).filter(Boolean) as string[],
    ),
  ];

  if (sessionIds.length === 0) {
    return null;
  }

  // Get all remaining inventory from these sessions
  const remaining = await prisma.vanInventory.findMany({
    where: {
      sessionId: { in: sessionIds },
      remaining: { gt: 0 },
    },
    orderBy: { description: "asc" },
    select: {
      id: true,
      partNumber: true,
      description: true,
      quantity: true,
      remaining: true,
      unit: true,
    },
  });

  return {
    sessionIds,
    items: remaining,
    totalRemaining: remaining.reduce((sum, item) => sum + item.remaining, 0),
  };
}

/**
 * Quick add part from current inventory session to report
 */
export async function addPartFromInventory(
  reportId: string,
  inventoryItemId: string,
  quantity: number,
) {
  const { organization } = await requireOrg();

  // Validate inputs
  const parsedReportId = z.string().min(1).parse(reportId);
  const parsedInventoryItemId = z.string().min(1).parse(inventoryItemId);
  const parsedQuantity = z.number().min(1).parse(quantity);

  // Verify report belongs to org
  await verifyReportAccess(parsedReportId, organization.id);

  // Get the inventory item details
  const inventoryItem = await prisma.vanInventory.findFirst({
    where: {
      id: parsedInventoryItemId,
      organizationId: organization.id,
    },
  });

  if (!inventoryItem) {
    return { success: false, error: "Inventardel ikke funnet" };
  }

  // Use the full addPartToReport flow
  return addPartToReport({
    reportId: parsedReportId,
    partNumber: inventoryItem.partNumber,
    description: inventoryItem.description,
    quantity: parsedQuantity,
    unit: inventoryItem.unit || "stk",
    inventoryId: parsedInventoryItemId,
    inventorySessionId: inventoryItem.sessionId,
  });
}
