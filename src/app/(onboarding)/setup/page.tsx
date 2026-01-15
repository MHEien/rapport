import { redirect } from "next/navigation";
import { hasCompletedOnboarding } from "@/lib/actions/org-actions";
import { SetupWizard } from "./client";

export default async function SetupPage() {
  // If user already has an org, redirect to dashboard
  const hasOrg = await hasCompletedOnboarding();
  if (hasOrg) {
    redirect("/");
  }

  return <SetupWizard />;
}
