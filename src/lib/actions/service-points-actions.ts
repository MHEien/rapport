"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "./utils/auth";

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

const createServicePointSchema = z.object({
  productType: z.string().min(1),
  category: z.string().min(1),
  text: z.string().min(1),
  isForService: z.boolean().optional().default(true),
  isForCommissioning: z.boolean().optional().default(true),
});

const bulkCreateServicePointSchema = z.array(createServicePointSchema);

const updateServicePointInputSchema = z.object({
  text: z.string().optional(),
  category: z.string().optional(),
  isForService: z.boolean().optional(),
  isForCommissioning: z.boolean().optional(),
});

const updateOrderSchema = z.array(
  z.object({
    id: z.string().min(1),
    sortOrder: z.number(),
  }),
);

const updateCategoryOrderSchema = z.array(
  z.object({
    productType: z.string().min(1),
    category: z.string().min(1),
    sortOrder: z.number(),
  }),
);

// ============================================================================
// SERVICE POINT ACTIONS
// ============================================================================

/**
 * Get all service points for the current organization
 */
export async function getServicePoints() {
  const { organization } = await requireOrg();

  const servicePoints = await prisma.servicePoint.findMany({
    where: { organizationId: organization.id },
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
  const { organization } = await requireOrg();

  const types = await prisma.servicePoint.findMany({
    where: { organizationId: organization.id },
    distinct: ["productType"],
    select: { productType: true },
    orderBy: { productType: "asc" },
  });
  return types.map((t) => t.productType);
}

/**
 * Create a new service point in the current organization
 */
export async function createServicePoint(data: unknown) {
  const { organization } = await requireOrg();
  const input = createServicePointSchema.parse(data);

  // Get max sortOrder for this category to append new item at end
  const maxSort = await prisma.servicePoint.aggregate({
    where: {
      organizationId: organization.id,
      productType: input.productType,
      category: input.category,
    },
    _max: { sortOrder: true },
  });
  const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  // Get existing category order (if any) or default to 0
  const existingCategoryPoint = await prisma.servicePoint.findFirst({
    where: {
      organizationId: organization.id,
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
        organizationId: organization.id,
        productType: input.productType,
      },
      _max: { categorySortOrder: true },
    });
    categorySortOrder = (maxCatSort._max.categorySortOrder ?? -1) + 1;
  }

  const point = await prisma.servicePoint.create({
    data: {
      organizationId: organization.id,
      productType: input.productType,
      category: input.category,
      text: input.text,
      sortOrder: nextSortOrder,
      categorySortOrder,
      isForService: input.isForService,
      isForCommissioning: input.isForCommissioning,
    },
  });
  revalidatePath("/data-editor");
  return { success: true, point };
}

/**
 * Bulk create service points in the current organization
 */
export async function bulkCreateServicePoints(data: unknown) {
  const { organization } = await requireOrg();
  const inputs = bulkCreateServicePointSchema.parse(data);

  const count = await prisma.servicePoint.createMany({
    data: inputs.map((input) => ({
      organizationId: organization.id,
      productType: input.productType,
      category: input.category,
      text: input.text,
      isForService: input.isForService,
      isForCommissioning: input.isForCommissioning,
      // Default to 0 for bulk import; user can reorder later
      categorySortOrder: 0,
    })),
    skipDuplicates: true,
  });
  revalidatePath("/data-editor");
  return { success: true, count: count.count };
}

/**
 * Update a service point (must be in user's org)
 */
export async function updateServicePoint(
  servicePointId: string,
  inputData: unknown,
) {
  const { organization } = await requireOrg();
  const parsedId = z.string().min(1).parse(servicePointId);
  const input = updateServicePointInputSchema.parse(inputData);

  // Verify ownership
  const existing = await prisma.servicePoint.findFirst({
    where: { id: parsedId, organizationId: organization.id },
  });
  if (!existing) {
    return { success: false, error: "Sjekkpunkt ikke funnet" };
  }

  const point = await prisma.servicePoint.update({
    where: { id: parsedId },
    data: {
      ...(input.text !== undefined && { text: input.text }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.isForService !== undefined && { isForService: input.isForService }),
      ...(input.isForCommissioning !== undefined && { isForCommissioning: input.isForCommissioning }),
    },
  });
  revalidatePath("/data-editor");
  return { success: true, point };
}

/**
 * Delete a service point (must be in user's org)
 */
export async function deleteServicePoint(servicePointId: unknown) {
  const { organization } = await requireOrg();
  const parsedId = z.string().min(1).parse(servicePointId);

  // Verify ownership
  const existing = await prisma.servicePoint.findFirst({
    where: { id: parsedId, organizationId: organization.id },
  });
  if (!existing) {
    return { success: false, error: "Sjekkpunkt ikke funnet" };
  }

  await prisma.servicePoint.delete({
    where: { id: parsedId },
  });
  revalidatePath("/data-editor");
  return { success: true };
}

/**
 * Create a product type (just returns success - types are inferred from service points)
 */
export async function createProductType(name: unknown) {
  await requireOrg(); // Ensure authenticated
  const parsedName = z.string().min(1).parse(name);
  return { success: true, productType: parsedName };
}

/**
 * Update sort order for multiple service points (drag-and-drop reordering)
 */
export async function updateServicePointOrder(data: unknown) {
  const { organization } = await requireOrg();
  const items = updateOrderSchema.parse(data);

  // Update each item's sortOrder
  await prisma.$transaction(
    items.map((item) =>
      prisma.servicePoint.updateMany({
        where: {
          id: item.id,
          organizationId: organization.id,
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
export async function updateCategoryOrder(data: unknown) {
  const { organization } = await requireOrg();
  const items = updateCategoryOrderSchema.parse(data);

  // Since categories aren't normalized, we have to update all service points
  // that belong to the productType + category combination.
  await prisma.$transaction(
    items.map((item) =>
      prisma.servicePoint.updateMany({
        where: {
          organizationId: organization.id,
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
