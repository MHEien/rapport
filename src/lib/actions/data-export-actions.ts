"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrg, requireOwner, requireAdmin } from "./utils/auth";

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

const customerDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

const servicePointDataSchema = z.object({
  id: z.string(),
  productType: z.string(),
  category: z.string(),
  text: z.string(),
  sortOrder: z.number().optional().default(0),
  categorySortOrder: z.number().optional().default(0),
  isForService: z.boolean().optional().default(true),
  isForCommissioning: z.boolean().optional().default(true),
});

const projectDataSchema = z.object({
  id: z.string(),
  projectNumber: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});

const restoreDataSchema = z.object({
  timestamp: z.string().optional(),
  organization: z.string().optional(),
  customers: z.array(customerDataSchema).optional(),
  servicePoints: z.array(servicePointDataSchema).optional(),
  projects: z.array(projectDataSchema).optional(),
});

// ============================================================================
// DATA EXPORT ACTIONS
// ============================================================================

/**
 * Fetch all data for backup (Owner only)
 */
export async function exportAllData() {
  const { organization } = await requireOwner();

  try {
    const [customers, servicePoints, projects] = await Promise.all([
      prisma.customer.findMany({
        where: { organizationId: organization.id },
      }),
      prisma.servicePoint.findMany({
        where: { organizationId: organization.id },
      }),
      prisma.project.findMany({
        where: { organizationId: organization.id },
        include: { customer: true },
      }),
    ]);

    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        organization: organization.name,
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
export async function restoreData(data: unknown) {
  const { organization } = await requireOwner();

  // Validate the backup data structure
  const parsed = restoreDataSchema.parse(data);

  try {
    const orgId = organization.id;

    // 1. Restore Customers
    if (parsed.customers && Array.isArray(parsed.customers)) {
      for (const c of parsed.customers) {
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
    if (parsed.servicePoints && Array.isArray(parsed.servicePoints)) {
      for (const sp of parsed.servicePoints) {
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
    if (parsed.projects && Array.isArray(parsed.projects)) {
      for (const p of parsed.projects) {
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
  const { organization } = await requireAdmin();

  try {
    const products = await prisma.servicePoint.findMany({
      // Assuming servicePoint is the intended "product" list based on recent context
      where: { organizationId: organization.id },
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
