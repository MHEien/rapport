"use client";

import { useMutation } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  PenTool,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChecklistResult, Report } from "@/app/generated/prisma/client";
import { ChecklistWizard } from "@/components/report/checklist-wizard";
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
import {
  updateReportHeader,
  updateReportSignature,
} from "@/lib/actions/checklist-actions";

// ============================================================================
// TYPES
// ============================================================================

type Step = "header" | "checklist" | "summary";

interface ReportEditClientProps {
  report: Report;
  existingResults: ChecklistResult[];
}

// ============================================================================
// STEP INDICATOR
// ============================================================================

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps: { key: Step; label: string; icon: React.ElementType }[] = [
    { key: "header", label: "Equipment", icon: FileText },
    { key: "checklist", label: "Checklist", icon: ClipboardList },
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
// STEP 1: HEADER INFO
// ============================================================================

interface HeaderStepProps {
  report: Report;
  onNext: () => void;
}

function HeaderStep({ report, onNext }: HeaderStepProps) {
  const [serialNumber, setSerialNumber] = useState(report.serialNumber);
  const [runningHours, setRunningHours] = useState(
    report.runningHours?.toString() ?? "",
  );
  const [customerName, setCustomerName] = useState(report.customerName);
  const [contactPerson, setContactPerson] = useState(
    report.contactPerson ?? "",
  );

  const mutation = useMutation({
    mutationFn: updateReportHeader,
    onSuccess: () => {
      onNext();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      reportId: report.id,
      serialNumber,
      runningHours: runningHours ? parseFloat(runningHours) : undefined,
      customerName,
      contactPerson: contactPerson || undefined,
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Equipment Information</CardTitle>
            <CardDescription>
              Confirm the equipment details before starting the checklist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Info (read-only) */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Product</Label>
                <p className="text-lg font-medium">{report.productName}</p>
                <p className="text-sm text-muted-foreground">
                  {report.productType}
                </p>
              </div>

              {/* Serial Number */}
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number *</Label>
                <Input
                  id="serialNumber"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Enter serial number"
                  className="h-14 text-lg"
                  required
                />
              </div>

              {/* Running Hours */}
              <div className="space-y-2">
                <Label htmlFor="runningHours">Running Hours</Label>
                <Input
                  id="runningHours"
                  type="number"
                  step="0.1"
                  value={runningHours}
                  onChange={(e) => setRunningHours(e.target.value)}
                  placeholder="e.g. 1234.5"
                  className="h-14 text-lg"
                />
              </div>

              {/* Customer */}
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="h-14 text-lg"
                  required
                />
              </div>

              {/* Contact Person */}
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="On-site contact"
                  className="h-14 text-lg"
                />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-background border-t px-4 py-4 pb-safe">
        <Button
          size="lg"
          className="w-full h-14 text-lg"
          onClick={handleSubmit}
          disabled={mutation.isPending || !serialNumber || !customerName}
        >
          {mutation.isPending ? "Saving..." : "Start Checklist"}
          <ChevronRight className="ml-2 size-5" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// STEP 3: SUMMARY & SIGNATURE
// ============================================================================

interface SummaryStepProps {
  report: Report;
  onBack: () => void;
  onComplete: () => void;
}

function SummaryStep({ report, onBack, onComplete }: SummaryStepProps) {
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
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas?.width, canvas?.height);
    setHasSignature(false);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 px-4 py-6 space-y-6">
        {/* Overall Comment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Summary</CardTitle>
            <CardDescription>
              Add any overall comments or observations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Overall observations, recommendations, etc."
              className="min-h-[120px] text-base"
            />
          </CardContent>
        </Card>

        {/* Signature Pad */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Signature</CardTitle>
              <CardDescription>Sign to complete the report</CardDescription>
            </div>
            {hasSignature && (
              <Button variant="ghost" size="sm" onClick={clearSignature}>
                Clear
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
                  <p className="text-muted-foreground">Sign here</p>
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
            Back
          </Button>
          <Button
            size="lg"
            className="flex-1 h-14 text-lg bg-[var(--status-ok)] text-[var(--status-ok-foreground)] hover:bg-[var(--status-ok)]/90"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !hasSignature}
          >
            {mutation.isPending ? "Saving..." : "Complete Report"}
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

import React from "react";

export function ReportEditClient({
  report,
  existingResults,
}: ReportEditClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("header");

  const handleComplete = () => {
    // Navigate to completed report view
    router.push(`/report/${report.id}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Step indicator */}
      <StepIndicator currentStep={step} />

      {/* Step content */}
      {step === "header" && (
        <HeaderStep report={report} onNext={() => setStep("checklist")} />
      )}

      {step === "checklist" && (
        <ChecklistWizard
          reportId={report.id}
          productType={report.productType}
          reportType={report.type}
          existingResults={existingResults}
          onComplete={() => setStep("summary")}
        />
      )}

      {step === "summary" && (
        <SummaryStep
          report={report}
          onBack={() => setStep("checklist")}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
