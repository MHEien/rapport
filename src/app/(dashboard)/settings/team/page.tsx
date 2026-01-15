import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getCurrentOrganization,
  getOrganizationMembers,
  getPendingInvitations,
} from "@/lib/actions/org-actions";
import { auth } from "@/lib/auth";
import { TeamSettingsClient } from "./client";

export default async function TeamSettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const orgData = await getCurrentOrganization();
  if (!orgData) {
    redirect("/setup");
  }

  // Security check: only owner/admin can access team settings
  if (
    orgData.membership.role !== "owner" &&
    orgData.membership.role !== "admin"
  ) {
    redirect("/settings");
  }

  const [membersResult, invitationsResult] = await Promise.all([
    getOrganizationMembers(orgData.organization.id),
    getPendingInvitations(orgData.organization.id),
  ]);

  return (
    <TeamSettingsClient
      organizationId={orgData.organization.id}
      initialMembers={membersResult.success ? membersResult.members ?? [] : []}
      initialInvitations={
        invitationsResult.success ? invitationsResult.invitations ?? [] : []
      }
      currentUserRole={orgData.membership.role}
      currentUserId={session.user.id}
    />
  );
}
