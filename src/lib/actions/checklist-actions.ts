"use server";

import { z } from "zod";
import { put } from "@vercel/blob";
import type { ChecklistStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireOrg,
  verifyReportAccess,
  verifyEquipmentAccess,
  verifyChecklistAccess,
} from "./utils/auth";

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

const getServicePointsSchema = z.object({
  productType: z.string().min(1),
  reportType: z.enum(["SERVICE", "COMMISSIONING"]).optional().default("SERVICE"),
});

const saveChecklistSchema = z.object({
  equipmentId: z.string().min(1),
  category: z.string().min(1),
  question: z.string().min(1),
  status: z.enum(["OK", "BOR_UTBEDRES", "MA_UTBEDRES", "IKKE_AKTUELT"]),
  comment: z.string().nullable().optional(),
  value: z.string().nullable().optional(),
});

const updateReportHeaderSchema = z.object({
  reportId: z.string().min(1),
  runningHours: z.number().optional(),
  serialNumber: z.string().optional(),
  customerName: z.string().optional(),
  customerAddress: z.string().optional(),
  contactPerson: z.string().optional(),
  productName: z.string().optional(),
  productType: z.string().optional(),
});

const updateReportCommentSchema = z.object({
  reportId: z.string().min(1),
  comment: z.string(),
});

// ============================================================================
// GET SERVICE POINTS
// ============================================================================

export async function getServicePointsByProductType(
  productType: string,
  _organizationId?: string, // Ignored - we use the session org
  reportType: "SERVICE" | "COMMISSIONING" = "SERVICE",
) {
  const { organization } = await requireOrg();

  // Validate inputs
  const parsedProductType = z.string().min(1).parse(productType);
  const parsedReportType = z.enum(["SERVICE", "COMMISSIONING"]).parse(reportType);

  const servicePoints = await prisma.servicePoint.findMany({
    where: {
      productType: parsedProductType,
      organizationId: organization.id,
      ...(parsedReportType === "SERVICE"
        ? { isForService: true }
        : { isForCommissioning: true }),
    },
    orderBy: [
      { categorySortOrder: "asc" },
      { category: "asc" },
      { sortOrder: "asc" },
    ],
  });

  return servicePoints;
}

// ============================================================================
// GET REPORT WITH CHECKLIST
// ============================================================================

export async function getReportWithChecklist(reportId: unknown) {
  const { organization } = await requireOrg();
  const parsedId = z.string().min(1).parse(reportId);

  const report = await prisma.report.findFirst({
    where: { id: parsedId, organizationId: organization.id },
    include: {
      equipment: {
        orderBy: { sortOrder: "asc" },
        include: {
          checklists: {
            include: {
              photos: true,
            },
          },
        },
      },
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      parts: true,
    },
  });

  if (!report) return null;

  // For each equipment, get ALL service points for its productType and merge
  const equipmentWithAllPoints = await Promise.all(
    report.equipment.map(async (eq) => {
      // Fetch master service points for this product type
      console.log(
        `[getReportWithChecklist] Fetching service points for productType: ${eq.productType}, orgId: ${organization.id}`,
      );

      const allServicePoints = await prisma.servicePoint.findMany({
        where: {
          productType: eq.productType,
          organizationId: organization.id,
          isForService: true,
        },
        orderBy: [
          { categorySortOrder: "asc" },
          { category: "asc" },
          { sortOrder: "asc" },
        ],
      });

      console.log(
        `[getReportWithChecklist] Found ${allServicePoints.length} service points for ${eq.productType}`,
      );

      // Create a lookup map of existing checklist answers by question
      const existingAnswers = new Map(
        eq.checklists.map((c) => [`${c.category}:${c.question}`, c]),
      );

      // Merge: create checklist entries for ALL service points
      const mergedChecklists = allServicePoints.map((sp) => {
        const key = `${sp.category}:${sp.text}`;
        const existing = existingAnswers.get(key);

        if (existing) {
          // Use existing answer with sortOrder for proper ordering
          return { ...existing, sortOrder: sp.sortOrder };
        }

        // Create placeholder for unanswered service point
        return {
          id: `placeholder-${sp.id}`,
          equipmentId: eq.id,
          category: sp.category,
          question: sp.text,
          status: null as unknown as
            | "OK"
            | "BOR_UTBEDRES"
            | "MA_UTBEDRES"
            | "IKKE_AKTUELT",
          value: null,
          comment: null,
          sortOrder: sp.sortOrder,
          photos: [],
        };
      });

      return {
        ...eq,
        checklists: mergedChecklists,
      };
    }),
  );

  return {
    ...report,
    equipment: equipmentWithAllPoints,
  };
}

