"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Creates a new organization and sets the current user as owner.
 * Uses Better Auth organization plugin API.
 */
export async function createOrganization(name: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  try {
    const org = await auth.api.createOrganization({
      headers: await headers(),
      body: {
        name,
        slug,
      },
    });

    return { success: true, organization: org };
  } catch (_error) {
    return { success: false, error: "Kunne ikke opprette organisasjon" };
  }
}

/**
 * Get the current user's active organization from session
 */
export async function getCurrentOrganization() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  // Get live session from typed API
  const typedSession = session as typeof session & {
    session: { activeOrganizationId?: string };
  };

  const activeOrgId = typedSession.session?.activeOrganizationId;

  if (activeOrgId) {
    // Fetch the active organization with membership
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
        organization: member.organization,
        membership: {
          id: member.id,
          role: member.role,
          createdAt: member.createdAt,
        },
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
    return null;
  }

  // Set this as the active org
  await auth.api.setActiveOrganization({
    headers: await headers(),
    body: { organizationId: member.organizationId },
  });

  return {
    organization: member.organization,
    membership: {
      id: member.id,
      role: member.role,
      createdAt: member.createdAt,
    },
  };
}

/**
 * Check if user has completed onboarding (has an organization)
 */
export async function hasCompletedOnboarding() {
  const org = await getCurrentOrganization();
  return org !== null;
}

/**
 * Get all members of an organization
 */
export async function getOrganizationMembers(organizationId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Verify user is member of this org
  const membership = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
    },
  });

  if (!membership) {
    return { success: false, error: "Ikke tilgang" };
  }

  const members = await prisma.member.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return { success: true, members };
}

/**
 * Send invitations to join the organization using Better Auth
 */
export async function inviteMembers(
  organizationId: string,
  invites: Array<{ email: string; role: string }>,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Verify user is owner or admin
  const membership = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
      role: { in: ["owner", "admin"] },
    },
  });

  if (!membership) {
    return {
      success: false,
      error: "Kun eiere og administratorer kan invitere medlemmer",
    };
  }

  let successCount = 0;

  for (const invite of invites) {
    try {
      await auth.api.createInvitation({
        headers: await headers(),
        body: {
          email: invite.email.toLowerCase(),
          role: invite.role as "owner" | "admin" | "technician",
          organizationId,
        },
      });
      successCount++;
    } catch (_error) {
      // Continue with other invites
    }
  }

  return { success: true, count: successCount };
}

/**
 * Accept an invitation using Better Auth
 */
export async function acceptInvitation(invitationId: string) {
  try {
    await auth.api.acceptInvitation({
      headers: await headers(),
      body: { invitationId },
    });
    return { success: true };
  } catch (_error) {
    return { success: false, error: "Kunne ikke godta invitasjonen" };
  }
}

/**
 * Get pending invitations for an organization
 */
export async function getPendingInvitations(organizationId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Verify user is owner or admin
  const membership = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
      role: { in: ["owner", "admin"] },
    },
  });

  if (!membership) {
    return {
      success: false,
      error: "Kun eiere og administratorer kan se invitasjoner",
    };
  }

  const invitations = await prisma.invitation.findMany({
    where: {
      organizationId,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    include: {
      inviter: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return { success: true, invitations };
}

/**
 * Cancel/delete an invitation
 */
export async function cancelInvitation(invitationId: string) {
  try {
    await auth.api.cancelInvitation({
      headers: await headers(),
      body: { invitationId },
    });
    return { success: true };
  } catch (_error) {
    return { success: false, error: "Kunne ikke kansellere invitasjonen" };
  }
}

/**
 * Update a member's role
 */
export async function updateMemberRole(memberId: string, role: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Check target member
  const targetMember = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!targetMember) {
    return { success: false, error: "Medlem ikke funnet" };
  }

  // Prevent modifying owners unless you are an owner
  if (targetMember.role === "owner") {
    const currentMember = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: targetMember.organizationId,
      },
    });

    if (currentMember?.role !== "owner") {
      return {
        success: false,
        error: "Kun eiere kan endre rettigheter for en eier",
      };
    }
  }

  try {
    await auth.api.updateMemberRole({
      headers: await headers(),
      body: {
        memberId,
        role: role as "admin" | "member" | "owner",
      },
    });
    return { success: true };
  } catch (_error) {
    return { success: false, error: "Kunne ikke oppdatere rolle" };
  }
}

/**
 * Remove a member from the organization
 */
export async function removeMember(memberId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Check target member
  const targetMember = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!targetMember) {
    return { success: false, error: "Medlem ikke funnet" };
  }

  // Prevent removing owners unless you are an owner
  if (targetMember.role === "owner") {
    const currentMember = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: targetMember.organizationId,
      },
    });

    if (currentMember?.role !== "owner") {
      return {
        success: false,
        error: "Kun eiere kan fjerne en eier",
      };
    }
  }

  try {
    await auth.api.removeMember({
      headers: await headers(),
      body: { memberIdOrEmail: memberId },
    });
    return { success: true };
  } catch (_error) {
    return { success: false, error: "Kunne ikke fjerne medlem" };
  }
}

/**
 * Update organization details
 */
export async function updateOrganization(
  organizationId: string,
  data: { name: string },
) {
  try {
    await auth.api.updateOrganization({
      headers: await headers(),
      body: {
        organizationId,
        data,
      },
    });
    return { success: true };
  } catch (_error) {
    return { success: false, error: "Kunne ikke oppdatere organisasjon" };
  }
}

/**
 * Delete organization
 */
export async function deleteOrganization(organizationId: string) {
  try {
    await auth.api.deleteOrganization({
      headers: await headers(),
      body: { organizationId },
    });
    return { success: true };
  } catch (_error) {
    return { success: false, error: "Kunne ikke slette organisasjon" };
  }
}

/**
 * Get invitation details (public safe version)
 */
export async function getInvitation(invitationId: string) {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        organization: {
          select: { name: true, logo: true },
        },
        inviter: {
          select: { name: true, email: true, image: true },
        },
      },
    });

    if (!invitation)
      return { success: false, error: "Invitasjonen finnes ikke" };

    if (invitation.status !== "pending") {
      return { success: false, error: "Invitasjonen er ikke lenger gyldig" };
    }

    if (invitation.expiresAt < new Date()) {
      return { success: false, error: "Invitasjonen har utløpt" };
    }

    return { success: true, invitation };
  } catch (_error) {
    return { success: false, error: "Kunne ikke hente invitasjon" };
  }
}
