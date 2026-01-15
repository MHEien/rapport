"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Package,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createReport } from "@/lib/actions/dashboard-actions";

interface NewReportClientProps {
  userId: string;
  productTypes: string[];
}

export function NewReportClient({
  userId,
  productTypes,
}: NewReportClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      return createReport({
        authorId: userId,
        customerName,
        productName,
        productType,
        serialNumber: serialNumber || undefined,
      });
    },
    onSuccess: (report) => {
      router.push(`/reports/${report.id}/edit`);
    },
  });

  const canProceedStep1 = customerName.trim().length > 0;
  const canProceedStep2 =
    productName.trim().length > 0 && productType.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur border-b border-white/5">
        <div className="flex items-center gap-4 px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
            className="shrink-0"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-white">Ny Rapport</h1>
            <p className="text-xs text-slate-400">Steg {step} av 2</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-6">
        {step === 1 && (
          <Card className="border-white/5 bg-white/[0.02]">
            <CardHeader>
              <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 flex items-center justify-center mb-2">
                <User className="size-6 text-blue-400" />
              </div>
              <CardTitle className="text-xl text-white">
                Kundeinformasjon
              </CardTitle>
              <CardDescription>Hvem utfører du service for?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customerName">Kundenavn *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="F.eks. Statoil ASA"
                  className="h-14 text-lg bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Kontaktperson</Label>
                <Input
                  id="contactPerson"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Navn på kontaktperson"
                  className="h-14 text-lg bg-white/5 border-white/10"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-white/5 bg-white/[0.02]">
            <CardHeader>
              <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center mb-2">
                <Package className="size-6 text-emerald-400" />
              </div>
              <CardTitle className="text-xl text-white">
                Utstyrsinformasjon
              </CardTitle>
              <CardDescription>
                Hvilket utstyr skal du servicere?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="productName">Produktnavn *</Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="F.eks. Caterpillar Generator"
                  className="h-14 text-lg bg-white/5 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label>Produkttype *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {productTypes.length > 0
                    ? productTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setProductType(type)}
                          className={`
                          p-4 rounded-xl border text-left transition-all
                          ${
                            productType === type
                              ? "border-blue-500 bg-blue-500/10 text-white"
                              : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                          }
                        `}
                        >
                          <p className="font-medium">{type}</p>
                        </button>
                      ))
                    : // Fallback options if no types defined
                      ["Generator", "UV-system", "Tørker", "Annet"].map(
                        (type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setProductType(type)}
                            className={`
                            p-4 rounded-xl border text-left transition-all
                            ${
                              productType === type
                                ? "border-blue-500 bg-blue-500/10 text-white"
                                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                            }
                          `}
                          >
                            <p className="font-medium">{type}</p>
                          </button>
                        ),
                      )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serienummer</Label>
                <Input
                  id="serialNumber"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Valgfritt"
                  className="h-14 text-lg bg-white/5 border-white/10"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 bg-slate-900/80 backdrop-blur border-t border-white/5 px-4 py-4 pb-safe">
        {step === 1 ? (
          <Button
            size="lg"
            className="w-full h-14 text-lg bg-gradient-to-r from-blue-500 to-indigo-600"
            disabled={!canProceedStep1}
            onClick={() => setStep(2)}
          >
            Neste
            <ChevronRight className="ml-2 size-5" />
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-600"
            disabled={!canProceedStep2 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Oppretter..." : "Start rapport"}
            <FileText className="ml-2 size-5" />
          </Button>
        )}
      </footer>
    </div>
  );
}
