import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReportStatus } from "@/app/generated/prisma/client";
import { getReports, type ReportFilters } from "@/lib/actions/reports-actions";
import { auth } from "@/lib/auth";
import { ReportsClient } from "./client";

interface ReportsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: ReportStatus;
    page?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/signin");
  }

  const params = await searchParams;
  const userId = session.user.id;
  const page = params.page ? parseInt(params.page, 10) : 1;

  const filters: ReportFilters = {};
  if (params.search) filters.search = params.search;
  if (params.status) filters.status = params.status;

  const { reports, pagination } = await getReports(userId, filters, page);

  return (
    <ReportsClient
      initialReports={reports}
      initialPagination={pagination}
      userId={userId}
    />
  );
}
