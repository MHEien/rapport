"use client";

import { useMutation } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Package,
  PenTool,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import type {
  ChecklistResult,
  Report,
  ReportEquipment,
} from "@/app/generated/prisma/client";
import { ChecklistTable } from "@/components/report/checklist-table";
import { PartSelector } from "@/components/report/part-selector";
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
import { Textarea } from "@/components/ui/textarea";
import { updateReportSignature } from "@/lib/actions/checklist-actions";
import { updateReportEquipment } from "@/lib/actions/equipment-actions";

// ============================================================================
// TYPES
// ============================================================================

type Step = "equipment" | "checklist" | "summary";

type EquipmentWithChecklists = ReportEquipment & {
  checklists: (ChecklistResult & { photos: { url: string }[] })[];
};

interface ReportEditClientProps {
  report: Report & {
    equipment: EquipmentWithChecklists[];
  };
  existingResults: EquipmentWithChecklists[];
}

// ============================================================================
// STEP INDICATOR
// ============================================================================

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps: { key: Step; label: string; icon: React.ElementType }[] = [
    { key: "equipment", label: "Utstyr", icon: Package },
    { key: "checklist", label: "Sjekkliste", icon: ClipboardList },
    { key: "summary", label: "Sign", icon: PenTool },
  ];

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={`
                flex items-center justify-center size-10 rounded-full transition-colors
                ${isCompleted ? "bg-[var(--status-ok)] text-[var(--status-ok-foreground)]" : ""}
                ${isCurrent ? "bg-primary text-primary-foreground" : ""}
                ${!isCompleted && !isCurrent ? "bg-muted text-muted-foreground" : ""}
              `}
            >
              {isCompleted ? (
                <Check className="size-5" />
              ) : (
                <Icon className="size-5" />
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 w-8 ${
                  isCompleted ? "bg-[var(--status-ok)]" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// STEP 1: EQUIPMENT OVERVIEW
// ============================================================================

interface EquipmentStepProps {
  equipment: EquipmentWithChecklists[];
  onNext: () => void;
}

function EquipmentStep({ equipment, onNext }: EquipmentStepProps) {
  // Display equipment list summary and allow editing serial numbers/running hours
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serialNumber, setSerialNumber] = useState("");
  const [runningHours, setRunningHours] = useState("");
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: updateReportEquipment,
  });

  const startEditing = (eq: EquipmentWithChecklists) => {
    setEditingId(eq.id);
    setSerialNumber(eq.serialNumber ?? "");
    setRunningHours(eq.runningHours?.toString() ?? "");
  };

  const saveEditing = async () => {
    if (!editingId) return;
    await mutation.mutateAsync({
      equipmentId: editingId,
      serialNumber: serialNumber || undefined,
      runningHours: runningHours ? parseFloat(runningHours) : undefined,
    });
    router.refresh();
    setEditingId(null);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 px-4 py-6 space-y-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Bekreft utstyr</h2>
          <p className="text-sm text-muted-foreground">
            Kontroller utstyrsinformasjonen før du starter sjekklisten.
          </p>
        </div>

        {equipment.map((eq, index) => (
          <Card key={eq.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center size-8 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-bold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <CardTitle className="text-lg">{eq.productName}</CardTitle>
                  <CardDescription>
                    {eq.productType} •{" "}
                    {eq.jobType === "SERVICE" ? "Service" : "Igangkjøring"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingId === eq.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Serienummer</Label>
                      <Input
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        placeholder="Serienr."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Timeteller</Label>
                      <Input
                        type="number"
                        value={runningHours}
                        onChange={(e) => setRunningHours(e.target.value)}
                        placeholder="Timer"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={saveEditing}
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? "Lagrer..." : "Lagre"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Avbryt
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {eq.model && (
                      <span className="mr-3">Modell: {eq.model}</span>
                    )}
                    {eq.serialNumber && (
                      <span className="mr-3">SN: {eq.serialNumber}</span>
                    )}
                    {eq.runningHours && <span>{eq.runningHours}t</span>}
                    {!eq.model && !eq.serialNumber && !eq.runningHours && (
                      <span className="italic">Ingen detaljer lagt til</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEditing(eq)}
                  >
                    Rediger
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-background border-t px-4 py-4 pb-safe">
        <Button size="lg" className="w-full h-14 text-lg" onClick={onNext}>
          Start sjekkliste
          <ChevronRight className="ml-2 size-5" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// STEP 2: CHECKLIST TABLE (NEW)
// ============================================================================

interface ChecklistStepProps {
  equipment: EquipmentWithChecklists[];
  organizationId: string;
  onComplete: () => void;
}

function ChecklistStep({
  equipment,
  organizationId,
  onComplete,
}: ChecklistStepProps) {
  return (
    <div className="flex-1 flex flex-col">
      <ChecklistTable
        equipment={equipment}
        organizationId={organizationId}
        onComplete={onComplete}
      />
    </div>
  );
}

// ============================================================================
// STEP 3: SUMMARY & SIGNATURE
// ============================================================================

interface SummaryStepProps {
  report: Report;
  equipment: EquipmentWithChecklists[];
  onBack: () => void;
  onComplete: () => void;
}

function SummaryStep({
  report,
  equipment,
  onBack,
  onComplete,
}: SummaryStepProps) {
  const [comment, setComment] = useState(report.overallComment ?? "");
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not found");

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to create blob"));
        }, "image/png");
      });

      const formData = new FormData();
      formData.append("reportId", report.id);
      formData.append("signature", blob);

      return updateReportSignature(formData);
    },
    onSuccess: () => {
      onComplete();
    },
  });

  // Canvas drawing handlers
  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas?.width, canvas?.height);
    setHasSignature(false);
  };

  // Calculate totals
  const totalItems = equipment.reduce(
    (sum, eq) => sum + eq.checklists.length,
    0,
  );

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 px-4 py-6 space-y-6">
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Oppsummering</CardTitle>
            <CardDescription>
              {equipment.length} utstyr • {totalItems} sjekkpunkter fullført
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Generelle observasjoner, anbefalinger, etc."
              className="min-h-[120px] text-base"
            />
          </CardContent>
        </Card>

        {/* Parts Selector */}
        <PartSelector reportId={report.id} />

        {/* Signature Pad */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Signatur</CardTitle>
              <CardDescription>Signer for å fullføre rapporten</CardDescription>
            </div>
            {hasSignature && (
              <Button variant="ghost" size="sm" onClick={clearSignature}>
                Nullstill
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="relative border-2 border-dashed border-muted-foreground/30 rounded-xl overflow-hidden">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full h-[150px] touch-none bg-muted/30"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-muted-foreground">Signer her</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-background border-t px-4 py-4 pb-safe">
        <div className="flex gap-3">
          <Button variant="outline" size="lg" className="h-14" onClick={onBack}>
            <ChevronLeft className="mr-2 size-5" />
            Tilbake
          </Button>
          <Button
            size="lg"
            className="flex-1 h-14 text-lg bg-[var(--status-ok)] text-[var(--status-ok-foreground)] hover:bg-[var(--status-ok)]/90"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !hasSignature}
          >
            {mutation.isPending ? "Lagrer..." : "Fullfør rapport"}
            <Check className="ml-2 size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN CLIENT COMPONENT
// ============================================================================

export function ReportEditClient({
  report,
  existingResults,
}: ReportEditClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("equipment");

  // Use report.equipment or fall back to existingResults
  const equipment =
    report.equipment?.length > 0 ? report.equipment : existingResults;

  const handleComplete = () => {
    // Navigate to completed report view
    router.push(`/reports/${report.id}`);
  };

  if (!equipment || equipment.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium">Ingen utstyr funnet</p>
          <p className="text-muted-foreground">
            Denne rapporten har ingen utstyr registrert.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Step indicator */}
      <StepIndicator currentStep={step} />

      {/* Step content */}
      {step === "equipment" && (
        <EquipmentStep
          equipment={equipment}
          onNext={() => setStep("checklist")}
        />
      )}

      {step === "checklist" && (
        <ChecklistStep
          equipment={equipment}
          organizationId={report.organizationId}
          onComplete={() => setStep("summary")}
        />
      )}

      {step === "summary" && (
        <SummaryStep
          report={report}
          equipment={equipment}
          onBack={() => setStep("checklist")}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