// ============================================================================
// SAVE CHECKLIST RESULT
// ============================================================================

export type SaveChecklistInput = z.infer<typeof saveChecklistSchema>;

export async function saveChecklistResult(data: unknown) {
  const { organization } = await requireOrg();
  const input = saveChecklistSchema.parse(data);

  // Verify equipment belongs to user's organization
  await verifyEquipmentAccess(input.equipmentId, organization.id);

  // First, check if a result already exists for this question
  const existing = await prisma.checklistResult.findFirst({
    where: {
      equipmentId: input.equipmentId,
      category: input.category,
      question: input.question,
    },
  });

  if (existing) {
    // Update existing result
    const updated = await prisma.checklistResult.update({
      where: { id: existing.id },
      data: {
        status: input.status as ChecklistStatus,
        comment: input.comment,
        value: input.value,
      },
    });
    return { success: true, result: updated, action: "updated" as const };
  }

  // Create new result
  const created = await prisma.checklistResult.create({
    data: {
      equipmentId: input.equipmentId,
      category: input.category,
      question: input.question,
      status: input.status as ChecklistStatus,
      comment: input.comment,
      value: input.value,
    },
  });

  return { success: true, result: created, action: "created" as const };
}

// ============================================================================
// UPDATE REPORT HEADER INFO
// ============================================================================

export type UpdateReportHeaderInput = z.infer<typeof updateReportHeaderSchema>;

export async function updateReportHeader(data: unknown) {
  const { organization } = await requireOrg();
  const input = updateReportHeaderSchema.parse(data);

  // Verify report belongs to user's organization
  await verifyReportAccess(input.reportId, organization.id);

  const updated = await prisma.report.update({
    where: { id: input.reportId },
    data: {
      ...(input.runningHours !== undefined && {
        runningHours: input.runningHours,
      }),
      ...(input.serialNumber && { serialNumber: input.serialNumber }),
      ...(input.customerName && { customerName: input.customerName }),
      ...(input.customerAddress && { customerAddress: input.customerAddress }),
      ...(input.contactPerson && { contactPerson: input.contactPerson }),
      ...(input.productName && { productName: input.productName }),
      ...(input.productType && { productType: input.productType }),
    },
  });

  return { success: true, report: updated };
}

// ============================================================================
// UPLOAD PHOTO
// ============================================================================

export async function uploadChecklistPhoto(formData: FormData) {
  const { organization } = await requireOrg();

  const checklistResultId = formData.get("checklistResultId") as string;
  const file = formData.get("file") as File;

  if (!checklistResultId || !file) {
    return { success: false, error: "Missing required fields" };
  }

  // Verify checklist result belongs to user's organization
  await verifyChecklistAccess(checklistResultId, organization.id);

  try {
    // Upload to Vercel Blob
    const blob = await put(
      `checklist/${checklistResultId}/${file.name}`,
      file,
      {
        access: "public",
      },
    );

    // Create media record
    const media = await prisma.media.create({
      data: {
        url: blob.url,
        mimeType: file.type,
        size: file.size,
        checklistResultId,
      },
    });

    return { success: true, media };
  } catch (error) {
    console.error("Failed to upload photo:", error);
    return { success: false, error: "Upload failed" };
  }
}

// ============================================================================
// UPDATE REPORT SIGNATURE
// ============================================================================

export async function updateReportSignature(formData: FormData) {
  const { organization } = await requireOrg();

  const reportId = formData.get("reportId") as string;
  const signatureBlob = formData.get("signature") as Blob;

  if (!reportId || !signatureBlob) {
    return { success: false, error: "Missing required fields" };
  }

  // Verify report belongs to user's organization
  await verifyReportAccess(reportId, organization.id);

  try {
    // Upload signature to Vercel Blob
    const blob = await put(`signatures/${reportId}.png`, signatureBlob, {
      access: "public",
      contentType: "image/png",
    });

    // Update report with signature URL
    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        signatureUrl: blob.url,
        status: "COMPLETED",
      },
    });

    return { success: true, report: updated };
  } catch (error) {
    console.error("Failed to save signature:", error);
    return { success: false, error: "Signature save failed" };
  }
}

// ============================================================================
// UPDATE REPORT COMMENT
// ============================================================================

export async function updateReportComment(reportId: string, comment: string) {
  const { organization } = await requireOrg();
  const parsedId = z.string().min(1).parse(reportId);
  const parsedComment = z.string().parse(comment);

  // Verify report belongs to user's organization
  await verifyReportAccess(parsedId, organization.id);

  const updated = await prisma.report.update({
    where: { id: parsedId },
    data: {
      overallComment: parsedComment,
    },
  });

  return { success: true, report: updated };
}
