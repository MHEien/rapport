import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShellClient } from "@/components/layout/app-shell-client";
import { getCurrentOrganization } from "@/lib/actions/org-actions";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Check if user has completed onboarding
  const orgData = await getCurrentOrganization();
  if (!orgData) {
    redirect("/setup");
  }

  return (
    <AppShellClient
      user={session.user}
      organization={orgData.organization}
      membership={orgData.membership}
    >
      {children}
    </AppShellClient>
  );
}
