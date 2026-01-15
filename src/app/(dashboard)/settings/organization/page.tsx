import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/actions/org-actions";
import { auth } from "@/lib/auth";
import { OrgSettingsClient } from "./client";

export default async function OrgSettingsPage() {
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

  // Security check: only owner/admin can access org settings
  // Technicians should not see this page
  if (
    orgData.membership.role !== "owner" &&
    orgData.membership.role !== "admin"
  ) {
    redirect("/settings");
  }

  return (
    <OrgSettingsClient
      organizationId={orgData.organization.id}
      initialName={orgData.organization.name}
      initialSlug={orgData.organization.slug || ""}
      role={orgData.membership.role}
    />
  );
}
