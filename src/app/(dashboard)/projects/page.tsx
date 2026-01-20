import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/actions/org-actions";
import { ProjectsList } from "@/components/projects/projects-list";

export default async function ProjectsPage() {
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

  // Only admins/owners can access this page
  if (
    orgData.membership.role !== "owner" &&
    orgData.membership.role !== "admin"
  ) {
    redirect("/");
  }

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="border-b bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="px-6 py-8">
          <h1 className="text-3xl font-bold text-white">Prosjekter</h1>
          <p className="text-slate-400 mt-1">
            Oversikt over prosjekter og arbeidstimer
          </p>
        </div>
      </div>

      {/* Projects List */}
      <div className="p-6">
        <ProjectsList />
      </div>
    </div>
  );
}
