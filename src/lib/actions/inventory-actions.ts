"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/server";
import { getCurrentOrganization } from "./org-actions";

// ============================================================================
// VAN INVENTORY MANAGEMENT
// ============================================================================

export interface ParsedPart {
  partNumber: string;
  description: string;
  quantity: number;
  unit?: string;
}

/**
 * Parse PDF and save inventory to database
 * The PDF parsing is flexible and can be tuned based on actual PDF format
 */
export async function parseAndSaveInventoryPdf(formData: FormData) {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "Ikke autentisert" };
  }

  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ingen organisasjon funnet" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "Ingen fil lastet opp" };
  }

  try {
    // Read the file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dynamic import of pdf-parse (server-side only)
    const pdfParseModule = await import("pdf-parse");
    const { PDFParse } = pdfParseModule;

    // Fix for Next.js server-side worker issue
    // pdfjs-dist tries to import the worker relative to itself, which fails in the bundle.
    // We explicitly point it to the worker file in node_modules.
    if (typeof process !== "undefined") {
      const path = await import("node:path");
      const { pathToFileURL } = await import("node:url");
      const workerPath = path.join(
        process.cwd(),
        "node_modules",
        "pdf-parse",
        "dist",
        "worker",
        "pdf.worker.mjs",
      );
      PDFParse.setWorker(pathToFileURL(workerPath).href);
    }

    // Parse using v2 API
    const parser = new PDFParse({ data: buffer });
    const pdfData = await parser.getText();
    await parser.destroy();

    // Parse the PDF text into parts
    const parts = parsePdfText(pdfData.text);

    if (parts.length === 0) {
      return {
        success: false,
        error: "Kunne ikke finne deler i PDF-en. Sjekk at formatet er riktig.",
      };
    }

    // Generate a unique session ID
    const sessionId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Save all parts to database
    await prisma.vanInventory.createMany({
      data: parts.map((part) => ({
        sessionId,
        partNumber: part.partNumber,
        description: part.description,
        quantity: part.quantity,
        remaining: part.quantity, // Initially, remaining = imported quantity
        unit: part.unit,
        organizationId: orgData.organization.id,
        userId: session.user.id,
      })),
    });

    return {
      success: true,
      sessionId,
      partsCount: parts.length,
      parts,
    };
  } catch (error) {
    console.error("PDF parsing error:", error);
    return {
      success: false,
      error: `Feil ved parsing av PDF: ${error instanceof Error ? error.message : "Ukjent feil"}`,
    };
  }
}

/**
 * Parse PDF text content into structured parts
 * This function can be tuned based on the actual PDF format
 *
 * Common formats supported:
 * - "PartNumber Description Qty Unit" (tab/space separated)
 * - "PartNumber | Description | Qty | Unit" (pipe separated)
 * - Table-like structures
 */
