import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getReportWithChecklist } from "@/lib/actions/checklist-actions";
import { auth } from "@/lib/auth";
import { ReportViewClient } from "./client";

export default async function ReportViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const report = await getReportWithChecklist(id);

  if (!report) {
    notFound();
  }

  return <ReportViewClient report={report} />;
}
