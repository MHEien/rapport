"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "./utils/auth";

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

const createCustomerSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  contact: z.string().optional(),
});

const updateCustomerInputSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  contact: z.string().optional(),
});

const createEquipmentSchema = z.object({
  customerId: z.string().min(1),
  productType: z.string().min(1),
  productName: z.string().min(1),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
});

const updateEquipmentSchema = z.object({
  equipmentId: z.string().min(1),
  productType: z.string().optional(),
  productName: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
});

const searchCustomersSchema = z.object({
  query: z.string(),
  limit: z.number().min(1).max(50).optional().default(10),
});

// ============================================================================
// CUSTOMER CRUD OPERATIONS
// ============================================================================

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

/**
 * Create a new customer for the current organization
 */
export async function createCustomer(data: unknown) {
  const { organization } = await requireOrg();
  const input = createCustomerSchema.parse(data);

  try {
    const customer = await prisma.customer.create({
      data: {
        name: input.name,
        address: input.address,
        phone: input.phone,
        email: input.email || undefined,
        contact: input.contact,
        organizationId: organization.id,
      },
    });

    return { success: true, customer };
  } catch (error) {
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return {
        success: false,
        error: "En kunde med dette navnet finnes allerede",
      };
    }
    throw error;
  }
}

/**
 * Update an existing customer
 */
export async function updateCustomer(
  customerId: string,
  inputData: unknown,
) {
  const { organization } = await requireOrg();
  const parsedId = z.string().min(1).parse(customerId);
  const input = updateCustomerInputSchema.parse(inputData);

  // Verify customer belongs to org
  const existing = await prisma.customer.findFirst({
    where: { id: parsedId, organizationId: organization.id },
  });

  if (!existing) {
    return { success: false, error: "Kunde ikke funnet" };
  }

  const customer = await prisma.customer.update({
    where: { id: parsedId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email || null }),
      ...(input.contact !== undefined && { contact: input.contact }),
    },
  });

  return { success: true, customer };
}

/**
 * Delete a customer (cascade deletes equipment)
 */
export async function deleteCustomer(customerId: unknown) {
  const { organization } = await requireOrg();
  const parsedId = z.string().min(1).parse(customerId);

  const existing = await prisma.customer.findFirst({
    where: { id: parsedId, organizationId: organization.id },
  });

  if (!existing) {
    return { success: false, error: "Kunde ikke funnet" };
  }

  await prisma.customer.delete({
    where: { id: parsedId },
  });

  return { success: true };
}

/**
 * Get all customers for the current organization
 */
export async function getCustomers() {
  const { organization } = await requireOrg();

  const customers = await prisma.customer.findMany({
    where: { organizationId: organization.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      contact: true,
      _count: {
        select: { equipment: true, reports: true },
      },
    },
  });

  return customers;
}

/**
 * Get a single customer with their equipment and last service hours
 */
export async function getCustomerWithEquipment(customerId: unknown) {
  const { organization } = await requireOrg();
  const parsedId = z.string().min(1).parse(customerId);

  const customer = await prisma.customer.findFirst({
    where: { id: parsedId, organizationId: organization.id },
    include: {
      equipment: {
        orderBy: { productName: "asc" },
      },
    },
  });

  if (!customer) {
    return null;
  }

  // For each equipment, find the last running hours from reports
  const equipmentWithHistory = await Promise.all(
    customer.equipment.map(async (eq) => {
      // Find the most recent report equipment entry for this customer equipment
      const lastReportEquipment = await prisma.reportEquipment.findFirst({
        where: {
          customerEquipmentId: eq.id,
          runningHours: { not: null },
        },
        orderBy: {
          report: { serviceDate: "desc" },
        },
        select: {
          runningHours: true,
          report: {
            select: {
              serviceDate: true,
              reportNumber: true,
            },
          },
        },
      });

      return {
        ...eq,
        lastRunningHours: lastReportEquipment?.runningHours ?? null,
        lastServiceDate: lastReportEquipment?.report.serviceDate ?? null,
        lastReportNumber: lastReportEquipment?.report.reportNumber ?? null,
      };
    }),
  );

  return {
    ...customer,
    equipment: equipmentWithHistory,
  };
}

// ============================================================================
// CUSTOMER EQUIPMENT CRUD
// ============================================================================

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;

/**
 * Add equipment to a customer
 */
export async function addCustomerEquipment(data: unknown) {
  const { organization } = await requireOrg();
  const input = createEquipmentSchema.parse(data);

  // Verify customer belongs to org
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, organizationId: organization.id },
  });

  if (!customer) {
    return { success: false, error: "Kunde ikke funnet" };
  }

  const equipment = await prisma.customerEquipment.create({
    data: {
      customerId: input.customerId,
      productType: input.productType,
      productName: input.productName,
      model: input.model,
      serialNumber: input.serialNumber,
    },
  });

  return { success: true, equipment };
}

/**
 * Update customer equipment
 */
export async function updateCustomerEquipment(data: unknown) {
  const { organization } = await requireOrg();
  const input = updateEquipmentSchema.parse(data);

  // Verify equipment belongs to a customer in this org
  const existing = await prisma.customerEquipment.findFirst({
    where: {
      id: input.equipmentId,
      customer: { organizationId: organization.id },
    },
  });

  if (!existing) {
    return { success: false, error: "Utstyr ikke funnet" };
  }

  const equipment = await prisma.customerEquipment.update({
    where: { id: input.equipmentId },
    data: {
      ...(input.productType && { productType: input.productType }),
      ...(input.productName && { productName: input.productName }),
      ...(input.model !== undefined && { model: input.model }),
      ...(input.serialNumber !== undefined && {
        serialNumber: input.serialNumber,
      }),
    },
  });

  return { success: true, equipment };
}

/**
 * Delete customer equipment
 */
export async function deleteCustomerEquipment(equipmentId: unknown) {
  const { organization } = await requireOrg();
  const parsedId = z.string().min(1).parse(equipmentId);

  const existing = await prisma.customerEquipment.findFirst({
    where: {
      id: parsedId,
      customer: { organizationId: organization.id },
    },
  });

  if (!existing) {
    return { success: false, error: "Utstyr ikke funnet" };
  }

  await prisma.customerEquipment.delete({
    where: { id: parsedId },
  });

  return { success: true };
}

// ============================================================================
// SEARCH & AUTOCOMPLETE
// ============================================================================

/**
 * Search customers by name (for autocomplete)
 */
export async function searchCustomers(query: string, limit = 10) {
  const { organization } = await requireOrg();
  const parsedQuery = z.string().parse(query);
  const parsedLimit = z.number().min(1).max(50).parse(limit);

  const customers = await prisma.customer.findMany({
    where: {
      organizationId: organization.id,
      name: { contains: parsedQuery, mode: "insensitive" },
    },
    orderBy: { name: "asc" },
    take: parsedLimit,
    select: {
      id: true,
      name: true,
      address: true,
      contact: true,
    },
  });

  return customers;
}
