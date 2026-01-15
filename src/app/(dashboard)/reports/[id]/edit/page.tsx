import { notFound } from "next/navigation";
import { getReportWithChecklist } from "@/lib/actions/checklist-actions";
import { ReportEditClient } from "./client";

interface ReportEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportEditPage({ params }: ReportEditPageProps) {
  const { id } = await params;

  const report = await getReportWithChecklist(id);

  if (!report) {
    notFound();
  }

  return (
    <ReportEditClient report={report} existingResults={report.checklists} />
  );
}
