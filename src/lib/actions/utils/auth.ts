import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ============================================================================
// AUTHENTICATION & AUTHORIZATION UTILITIES
// ============================================================================

export class AuthorizationError extends Error {
    constructor(message = "Unauthorized") {
        super(message);
        this.name = "AuthorizationError";
    }
}

export class ValidationError extends Error {
    constructor(message = "Validation failed") {
        super(message);
        this.name = "ValidationError";
    }
}

/**
 * Get the current session or throw if not authenticated
 */
export async function requireAuth() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        throw new AuthorizationError("Ikke autentisert");
    }

    return session;
}

/**
 * Get the current organization or throw if not found
 * Also returns the user's membership role
 */
export async function requireOrg() {
    const session = await requireAuth();

    // Get live session from typed API
    const typedSession = session as typeof session & {
        session: { activeOrganizationId?: string };
    };

    const activeOrgId = typedSession.session?.activeOrganizationId;

    if (activeOrgId) {
        const member = await prisma.member.findFirst({
            where: {
                userId: session.user.id,
                organizationId: activeOrgId,
            },
            include: {
                organization: true,
            },
        });

        if (member) {
            return {
                session,
                organization: member.organization,
                membership: {
                    id: member.id,
                    role: member.role,
                    createdAt: member.createdAt,
                },
                userId: session.user.id,
            };
        }
    }

    // Fallback: get first organization user is a member of
    const member = await prisma.member.findFirst({
        where: { userId: session.user.id },
        include: { organization: true },
        orderBy: { createdAt: "asc" },
    });

    if (!member) {
        throw new AuthorizationError("Ingen organisasjon funnet");
    }

    // Set this as the active org
    await auth.api.setActiveOrganization({
        headers: await headers(),
        body: { organizationId: member.organizationId },
    });

    return {
        session,
        organization: member.organization,
        membership: {
            id: member.id,
            role: member.role,
            createdAt: member.createdAt,
        },
        userId: session.user.id,
    };
}

/**
 * Require admin or owner role, throw if not authorized
 */
export async function requireAdmin() {
    const orgData = await requireOrg();

    if (
        orgData.membership.role !== "owner" &&
        orgData.membership.role !== "admin"
    ) {
        throw new AuthorizationError("Kun administratorer har tilgang");
    }

    return orgData;
}

/**
 * Require owner role, throw if not authorized
 */
export async function requireOwner() {
    const orgData = await requireOrg();

    if (orgData.membership.role !== "owner") {
        throw new AuthorizationError("Kun eier har tilgang");
    }

    return orgData;
}

/**
 * Verify that a report belongs to the user's organization
 */
export async function verifyReportAccess(reportId: string, orgId: string) {
    const report = await prisma.report.findFirst({
        where: { id: reportId, organizationId: orgId },
    });

    if (!report) {
        throw new AuthorizationError("Rapport ikke funnet");
    }

    return report;
}

/**
 * Verify that equipment belongs to a report in the user's organization
 */
export async function verifyEquipmentAccess(equipmentId: string, orgId: string) {
    const equipment = await prisma.reportEquipment.findFirst({
        where: {
            id: equipmentId,
            report: { organizationId: orgId },
        },
        include: { report: true },
    });

    if (!equipment) {
        throw new AuthorizationError("Utstyr ikke funnet");
    }

    return equipment;
}

/**
 * Verify that a checklist result belongs to the user's organization
 */
export async function verifyChecklistAccess(checklistResultId: string, orgId: string) {
    const result = await prisma.checklistResult.findFirst({
        where: {
            id: checklistResultId,
            equipment: {
                report: { organizationId: orgId },
            },
        },
        include: {
            equipment: {
                include: { report: true },
            },
        },
    });

    if (!result) {
        throw new AuthorizationError("Sjekklistepunkt ikke funnet");
    }

    return result;
}
