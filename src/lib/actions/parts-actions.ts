"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/server";
import { consumeFromInventory, restoreToInventory } from "./inventory-actions";
import { getCurrentOrganization } from "./org-actions";

// ============================================================================
// REPORT PARTS MANAGEMENT
// ============================================================================

export interface AddPartInput {
  reportId: string;
  partNumber: string;
  description: string;
  quantity: number;
  unit?: string;
  inventoryId?: string; // If consuming from van inventory
  inventorySessionId?: string;
}

/**
 * Add a part to a report
 * If inventoryId is provided, also consume from inventory
 */
export async function addPartToReport(input: AddPartInput) {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "Ikke autentisert" };
  }

  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ingen organisasjon funnet" };
  }

  // Verify report belongs to org
  const report = await prisma.report.findFirst({
    where: { id: input.reportId, organizationId: orgData.organization.id },
  });

  if (!report) {
    return { success: false, error: "Rapport ikke funnet" };
  }

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
      unit: input.unit || "stk",
      inventorySessionId: input.inventorySessionId,
    },
  });

  return { success: true, part };
}

/**
 * Remove a part from a report
 * If part was from inventory, restore the quantity
 */
export async function removePartFromReport(reportPartId: string) {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "Ikke autentisert" };
  }

  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ingen organisasjon funnet" };
  }

  // Get the part with its report
  const part = await prisma.reportPart.findUnique({
    where: { id: reportPartId },
    include: {
      report: {
        select: { organizationId: true },
      },
    },
  });

  if (!part || part.report.organizationId !== orgData.organization.id) {
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
    where: { id: reportPartId },
  });

  return { success: true };
}

/**
 * Update quantity of a part in a report
 */
export async function updateReportPartQuantity(
  reportPartId: string,
  newQuantity: number,
) {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "Ikke autentisert" };
  }

  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ingen organisasjon funnet" };
  }

  const part = await prisma.reportPart.findUnique({
    where: { id: reportPartId },
    include: {
      report: {
        select: { organizationId: true },
      },
    },
  });

  if (!part || part.report.organizationId !== orgData.organization.id) {
    return { success: false, error: "Del ikke funnet" };
  }

  const quantityDiff = newQuantity - part.quantity;

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
    where: { id: reportPartId },
    data: { quantity: newQuantity },
  });

  return { success: true, part: updated };
}

/**
 * Get all parts for a report
 */
export async function getReportParts(reportId: string) {
  const parts = await prisma.reportPart.findMany({
    where: { reportId },
    orderBy: { description: "asc" },
  });

  return parts;
}

/**
 * Get parts for PDF export (customer-facing, just the consumed parts)
 */
export async function getReportPartsForPdf(reportId: string) {
  const parts = await prisma.reportPart.findMany({
    where: { reportId },
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
export async function getRemainingInventoryForReport(reportId: string) {
  const session = await getSession();
  if (!session?.user) {
    return null;
  }

  // Get the report's parts to find which session was used
  const reportParts = await prisma.reportPart.findMany({
    where: { reportId },
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
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Get the inventory item details
  const inventoryItem = await prisma.vanInventory.findUnique({
    where: { id: inventoryItemId },
  });

  if (!inventoryItem) {
    return { success: false, error: "Inventardel ikke funnet" };
  }

  // Use the full addPartToReport flow
  return addPartToReport({
    reportId,
    partNumber: inventoryItem.partNumber,
    description: inventoryItem.description,
    quantity,
    unit: inventoryItem.unit || "stk",
    inventoryId: inventoryItemId,
    inventorySessionId: inventoryItem.sessionId,
  });
}
