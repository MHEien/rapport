import { headers } from "next/headers";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { RecentReports } from "@/components/dashboard/recent-reports";
import { StatsCards } from "@/components/dashboard/stats-cards";
import {
  getDashboardStats,
  getRecentReports,
} from "@/lib/actions/dashboard-actions";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null; // Layout handles redirect
  }

  const userId = session.user.id;
  const [stats, recentReports] = await Promise.all([
    getDashboardStats(userId),
    getRecentReports(userId),
  ]);

  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <DashboardHero userName={session.user.name} />

      {/* Stats cards */}
      <div className="py-8">
        <StatsCards stats={stats} />
      </div>

      {/* Recent reports */}
      <RecentReports reports={recentReports} />
    </div>
  );
}
