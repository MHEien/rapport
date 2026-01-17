import { headers } from "next/headers";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { RecentReports } from "@/components/dashboard/recent-reports";
import { StatsCards } from "@/components/dashboard/stats-cards";
import {
  getDashboardStats,
  getRecentReports,
  getTeamStats,
  getTeamReports,
} from "@/lib/actions/dashboard-actions";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null; // Layout handles redirect
  }

  const [stats, recentReports, teamStats, teamReports] = await Promise.all([
    getDashboardStats(),
    getRecentReports(),
    getTeamStats(),
    getTeamReports(),
  ]);

  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <DashboardHero userName={session.user.name} />

      {/* Stats cards */}
      <div className="py-8">
        <StatsCards stats={stats} />
      </div>

      {/* Admin Dashboard (owners/admins only) */}
      {teamStats.isAdmin && (
        <div className="pb-8">
          <AdminDashboard
            members={teamStats.members}
            reports={teamReports}
            isAdmin={teamStats.isAdmin}
          />
        </div>
      )}

      {/* Recent reports */}
      <RecentReports reports={recentReports} />
    </div>
  );
}
