"use server";

import { put } from "@vercel/blob";
import type { ChecklistStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// ============================================================================
// GET SERVICE POINTS
// ============================================================================

export async function getServicePointsByProductType(
  productType: string,
  reportType: "SERVICE" | "COMMISSIONING" = "SERVICE",
) {
  const servicePoints = await prisma.servicePoint.findMany({
    where: {
      productType,
      ...(reportType === "SERVICE"
        ? { isForService: true }
        : { isForCommissioning: true }),
    },
    orderBy: [{ category: "asc" }, { text: "asc" }],
  });

  return servicePoints;
}

// ============================================================================
// GET REPORT WITH CHECKLIST
// ============================================================================

export async function getReportWithChecklist(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
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
    },
  });

  return report;
}

// ============================================================================
// SAVE CHECKLIST RESULT
// ============================================================================

export type SaveChecklistInput = {
  equipmentId: string;
  category: string;
  question: string;
  status: ChecklistStatus;
  comment?: string;
};

export async function saveChecklistResult(input: SaveChecklistInput) {
  const { equipmentId, category, question, status, comment } = input;

  // First, check if a result already exists for this question
  const existing = await prisma.checklistResult.findFirst({
    where: {
      equipmentId,
      category,
      question,
    },
  });

  if (existing) {
    // Update existing result
    const updated = await prisma.checklistResult.update({
      where: { id: existing.id },
      data: {
        status,
        comment,
      },
    });
    return { success: true, result: updated, action: "updated" as const };
  }

  // Create new result
  const created = await prisma.checklistResult.create({
    data: {
      equipmentId,
      category,
      question,
      status,
      comment,
    },
  });

  return { success: true, result: created, action: "created" as const };
}

// ============================================================================
// UPDATE REPORT HEADER INFO
// ============================================================================

export type UpdateReportHeaderInput = {
  reportId: string;
  runningHours?: number;
  serialNumber?: string;
  customerName?: string;
  customerAddress?: string;
  contactPerson?: string;
  productName?: string;
  productType?: string;
};

export async function updateReportHeader(input: UpdateReportHeaderInput) {
  const { reportId, ...data } = input;

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: {
      ...(data.runningHours !== undefined && {
        runningHours: data.runningHours,
      }),
      ...(data.serialNumber && { serialNumber: data.serialNumber }),
      ...(data.customerName && { customerName: data.customerName }),
      ...(data.customerAddress && { customerAddress: data.customerAddress }),
      ...(data.contactPerson && { contactPerson: data.contactPerson }),
      ...(data.productName && { productName: data.productName }),
      ...(data.productType && { productType: data.productType }),
    },
  });

  return { success: true, report: updated };
}

// ============================================================================
// UPLOAD PHOTO
// ============================================================================

export type UploadPhotoInput = {
  checklistResultId: string;
  file: File;
};

export async function uploadChecklistPhoto(formData: FormData) {
  const checklistResultId = formData.get("checklistResultId") as string;
  const file = formData.get("file") as File;

  if (!checklistResultId || !file) {
    return { success: false, error: "Missing required fields" };
  }

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
  const reportId = formData.get("reportId") as string;
  const signatureBlob = formData.get("signature") as Blob;

  if (!reportId || !signatureBlob) {
    return { success: false, error: "Missing required fields" };
  }

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
