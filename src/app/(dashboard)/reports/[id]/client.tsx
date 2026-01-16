"use client";

import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { ChevronLeft, Download, Eye, FileText, Printer } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReportPDFData } from "@/components/pdf/report-pdf";
import { ReportPDF } from "@/components/pdf/report-pdf";
import { Button } from "@/components/ui/button";

// Dynamic imports for react-pdf components to avoid SSR issues
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-slate-800 rounded-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
      </div>
    ),
  },
);

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false },
);

interface ReportViewClientProps {
  report: ReportPDFData;
}

export function ReportViewClient({ report }: ReportViewClientProps) {
  const [isClient, setIsClient] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fileName = `Rapport-${report.reportNumber}-${report.customerName.replace(/\\s+/g, "-")}.pdf`;

  // Report info helper
  const equipmentCount = report.equipment?.length ?? 0;
  const firstEquipment = report.equipment?.[0];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur border-b border-white/5">
        <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-slate-400 hover:text-white min-h-[48px] min-w-[48px]"
            >
              <Link href="/reports">
                <ChevronLeft className="size-6" />
              </Link>
            </Button>
            <div>
              <h1 className="font-semibold text-white flex items-center gap-2">
                <FileText className="size-4 text-blue-400" />
                Rapport #{report.reportNumber}
              </h1>
              <p className="text-xs text-slate-400">
                {format(new Date(report.createdAt), "d. MMM yyyy", {
                  locale: nb,
                })}
              </p>
            </div>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            {isClient && (
              <PDFDownloadLink
                document={<ReportPDF report={report} />}
                fileName={fileName}
              >
                {/* @ts-ignore */}
                {({ loading }) => (
                  <Button
                    className="bg-blue-600 hover:bg-blue-500 text-white min-h-[48px]"
                    disabled={loading}
                  >
                    <Download className="size-4 mr-2" />
                    {loading ? "Genererer..." : "Last ned PDF"}
                  </Button>
                )}
              </PDFDownloadLink>
            )}
            <Button
              variant="outline"
              className="border-white/10 min-h-[48px]"
              onClick={() => window.print()}
            >
              <Printer className="size-4 mr-2" />
              Skriv ut
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile: Show report summary + prominent download */}
      <div className="md:hidden p-4 space-y-4">
        {/* Report summary card */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Kunde</p>
            <p className="text-lg font-medium text-white">{report.customerName}</p>
          </div>
          
          {report.customerAddress && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Adresse</p>
              <p className="text-sm text-slate-300">{report.customerAddress}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Utstyr</p>
              <p className="text-sm text-white">{equipmentCount} stk</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Servicedato</p>
              <p className="text-sm text-white">
                {format(new Date(report.serviceDate), "d. MMM yyyy", { locale: nb })}
              </p>
            </div>
          </div>

          {equipmentCount > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Utstyrsliste</p>
              <div className="space-y-2">
                {report.equipment.map((eq, idx) => (
                  <div key={eq.id} className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500">{idx + 1}.</span>
                    <span className="text-white">{eq.productName}</span>
                    <span className="text-slate-400">({eq.productType})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Download button - prominent for mobile */}
        {isClient && (
          <PDFDownloadLink
            document={<ReportPDF report={report} />}
            fileName={fileName}
          >
            {/* @ts-ignore */}
            {({ loading }) => (
              <Button
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white min-h-[56px] text-lg shadow-lg shadow-blue-500/20"
                disabled={loading}
              >
                <Download className="size-5 mr-3" />
                {loading ? "Genererer PDF..." : "Last ned PDF"}
              </Button>
            )}
          </PDFDownloadLink>
        )}

        {/* Toggle to show preview on mobile */}
        <Button
          variant="outline"
          className="w-full border-white/10 min-h-[48px]"
          onClick={() => setShowPreview(!showPreview)}
        >
          <Eye className="size-4 mr-2" />
          {showPreview ? "Skjul forhåndsvisning" : "Vis forhåndsvisning"}
        </Button>

        {/* Mobile PDF preview (optional, toggled) */}
        {showPreview && isClient && (
          <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-900 h-[60vh]">
            <PDFViewer
              width="100%"
              height="100%"
              className="w-full h-full border-none"
              showToolbar={false}
            >
              <ReportPDF report={report} />
            </PDFViewer>
          </div>
        )}
      </div>

      {/* Desktop: Full PDF viewer */}
      <main className="hidden md:flex flex-1 p-4 lg:p-8 flex-col items-center">
        <div className="w-full max-w-5xl h-[calc(100vh-100px)] shadow-2xl rounded-xl overflow-hidden border border-white/10 bg-slate-900">
          {isClient ? (
            <PDFViewer
              width="100%"
              height="100%"
              className="w-full h-full border-none"
              showToolbar={true}
            >
              <ReportPDF report={report} />
            </PDFViewer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Laster forhåndsvisning...
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
