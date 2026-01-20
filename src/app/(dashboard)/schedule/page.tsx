import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/actions/org-actions";
import { ScheduleCalendar } from "@/components/schedule/schedule-calendar";

export default async function SchedulePage() {
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

  // Access check removed - all authenticated members can view the schedule
  // Permissions are handled at the component/action level

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="border-b bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="px-6 py-8">
          <h1 className="text-3xl font-bold text-white">Timeplan</h1>
          <p className="text-slate-400 mt-1">
            Planlegg og tildel oppdrag til teknikere
          </p>
        </div>
      </div>

      {/* Calendar Component */}
      <div className="p-6">
        <ScheduleCalendar organizationId={orgData.organization.id} />
      </div>
    </div>
  );
}
