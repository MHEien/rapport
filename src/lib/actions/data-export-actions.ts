"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "./org-actions";

// Helper for authorization (Owner Only)
async function requireOwner() {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { error: "Ikke autentisert", orgData: null };
  }

  if (orgData.membership.role !== "owner") {
    return {
      error: "Kun eier har tilgang til full backup og gjenoppretting",
      orgData: null,
    };
  }

  return { error: null, orgData };
}

// Helper for Admin or Owner
async function requireAdminOrOwner() {
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { error: "Ikke autentisert", orgData: null };
  }

  if (
    orgData.membership.role !== "owner" &&
    orgData.membership.role !== "admin"
  ) {
    return {
      error: "Ingen tilgang",
      orgData: null,
    };
  }

  return { error: null, orgData };
}

/**
 * Fetch all data for backup (Owner only)
 */
export async function exportAllData() {
  const { error, orgData } = await requireOwner();
  if (error || !orgData) {
    return { success: false, error: error ?? "Ikke autentisert" };
  }

  try {
    const [customers, servicePoints, projects] = await Promise.all([
      prisma.customer.findMany({
        where: { organizationId: orgData.organization.id },
      }),
      prisma.servicePoint.findMany({
        where: { organizationId: orgData.organization.id },
      }),
      prisma.project.findMany({
        where: { organizationId: orgData.organization.id },
        include: { customer: true },
      }),
    ]);

    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        organization: orgData.organization.name,
        customers,
        servicePoints,
        projects,
      },
    };
  } catch (error) {
    console.error("Export error:", error);
    return { success: false, error: "Kunne ikke eksportere data" };
  }
}

/**
 * Restore data from backup (Owner only)
 */
export async function restoreData(data: any) {
  const { error, orgData } = await requireOwner();
  if (error || !orgData) {
    return { success: false, error: error ?? "Ikke autentisert" };
  }

  try {
    const orgId = orgData.organization.id;

    // 1. Restore Customers
    if (Array.isArray(data.customers)) {
      for (const c of data.customers) {
        await prisma.customer.upsert({
          where: { id: c.id },
          create: {
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            address: c.address,
            organizationId: orgId,
          },
          update: {
            name: c.name,
            email: c.email,
            phone: c.phone,
            address: c.address,
          },
        });
      }
    }

    // 2. Restore Service Points
    if (Array.isArray(data.servicePoints)) {
      for (const sp of data.servicePoints) {
        await prisma.servicePoint.upsert({
          where: { id: sp.id },
          create: {
            id: sp.id,
            productType: sp.productType,
            category: sp.category,
            text: sp.text,
            sortOrder: sp.sortOrder,
            categorySortOrder: sp.categorySortOrder,
            isForService: sp.isForService,
            isForCommissioning: sp.isForCommissioning,
            organizationId: orgId,
          },
          update: {
            productType: sp.productType,
            category: sp.category,
            text: sp.text,
            sortOrder: sp.sortOrder,
            categorySortOrder: sp.categorySortOrder,
            isForService: sp.isForService,
            isForCommissioning: sp.isForCommissioning,
          },
        });
      }
    }

    // 3. Restore Projects (Must be after customers)
    if (Array.isArray(data.projects)) {
      for (const p of data.projects) {
        // Ensure customer exists (if provided)
        if (p.customerId) {
          const customerExists = await prisma.customer.findUnique({
            where: { id: p.customerId },
          });
          if (!customerExists) continue; // Skip if customer missing to avoid error
        }

        await prisma.project.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            projectNumber: p.projectNumber,
            name: p.name,
            description: p.description,
            customerId: p.customerId,
            organizationId: orgId,
            createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
          },
          update: {
            projectNumber: p.projectNumber,
            name: p.name,
            description: p.description,
            customerId: p.customerId,
          },
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Restore error:", error);
    return { success: false, error: "Kunne ikke gjenopprette data" };
  }
}

/**
 * Fetch products for Excel export
 */
export async function getProductsForExport() {
  const { error, orgData } = await requireAdminOrOwner();
  if (error || !orgData) {
    return { success: false, error: error ?? "Ikke autentisert" };
  }

  try {
    const products = await prisma.servicePoint.findMany({
      // Assuming servicePoint is the intended "product" list based on recent context
      where: { organizationId: orgData.organization.id },
      select: {
        id: true,
        productType: true,
        category: true,
        text: true,
        isForService: true,
        isForCommissioning: true,
      },
      orderBy: { text: "asc" },
    });

    return { success: true, data: products };
  } catch (error) {
    return { success: false, error: "Kunne ikke hente servicepunkter" };
  }
}
