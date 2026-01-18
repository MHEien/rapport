"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "./org-actions";

/**
 * Get all service points for the current organization
 */
export async function getServicePoints() {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { servicePoints: [], grouped: {} };
  }

  const servicePoints = await prisma.servicePoint.findMany({
    where: { organizationId: orgData.organization.id },
    orderBy: [
      { productType: "asc" },
      { categorySortOrder: "asc" },
      { category: "asc" },
      { sortOrder: "asc" },
    ],
  });

  // Group by product type and category
  const grouped = servicePoints.reduce(
    (acc, point) => {
      if (!acc[point.productType]) {
        acc[point.productType] = {};
      }
      if (!acc[point.productType][point.category]) {
        acc[point.productType][point.category] = [];
      }
      acc[point.productType][point.category].push(point);
      return acc;
    },
    {} as Record<string, Record<string, typeof servicePoints>>,
  );

  return { servicePoints, grouped };
}

/**
 * Get distinct product types for the current organization
 */
export async function getProductTypes() {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return [];
  }

  const types = await prisma.servicePoint.findMany({
    where: { organizationId: orgData.organization.id },
    distinct: ["productType"],
    select: { productType: true },
    orderBy: { productType: "asc" },
  });
  return types.map((t) => t.productType);
}

/**
 * Create a new service point in the current organization
 */
export async function createServicePoint(input: {
  productType: string;
  category: string;
  text: string;
  isForService?: boolean;
  isForCommissioning?: boolean;
}) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Get max sortOrder for this category to append new item at end
  const maxSort = await prisma.servicePoint.aggregate({
    where: {
      organizationId: orgData.organization.id,
      productType: input.productType,
      category: input.category,
    },
    _max: { sortOrder: true },
  });
  const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  // Get existing category order (if any) or default to 0
  const existingCategoryPoint = await prisma.servicePoint.findFirst({
    where: {
      organizationId: orgData.organization.id,
      productType: input.productType,
      category: input.category,
    },
    select: { categorySortOrder: true },
  });
  let categorySortOrder: number;
  if (existingCategoryPoint) {
    categorySortOrder = existingCategoryPoint.categorySortOrder;
  } else {
    // New category, append to end
    const maxCatSort = await prisma.servicePoint.aggregate({
      where: {
        organizationId: orgData.organization.id,
        productType: input.productType,
      },
      _max: { categorySortOrder: true },
    });
    categorySortOrder = (maxCatSort._max.categorySortOrder ?? -1) + 1;
  }

  const point = await prisma.servicePoint.create({
    data: {
      organizationId: orgData.organization.id,
      productType: input.productType,
      category: input.category,
      text: input.text,
      sortOrder: nextSortOrder,
      categorySortOrder,
      isForService: input.isForService ?? true,
      isForCommissioning: input.isForCommissioning ?? true,
    },
  });
  revalidatePath("/data-editor");
  return { success: true, point };
}

/**
 * Bulk create service points in the current organization
 */
export async function bulkCreateServicePoints(
  inputs: Array<{
    productType: string;
    category: string;
    text: string;
    isForService?: boolean;
    isForCommissioning?: boolean;
  }>,
) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ikke autentisert" };
  }

  const count = await prisma.servicePoint.createMany({
    data: inputs.map((input) => ({
      organizationId: orgData.organization.id,
      productType: input.productType,
      category: input.category,
      text: input.text,
      isForService: input.isForService ?? true,
      isForCommissioning: input.isForCommissioning ?? true,
      // Default to 0 for bulk import; user can reorder later
      categorySortOrder: 0, 
    })),
  });
  revalidatePath("/data-editor");
  return { success: true, count: count.count };
}

/**
 * Update a service point (must be in user's org)
 */
export async function updateServicePoint(
  id: string,
  input: {
    text?: string;
    category?: string;
    isForService?: boolean;
    isForCommissioning?: boolean;
  },
) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Verify ownership
  const existing = await prisma.servicePoint.findFirst({
    where: { id, organizationId: orgData.organization.id },
  });
  if (!existing) {
    return { success: false, error: "Sjekkpunkt ikke funnet" };
  }

  const point = await prisma.servicePoint.update({
    where: { id },
    data: input,
  });
  revalidatePath("/data-editor");
  return { success: true, point };
}

/**
 * Delete a service point (must be in user's org)
 */
export async function deleteServicePoint(id: string) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Verify ownership
  const existing = await prisma.servicePoint.findFirst({
    where: { id, organizationId: orgData.organization.id },
  });
  if (!existing) {
    return { success: false, error: "Sjekkpunkt ikke funnet" };
  }

  await prisma.servicePoint.delete({
    where: { id },
  });
  revalidatePath("/data-editor");
  return { success: true };
}

/**
 * Create a product type (just returns success - types are inferred from service points)
 */
export async function createProductType(name: string) {
  return { success: true, productType: name };
}

/**
 * Update sort order for multiple service points (drag-and-drop reordering)
 */
export async function updateServicePointOrder(
  items: Array<{ id: string; sortOrder: number }>,
) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Update each item's sortOrder
  await prisma.$transaction(
    items.map((item) =>
      prisma.servicePoint.updateMany({
        where: {
          id: item.id,
          organizationId: orgData.organization.id,
        },
        data: { sortOrder: item.sortOrder },
      }),
    ),
  );

  revalidatePath("/data-editor");
  return { success: true };
}

/**
 * Update sort order for categories (drag-and-drop reordering)
 */
export async function updateCategoryOrder(
  items: Array<{
    productType: string;
    category: string;
    sortOrder: number;
  }>,
) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Since categories aren't normalized, we have to update all service points
  // that belong to the productType + category combination.
  await prisma.$transaction(
    items.map((item) =>
      prisma.servicePoint.updateMany({
        where: {
          organizationId: orgData.organization.id,
          productType: item.productType,
          category: item.category,
        },
        data: { categorySortOrder: item.sortOrder },
      }),
    ),
  );

  revalidatePath("/data-editor");
  return { success: true };
}
