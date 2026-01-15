"use server";

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
    orderBy: [{ productType: "asc" }, { category: "asc" }, { text: "asc" }],
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

  const point = await prisma.servicePoint.create({
    data: {
      organizationId: orgData.organization.id,
      productType: input.productType,
      category: input.category,
      text: input.text,
      isForService: input.isForService ?? true,
      isForCommissioning: input.isForCommissioning ?? true,
    },
  });
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
    })),
  });
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
  return { success: true };
}

/**
 * Create a product type (just returns success - types are inferred from service points)
 */
export async function createProductType(name: string) {
  return { success: true, productType: name };
}
