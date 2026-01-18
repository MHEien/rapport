"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/server";
import { getCurrentOrganization } from "./org-actions";

// ============================================================================
// CUSTOMER CRUD OPERATIONS
// ============================================================================

export interface CreateCustomerInput {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  contact?: string;
}

/**
 * Create a new customer for the current organization
 */
export async function createCustomer(input: CreateCustomerInput) {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "Ikke autentisert" };
  }

  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ingen organisasjon funnet" };
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        name: input.name,
        address: input.address,
        phone: input.phone,
        email: input.email,
        contact: input.contact,
        organizationId: orgData.organization.id,
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
  input: Partial<CreateCustomerInput>,
) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ingen organisasjon funnet" };
  }

  // Verify customer belongs to org
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: orgData.organization.id },
  });

  if (!existing) {
    return { success: false, error: "Kunde ikke funnet" };
  }

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.contact !== undefined && { contact: input.contact }),
    },
  });

  return { success: true, customer };
}

/**
 * Delete a customer (cascade deletes equipment)
 */
export async function deleteCustomer(customerId: string) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ingen organisasjon funnet" };
  }

  const existing = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: orgData.organization.id },
  });

  if (!existing) {
    return { success: false, error: "Kunde ikke funnet" };
  }

  await prisma.customer.delete({
    where: { id: customerId },
  });

  return { success: true };
}

/**
 * Get all customers for the current organization
 */
export async function getCustomers() {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return [];
  }

  const customers = await prisma.customer.findMany({
    where: { organizationId: orgData.organization.id },
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
export async function getCustomerWithEquipment(customerId: string) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return null;
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: orgData.organization.id },
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

export interface CreateEquipmentInput {
  customerId: string;
  productType: string;
  productName: string;
  model?: string;
  serialNumber?: string;
}

/**
 * Add equipment to a customer
 */
export async function addCustomerEquipment(input: CreateEquipmentInput) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ingen organisasjon funnet" };
  }

  // Verify customer belongs to org
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, organizationId: orgData.organization.id },
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
export async function updateCustomerEquipment(
  equipmentId: string,
  input: Partial<Omit<CreateEquipmentInput, "customerId">>,
) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ingen organisasjon funnet" };
  }

  // Verify equipment belongs to a customer in this org
  const existing = await prisma.customerEquipment.findFirst({
    where: {
      id: equipmentId,
      customer: { organizationId: orgData.organization.id },
    },
  });

  if (!existing) {
    return { success: false, error: "Utstyr ikke funnet" };
  }

  const equipment = await prisma.customerEquipment.update({
    where: { id: equipmentId },
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
export async function deleteCustomerEquipment(equipmentId: string) {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ingen organisasjon funnet" };
  }

  const existing = await prisma.customerEquipment.findFirst({
    where: {
      id: equipmentId,
      customer: { organizationId: orgData.organization.id },
    },
  });

  if (!existing) {
    return { success: false, error: "Utstyr ikke funnet" };
  }

  await prisma.customerEquipment.delete({
    where: { id: equipmentId },
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
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return [];
  }

  const customers = await prisma.customer.findMany({
    where: {
      organizationId: orgData.organization.id,
      name: { contains: query, mode: "insensitive" },
    },
    orderBy: { name: "asc" },
    take: limit,
    select: {
      id: true,
      name: true,
      address: true,
      contact: true,
    },
  });

  return customers;
}
