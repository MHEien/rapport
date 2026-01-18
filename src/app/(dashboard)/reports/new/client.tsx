"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Package,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  type CustomerOption,
  CustomerSelect,
} from "@/components/report/customer-select";
import {
  type CustomerEquipmentWithHistory,
  EquipmentSelector,
} from "@/components/report/equipment-selector";
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
import { Switch } from "@/components/ui/switch";
import {
  type BulkEquipmentInput,
  createReportWithEquipment,
} from "@/lib/actions/equipment-actions";

interface NewReportClientProps {
  productTypes: string[];
}

interface EquipmentItem extends BulkEquipmentInput {
  id: string; // Local ID for UI tracking
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function NewReportClient({ productTypes }: NewReportClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form state - Step 1: Customer
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerOption | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [contactPerson, setContactPerson] = useState("");

  // Customer equipment from EquipmentSelector
  const [customerEquipment, setCustomerEquipment] = useState<
    (CustomerEquipmentWithHistory & {
      selected: boolean;
      currentRunningHours?: number;
    })[]
  >([]);

  // Form state - Step 2: Equipment list (manual entries)
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);

  const mutation = useMutation({
    mutationFn: async () => {
      // Combine customer equipment and manual equipment
      const selectedCustomerEquipment = customerEquipment
        .filter((eq) => eq.selected)
        .map((eq) => ({
          productType: eq.productType,
          productName: eq.productName,
          model: eq.model || "",
          serialNumber: eq.serialNumber || "",
          jobType: "SERVICE" as const,
          included: true,
          runningHours: eq.currentRunningHours,
          customerEquipmentId: eq.id,
        }));

      const manualEquipment = equipment.filter((eq) => eq.included);
      const allEquipment = [...selectedCustomerEquipment, ...manualEquipment];

      return createReportWithEquipment({
        customerName: selectedCustomer?.name || customerName,
        contactPerson: contactPerson || undefined,
        customerId: selectedCustomer?.id,
        equipment: allEquipment,
      });
    },
    onSuccess: (report) => {
      // Navigate to edit - start with first equipment's checklist
      if (report.equipment.length > 0) {
        router.push(`/reports/${report.id}/edit`);
      } else {
        router.push(`/reports/${report.id}`);
      }
    },
  });

  // Add new equipment item
  const addEquipment = () => {
    setEquipment((prev) => [
      ...prev,
      {
        id: generateId(),
        productType: productTypes[0] ?? "Generator",
        productName: "",
        model: "",
        serialNumber: "",
        jobType: "SERVICE",
        included: true,
      },
    ]);
  };

  // Remove equipment item
  const removeEquipment = (id: string) => {
    if (equipment.length > 1) {
      setEquipment((prev) => prev.filter((eq) => eq.id !== id));
    }
  };

  // Update equipment item
  const updateEquipment = (id: string, updates: Partial<EquipmentItem>) => {
    setEquipment((prev) =>
      prev.map((eq) => (eq.id === id ? { ...eq, ...updates } : eq)),
    );
  };

  const canProceedStep1 =
    selectedCustomer !== null || customerName.trim().length > 0;
  const hasSelectedEquipment = customerEquipment.some((eq) => eq.selected);
  const hasManualEquipment = equipment.some(
    (eq) =>
      eq.included &&
      eq.productName.trim().length > 0 &&
      eq.productType.length > 0,
  );
  const canProceedStep2 = hasSelectedEquipment || hasManualEquipment;

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
      <main className="flex-1 px-4 py-6 overflow-y-auto">
        {step === 1 && (
          <div className="space-y-6">
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
                  <Label>Velg kunde *</Label>
                  <CustomerSelect
                    value={selectedCustomer?.id}
                    customerName={customerName}
                    onSelect={(customer) => {
                      setSelectedCustomer(customer);
                      if (customer) {
                        setCustomerName(customer.name);
                        setContactPerson(customer.contact || "");
                      }
                    }}
                  />
                  {!selectedCustomer && (
                    <p className="text-xs text-slate-400 mt-1">
                      Søk etter eksisterende kunde eller opprett ny
                    </p>
                  )}
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

            {/* Equipment Selector - shows when customer is selected */}
            {selectedCustomer && (
              <EquipmentSelector
                customerId={selectedCustomer.id}
                productTypes={productTypes}
                onEquipmentChange={setCustomerEquipment}
              />
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center">
                <Package className="size-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Utstyrsliste
                </h2>
                <p className="text-sm text-slate-400">
                  Legg til utstyr som skal serviceres
                </p>
              </div>
            </div>

            {/* Equipment list */}
            {equipment.map((eq, index) => (
              <Card
                key={eq.id}
                className={`border-white/5 bg-white/[0.02] ${
                  !eq.included ? "opacity-50" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center size-7 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-bold">
                        {index + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={eq.included}
                          onCheckedChange={(checked) =>
                            updateEquipment(eq.id, { included: checked })
                          }
                        />
                        <span className="text-sm text-slate-300">Inkluder</span>
                      </div>
                    </div>
                    {equipment.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-400"
                        onClick={() => removeEquipment(eq.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Job Type & Product Type */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-slate-400">
                        Type jobb
                      </Label>
                      <select
                        value={eq.jobType}
                        onChange={(e) =>
                          updateEquipment(eq.id, {
                            jobType: e.target.value as
                              | "SERVICE"
                              | "COMMISSIONING",
                          })
                        }
                        className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm"
                      >
                        <option value="SERVICE">Service</option>
                        <option value="COMMISSIONING">Igangkjøring</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-slate-400">
                        Produkt
                      </Label>
                      <select
                        value={eq.productType}
                        onChange={(e) =>
                          updateEquipment(eq.id, {
                            productType: e.target.value,
                          })
                        }
                        className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm"
                      >
                        {productTypes.length > 0
                          ? productTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))
                          : ["Generator", "UV-system", "Tørker", "Annet"].map(
                              (type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ),
                            )}
                      </select>
                    </div>
                  </div>

                  {/* Name/Marking */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-slate-400">
                      Merking / Navn
                    </Label>
                    <Input
                      value={eq.productName}
                      onChange={(e) =>
                        updateEquipment(eq.id, { productName: e.target.value })
                      }
                      placeholder="F.eks. Pumpe hovedbygg"
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  {/* Model & Serial Number */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-slate-400">
                        Modell
                      </Label>
                      <Input
                        value={eq.model ?? ""}
                        onChange={(e) =>
                          updateEquipment(eq.id, { model: e.target.value })
                        }
                        placeholder="Modellbetegnelse"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-slate-400">
                        Serienummer
                      </Label>
                      <Input
                        value={eq.serialNumber ?? ""}
                        onChange={(e) =>
                          updateEquipment(eq.id, {
                            serialNumber: e.target.value,
                          })
                        }
                        placeholder="Serienr."
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add equipment button */}
            <button
              type="button"
              onClick={addEquipment}
              className="w-full py-6 rounded-xl border-2 border-dashed border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors flex flex-col items-center gap-2 text-slate-400 hover:text-blue-400"
            >
              <div className="size-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Plus className="size-5 text-blue-400" />
              </div>
              <span className="text-sm font-medium">Legg til nytt utstyr</span>
            </button>
          </div>
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
