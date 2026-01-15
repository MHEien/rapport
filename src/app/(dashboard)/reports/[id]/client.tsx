"use client";

import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { ChevronLeft, Download, FileText, Printer } from "lucide-react";
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
      <div className="flex items-center justify-center h-[600px] bg-slate-100 rounded-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
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

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fileName = `Rapport-${report.reportNumber}-${report.customerName.replace(/\s+/g, "-")}.pdf`;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur border-b border-white/5">
        <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-slate-400 hover:text-white"
            >
              <Link href="/">
                <ChevronLeft className="size-5" />
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

          <div className="flex items-center gap-2">
            {isClient && (
              <PDFDownloadLink
                document={<ReportPDF report={report} />}
                fileName={fileName}
              >
                {/* @ts-ignore */}
                {({ loading }) => (
                  <Button
                    className="bg-blue-600 hover:bg-blue-500 text-white"
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
              className="border-white/10 hidden sm:flex"
            >
              <Printer className="size-4 mr-2" />
              Skriv ut
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-hidden flex flex-col items-center">
        <div className="w-full max-w-5xl h-full flex-1 min-h-[500px] shadow-2xl rounded-xl overflow-hidden border border-white/10 bg-slate-900">
          {isClient ? (
            <PDFViewer
              width="100%"
              height="100%"
              className="w-full h-full border-none"
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
