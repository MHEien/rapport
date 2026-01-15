"use client";

import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, Cloud, CloudOff, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { StatusButtonRow, statusConfig } from "./status-button";
import { ChecklistProgress } from "./checklist-progress";
import { PhotoCapture } from "./photo-capture";

import {
  getServicePointsByProductType,
  saveChecklistResult,
  type SaveChecklistInput,
} from "@/lib/actions/checklist-actions";
import {
  useOfflineMutation,
  type SyncStatus,
} from "@/hooks/use-offline-mutation";

import type {
  ServicePoint,
  ChecklistResult,
  ChecklistStatus,
} from "@/app/generated/prisma/client";

// ============================================================================
// SYNC STATUS INDICATOR
// ============================================================================

function SyncStatusIndicator({ status }: { status: SyncStatus }) {
  const config = {
    synced: {
      icon: Cloud,
      label: "Synced",
      className: "bg-[var(--status-synced)]/20 text-[var(--status-synced)]",
    },
    pending: {
      icon: CloudOff,
      label: "Saved to Device",
      className: "bg-[var(--status-pending)]/20 text-[var(--status-pending)]",
    },
    offline: {
      icon: WifiOff,
      label: "Offline",
      className: "bg-[var(--status-offline)]/20 text-[var(--status-offline)]",
    },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        className,
      )}
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
    </div>
  );
}

// ============================================================================
// MAIN CHECKLIST WIZARD
// ============================================================================

interface ChecklistWizardProps {
  reportId: string;
  productType: string;
  reportType?: "SERVICE" | "COMMISSIONING";
  existingResults?: ChecklistResult[];
  onComplete?: () => void;
}

export function ChecklistWizard({
  reportId,
  productType,
  reportType = "SERVICE",
  existingResults = [],
  onComplete,
}: ChecklistWizardProps) {
  // Current position in the checklist
  const [currentIndex, setCurrentIndex] = useState(0);

  // Local state for answers (optimistic updates)
  const [answers, setAnswers] = useState<
    Map<string, { status: ChecklistStatus; resultId?: string }>
  >(() => {
    // Initialize from existing results
    const map = new Map();
    for (const result of existingResults) {
      const key = `${result.category}:${result.question}`;
      map.set(key, { status: result.status, resultId: result.id });
    }
    return map;
  });

  // Fetch service points for this product type
  const { data: servicePoints = [], isLoading } = useQuery({
    queryKey: ["servicePoints", productType, reportType],
    queryFn: () => getServicePointsByProductType(productType, reportType),
  });

  // Offline-aware mutation for saving results
  const {
    mutate: saveResult,
    syncStatus,
    isPending: isSaving,
  } = useOfflineMutation(saveChecklistResult, {
    actionName: "saveChecklistResult",
    onOptimisticUpdate: (input: SaveChecklistInput) => {
      // Immediately update local state
      const key = `${input.category}:${input.question}`;
      setAnswers((prev) => new Map(prev).set(key, { status: input.status }));
    },
    onSuccess: (data, input) => {
      // Update with actual result ID
      const key = `${input.category}:${input.question}`;
      setAnswers((prev) =>
        new Map(prev).set(key, {
          status: input.status,
          resultId: data.result.id,
        }),
      );
    },
  });

  // Current service point
  const currentPoint = servicePoints[currentIndex];

  // Get answer for current point
  const currentKey = currentPoint
    ? `${currentPoint.category}:${currentPoint.text}`
    : null;
  const currentAnswer = currentKey ? answers.get(currentKey) : undefined;

  // Get indices of completed items
  const completedIndices = servicePoints
    .map((point, index) => {
      const key = `${point.category}:${point.text}`;
      return answers.has(key) ? index : -1;
    })
    .filter((i) => i >= 0);

  // Handle status selection
  const handleStatusSelect = useCallback(
    (status: ChecklistStatus) => {
      if (!currentPoint) return;

      // Save the result
      saveResult({
        reportId,
        category: currentPoint.category,
        question: currentPoint.text,
        status,
      });

      // Auto-advance after a brief delay
      setTimeout(() => {
        if (currentIndex < servicePoints.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          // All done!
          onComplete?.();
        }
      }, 400);
    },
    [
      currentPoint,
      currentIndex,
      servicePoints.length,
      reportId,
      saveResult,
      onComplete,
    ],
  );

  // Navigation
  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const navigateTo = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading checklist...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (servicePoints.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <p className="text-lg font-medium">No Service Points Found</p>
          <p className="text-muted-foreground">
            There are no service points configured for product type "
            {productType}".
          </p>
        </div>
      </div>
    );
  }

  // Completion state
  if (currentIndex >= servicePoints.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="size-16 rounded-full bg-[var(--status-ok)]/20 flex items-center justify-center">
            <Cloud className="size-8 text-[var(--status-ok)]" />
          </div>
          <p className="text-lg font-medium">Checklist Complete!</p>
          <p className="text-muted-foreground">
            All {servicePoints.length} items have been reviewed.
          </p>
          <SyncStatusIndicator status={syncStatus} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Header with progress */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          disabled={currentIndex === 0}
          className="shrink-0"
        >
          <ChevronLeft className="size-5" />
        </Button>

        <ChecklistProgress
          total={servicePoints.length}
          current={currentIndex}
          completed={completedIndices}
          onNavigate={navigateTo}
        />

        <SyncStatusIndicator status={syncStatus} />
      </div>

      {/* Main content - Focus Mode Card */}
      <div className="flex-1 flex flex-col justify-center px-4 py-6">
        <Card className="border-2">
          <CardHeader className="pb-4">
            {/* Category badge */}
            <Badge
              variant="secondary"
              className="w-fit text-xs uppercase tracking-wider"
            >
              {currentPoint.category}
            </Badge>
            {/* Service point text */}
            <CardTitle className="text-2xl leading-tight">
              {currentPoint.text}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Photo capture */}
            <PhotoCapture
              checklistResultId={currentAnswer?.resultId ?? null}
              disabled={isSaving}
            />
          </CardContent>
        </Card>
      </div>

      {/* Status buttons - fixed at bottom */}
      <div className="sticky bottom-0 bg-background border-t px-4 py-4 pb-safe">
        <StatusButtonRow
          selectedStatus={currentAnswer?.status}
          onSelect={handleStatusSelect}
          disabled={isSaving}
        />
      </div>
    </div>
  );
}