function parsePdfText(text: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Try different parsing strategies
  for (const line of lines) {
    // Skip header-like lines and known garbage patterns
    const lowerLine = line.toLowerCase();
    if (
      line.length < 5 || // Skip very short lines
      /^\d{2}\.\d{2}\.\d{2}$/.test(line) || // Skip standalone dates
      /^\d{2}\.\d{2}\.\d{2}\s+\d{6}/.test(line) && !line.includes("\t") || // Skip "date varenr" without tabs
      /^(o|ve|p|st|ty|e)$/i.test(line) || // Skip split words from PDF extraction
      /^\d{1,2}\.\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)/i.test(line) || // Skip date strings like "19. januar"
      lowerLine.includes("januar") || // Skip month names
      lowerLine.includes("februar") ||
      lowerLine.includes("part number") ||
      lowerLine.includes("description") ||
      lowerLine.includes("quantity") ||
      lowerLine.includes("artikkel") ||
      lowerLine.includes("antall") ||
      lowerLine.includes("bokføring") ||
      lowerLine.includes("varenr") ||
      lowerLine.includes("kladde") ||
      lowerLine.includes("lagerflytting") ||
      lowerLine.includes("sterner") ||
      lowerLine.includes("side") ||
      lowerLine.startsWith("service") ||
      /^bil\s/i.test(line) ||
      /^\d{1,2}:\d{2}:\d{2}/.test(line) || // Skip timestamps
      /^--\s*\d+\s+of\s+\d+\s*--$/.test(line) // Skip page markers
    ) {
      continue;
    }

    // Strategy 1: Pipe-separated (common in exports)
    if (line.includes("|")) {
      const segments = line.split("|").map((s) => s.trim());
      if (segments.length >= 3) {
        const qty = extractNumber(segments[2]);
        if (qty > 0) {
          parts.push({
            partNumber: segments[0],
            description: segments[1],
            quantity: qty,
            unit: segments[3] || "stk",
          });
          continue;
        }
      }
    }

    // Strategy 2: Tab-separated Vareoverføring format
    // Handles TWO formats:
    // Format A: "16.01.26 [TAB] VARENR BESKRIVELSE [TAB] ..." (varenr + beskrivelse combined)
    // Format B: "16.01.26 [TAB] VARENR [TAB] BESKRIVELSE [TAB] ..." (varenr and beskrivelse separate)
    if (line.includes("\t")) {
      const segments = line.split("\t").map((s) => s.trim());

      // Check if this looks like a Vareoverføring data line (starts with date pattern like DD.MM.YY)
      if (segments.length >= 2 && /^\d{2}\.\d{2}\.\d{2}$/.test(segments[0])) {
        let varenr = "";
        let beskrivelse = "";

        // Format A: segments[1] contains "VARENR BESKRIVELSE" combined
        const combinedMatch = segments[1].match(/^(\d{6,})\s+(.+)$/);
        if (combinedMatch) {
          varenr = combinedMatch[1];
          beskrivelse = combinedMatch[2].trim();
        }
        // Format B: segments[1] is only VARENR, segments[2] is BESKRIVELSE
        else if (/^\d{6,}$/.test(segments[1]) && segments.length >= 3) {
          varenr = segments[1];
          // Description might be in segments[2], but skip if it looks like a location code
          if (segments[2] && !segments[2].startsWith("SERVICE") && !/^[A-Z]{2,5}$/.test(segments[2])) {
            beskrivelse = segments[2];
          }
        }

        if (varenr && beskrivelse) {
          // Find the segment containing "ANTALL ENHETSKODE" (number followed by unit like STK)
          let antall = 0;
          let enhetskode = "STK";

          for (let i = segments.length - 1; i >= 2; i--) {
            const antallMatch = segments[i].match(/^(\d+)\s+(\S+)$/);
            if (antallMatch) {
              antall = extractNumber(antallMatch[1]);
              enhetskode = antallMatch[2];
              break;
            }
          }

          if (antall > 0) {
            parts.push({
              partNumber: varenr,
              description: beskrivelse,
              quantity: antall,
              unit: enhetskode,
            });
            continue;
          }
        }
      }

      // Fallback for generic tab-separated (not Vareoverføring)
      if (segments.length >= 3) {
        const qty =
          extractNumber(segments[2]) ||
          extractNumber(segments[segments.length - 1]);
        if (qty > 0) {
          parts.push({
            partNumber: segments[0],
            description: segments[1],
            quantity: qty,
            unit: segments.length > 3 ? segments[3] : "stk",
          });
          continue;
        }
      }
    }

    // Note: Strategy 3, 4, 5 removed - they were matching garbage lines from Vareoverføring PDFs
    // Only Strategy 1 (pipe-separated) and Strategy 2 (tab-separated Vareoverføring) are active
  }

  return parts;
}

/**
 * Extract number from string, handling both . and , as decimal separator
 */
function extractNumber(str: string): number {
  if (!str) return 0;
  const normalized = str.replace(",", ".").replace(/[^\d.]/g, "");
  const num = Number.parseFloat(normalized);
  return Number.isNaN(num) ? 0 : Math.round(num); // Round to integer for quantity
}

/**
 * Get current inventory session for the user
 */
