"use server";

import { prisma } from "@/lib/prisma";

export async function getServicePoints() {
  const servicePoints = await prisma.servicePoint.findMany({
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

export async function getProductTypes() {
  const types = await prisma.servicePoint.findMany({
    distinct: ["productType"],
    select: { productType: true },
    orderBy: { productType: "asc" },
  });
  return types.map((t) => t.productType);
}

export async function createServicePoint(input: {
  productType: string;
  category: string;
  text: string;
  isForService?: boolean;
  isForCommissioning?: boolean;
}) {
  const point = await prisma.servicePoint.create({
    data: {
      productType: input.productType,
      category: input.category,
      text: input.text,
      isForService: input.isForService ?? true,
      isForCommissioning: input.isForCommissioning ?? true,
    },
  });
  return { success: true, point };
}

export async function bulkCreateServicePoints(
  inputs: Array<{
    productType: string;
    category: string;
    text: string;
    isForService?: boolean;
    isForCommissioning?: boolean;
  }>,
) {
  const count = await prisma.servicePoint.createMany({
    data: inputs.map((input) => ({
      productType: input.productType,
      category: input.category,
      text: input.text,
      isForService: input.isForService ?? true,
      isForCommissioning: input.isForCommissioning ?? true,
    })),
  });
  return { success: true, count: count.count };
}

export async function updateServicePoint(
  id: string,
  input: {
    text?: string;
    category?: string;
    isForService?: boolean;
    isForCommissioning?: boolean;
  },
) {
  const point = await prisma.servicePoint.update({
    where: { id },
    data: input,
  });
  return { success: true, point };
}

export async function deleteServicePoint(id: string) {
  await prisma.servicePoint.delete({
    where: { id },
  });
  return { success: true };
}

export async function createProductType(name: string) {
  // Just return success - product types are inferred from service points
  return { success: true, productType: name };
}