export async function getCurrentSessionInventory() {
  const session = await getSession();
  if (!session?.user) {
    return null;
  }

  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return null;
  }

  // Get the most recent session for this user
  const latestItem = await prisma.vanInventory.findFirst({
    where: {
      organizationId: orgData.organization.id,
      userId: session.user.id,
    },
    orderBy: { createdAt: "desc" },
    select: { sessionId: true, createdAt: true },
  });

  if (!latestItem) {
    return null;
  }

  // Get all items from this session
  const items = await prisma.vanInventory.findMany({
    where: { sessionId: latestItem.sessionId },
    orderBy: { description: "asc" },
  });

  return {
    sessionId: latestItem.sessionId,
    createdAt: latestItem.createdAt,
    items,
    totalItems: items.length,
    itemsWithStock: items.filter((i) => i.remaining > 0).length,
  };
}

/**
 * Get all inventory sessions for the user
 */
export async function getInventorySessions() {
  const session = await getSession();
  if (!session?.user) {
    return [];
  }

  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return [];
  }

  // Get distinct sessions with their first item's createdAt
  const sessions = await prisma.vanInventory.groupBy({
    by: ["sessionId"],
    where: {
      organizationId: orgData.organization.id,
      userId: session.user.id,
    },
    _count: { id: true },
    _min: { createdAt: true },
    orderBy: { _min: { createdAt: "desc" } },
  });

  return sessions.map((s) => ({
    sessionId: s.sessionId,
    createdAt: s._min.createdAt,
    itemCount: s._count.id,
  }));
}

/**
 * Clear an inventory session
 */
export async function clearInventorySession(sessionId: string) {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "Ikke autentisert" };
  }

  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ingen organisasjon funnet" };
  }

  // Verify this session belongs to the user
  const item = await prisma.vanInventory.findFirst({
    where: {
      sessionId,
      organizationId: orgData.organization.id,
      userId: session.user.id,
    },
  });

  if (!item) {
    return { success: false, error: "Sesjon ikke funnet" };
  }

  await prisma.vanInventory.deleteMany({
    where: { sessionId },
  });

  return { success: true };
}

/**
 * Consume parts from inventory (reduce remaining count)
 */
export async function consumeFromInventory(
  inventoryId: string,
  quantityUsed: number,
) {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "Ikke autentisert" };
  }

  const item = await prisma.vanInventory.findUnique({
    where: { id: inventoryId },
  });

  if (!item) {
    return { success: false, error: "Del ikke funnet i inventar" };
  }

  if (item.remaining < quantityUsed) {
    return {
      success: false,
      error: `Ikke nok på lager. Tilgjengelig: ${item.remaining}`,
    };
  }

  const updated = await prisma.vanInventory.update({
    where: { id: inventoryId },
    data: { remaining: item.remaining - quantityUsed },
  });

  return { success: true, item: updated };
}

/**
 * Restore parts to inventory (e.g., if removing from report)
 */
export async function restoreToInventory(
  inventoryId: string,
  quantityToRestore: number,
) {
  const item = await prisma.vanInventory.findUnique({
    where: { id: inventoryId },
  });

  if (!item) {
    return { success: false, error: "Del ikke funnet i inventar" };
  }

  const newRemaining = Math.min(
    item.remaining + quantityToRestore,
    item.quantity, // Can't exceed original quantity
  );

  const updated = await prisma.vanInventory.update({
    where: { id: inventoryId },
    data: { remaining: newRemaining },
  });

  return { success: true, item: updated };
}

/**
 * Manually add a single item to current inventory
 */
export async function addInventoryItem(input: ParsedPart) {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "Ikke autentisert" };
  }

  const orgData = await getCurrentOrganization();
  if (!orgData) {
    return { success: false, error: "Ingen organisasjon funnet" };
  }

  // Get current session or create new one
  const currentInventory = await getCurrentSessionInventory();
  const sessionId =
    currentInventory?.sessionId ||
    `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const item = await prisma.vanInventory.create({
    data: {
      sessionId,
      partNumber: input.partNumber,
      description: input.description,
      quantity: input.quantity,
      remaining: input.quantity,
      unit: input.unit || "stk",
      organizationId: orgData.organization.id,
      userId: session.user.id,
    },
  });

  return { success: true, item };
}
