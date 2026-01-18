"use client";

import { useQuery } from "@tanstack/react-query";
import { Camera, Cloud, CloudOff, WifiOff } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type {
  ChecklistResult,
  ChecklistStatus,
  ReportEquipment,
} from "@/app/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  type SyncStatus,
  useOfflineMutation,
} from "@/hooks/use-offline-mutation";
import {
  getServicePointsByProductType,
  type SaveChecklistInput,
  saveChecklistResult,
} from "@/lib/actions/checklist-actions";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

type EquipmentWithChecklists = ReportEquipment & {
  checklists: (ChecklistResult & { photos: { url: string }[] })[];
};

interface ChecklistTableProps {
  equipment: EquipmentWithChecklists[];
  organizationId: string;
  onComplete?: () => void;
}

// ============================================================================
// SYNC STATUS INDICATOR
// ============================================================================

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const config = {
    synced: {
      icon: Cloud,
      label: "Tilkoblet",
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    pending: {
      icon: CloudOff,
      label: "Lagret lokalt",
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
    offline: {
      icon: WifiOff,
      label: "Offline",
      className: "bg-red-500/20 text-red-400 border-red-500/30",
    },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <Badge variant="outline" className={cn("gap-1.5", className)}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}

// ============================================================================
// STATUS BUTTON GROUP (Inline)
// ============================================================================

interface StatusButtonGroupProps {
  selectedStatus?: ChecklistStatus;
  onSelect: (status: ChecklistStatus) => void;
  disabled?: boolean;
}

function StatusButtonGroup({
  selectedStatus,
  onSelect,
  disabled,
}: StatusButtonGroupProps) {
  const statuses: { value: ChecklistStatus; icon: string; color: string }[] = [
    { value: "OK", icon: "✓", color: "bg-emerald-500" },
    { value: "BOR_UTBEDRES", icon: "⚠", color: "bg-amber-500" },
    { value: "IKKE_AKTUELT", icon: "⊘", color: "bg-slate-500" },
  ];

  return (
    <div className="flex items-center gap-1">
      {statuses.map((s) => (
        <button
          key={s.value}
          type="button"
          onClick={() => onSelect(s.value)}
          disabled={disabled}
          className={cn(
            "size-10 rounded-full flex items-center justify-center text-lg transition-all",
            "border-2 border-white/10 hover:border-white/30",
            "min-h-[48px] min-w-[48px]", // For gloved usage
            selectedStatus === s.value
              ? `${s.color} text-white border-transparent`
              : "bg-white/5 text-slate-400",
          )}
        >
          {s.icon}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// SINGLE CHECKLIST ROW
// ============================================================================

interface ChecklistRowProps {
  index: number;
  category: string;
  question: string;
  equipmentId: string;
  existingResult?: ChecklistResult;
  onSave: (input: SaveChecklistInput) => void;
  isSaving: boolean;
}

function ChecklistRow({
  category,
  question,
  equipmentId,
  existingResult,
  onSave,
  isSaving,
}: ChecklistRowProps) {
  const [status, setStatus] = useState<ChecklistStatus | undefined>(
    existingResult?.status,
  );
  const [comment, setComment] = useState(existingResult?.comment ?? "");
  const [showComment, setShowComment] = useState(!!existingResult?.comment);

  const handleStatusSelect = (newStatus: ChecklistStatus) => {
    setStatus(newStatus);
    onSave({
      equipmentId,
      category,
      question,
      status: newStatus,
      comment: comment.trim() || undefined,
    });
  };

  const handleCommentBlur = () => {
    if (status) {
      onSave({
        equipmentId,
        category,
        question,
        status,
        comment: comment.trim() || undefined,
      });
    }
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-start py-3 px-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      {/* Service Point Text - spans 5 columns on desktop, full width on mobile */}
      <div className="col-span-12 lg:col-span-5 mb-2 lg:mb-0">
        <p className="text-sm leading-relaxed">{question}</p>
      </div>

      {/* Status Buttons - 3 columns */}
      <div className="col-span-5 lg:col-span-2 flex justify-center">
        <StatusButtonGroup
          selectedStatus={status}
          onSelect={handleStatusSelect}
          disabled={isSaving}
        />
      </div>

      {/* Value Input - 2 columns (placeholder for now) */}
      <div className="col-span-3 lg:col-span-1">
        <Input
          placeholder="-"
          className="h-12 text-center bg-white/5 border-white/10"
          disabled
        />
      </div>

      {/* Comment + Camera - 4 columns */}
      <div className="col-span-4 lg:col-span-4 flex gap-2">
        {showComment ? (
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={handleCommentBlur}
            placeholder="Kommentar..."
            className="min-h-[48px] text-sm bg-white/5 border-white/10 flex-1"
            rows={2}
          />
        ) : (
          <Button
            variant="outline"
            className="flex-1 h-12 border-dashed border-white/10 text-muted-foreground"
            onClick={() => setShowComment(true)}
          >
            Ingen kommentar
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 border-dashed border-white/10"
          disabled
        >
          <Camera className="size-5 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// CATEGORY SECTION
// ============================================================================

interface CategorySectionProps {
  category: string;
  servicePoints: { category: string; text: string }[];
  equipmentId: string;
  existingResults: ChecklistResult[];
  onSave: (input: SaveChecklistInput) => void;
  isSaving: boolean;
}

function CategorySection({
  category,
  servicePoints,
  equipmentId,
  existingResults,
  onSave,
  isSaving,
}: CategorySectionProps) {
  // Create lookup for existing results
  const resultsMap = useMemo(() => {
    const map = new Map<string, ChecklistResult>();
    for (const result of existingResults) {
      map.set(`${result.category}:${result.question}`, result);
    }
    return map;
  }, [existingResults]);

  return (
    <div>
      {/* Category Header */}
      <div className="bg-white/[0.03] px-4 py-2 border-b border-white/10">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-slate-300">
          {category}
        </h3>
      </div>

      {/* Rows */}
      {servicePoints.map((point, idx) => (
        <ChecklistRow
          key={`${point.category}:${point.text}`}
          index={idx}
          category={point.category}
          question={point.text}
          equipmentId={equipmentId}
          existingResult={resultsMap.get(`${point.category}:${point.text}`)}
          onSave={onSave}
          isSaving={isSaving}
        />
      ))}
    </div>
  );
}

// ============================================================================
// EQUIPMENT TAB CONTENT
// ============================================================================

interface EquipmentTabContentProps {
  equipment: EquipmentWithChecklists;
  organizationId: string;
}

function EquipmentTabContent({ equipment, organizationId }: EquipmentTabContentProps) {
  // Fetch service points for this equipment's product type
  const reportType = equipment.jobType === "COMMISSIONING" ? "COMMISSIONING" : "SERVICE";
  const { data: servicePoints = [], isLoading } = useQuery({
    queryKey: ["servicePoints", equipment.productType, organizationId, reportType],
    queryFn: () =>
      getServicePointsByProductType(equipment.productType, organizationId, reportType),
  });

  // Offline-aware mutation for saving results
  const { mutate: saveResult, isPending: isSaving } = useOfflineMutation(
    saveChecklistResult,
    {
      actionName: "saveChecklistResult",
    },
  );

  // Group service points by category and preserve order
  const { groupedPoints, categories } = useMemo(() => {
    const groups: Record<string, typeof servicePoints> = {};
    const cats: string[] = [];

    for (const point of servicePoints) {
      if (!groups[point.category]) {
        groups[point.category] = [];
        cats.push(point.category);
      }
      groups[point.category].push(point);
    }
    return { groupedPoints: groups, categories: cats };
  }, [servicePoints]);

  const handleSave = useCallback(
    (input: SaveChecklistInput) => {
      saveResult(input);
    },
    [saveResult],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Laster sjekkpunkter...</p>
        </div>
      </div>
    );
  }

  if (servicePoints.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center px-6">
          <p className="text-lg font-medium">Ingen sjekkpunkter funnet</p>
          <p className="text-muted-foreground">
            Ingen sjekkpunkter konfigurert for "{equipment.productType}".
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {/* Table Header */}
      <div className="hidden lg:grid grid-cols-12 gap-2 px-3 py-2 bg-white/[0.02] text-xs uppercase tracking-wider text-slate-400 font-medium">
        <div className="col-span-5">Sjekkpunkt</div>
        <div className="col-span-2 text-center">Status</div>
        <div className="col-span-1 text-center">Verdi</div>
        <div className="col-span-4">Kommentar</div>
      </div>

      {/* Categories */}
      {categories.map((category) => (
        <CategorySection
          key={category}
          category={category}
          servicePoints={groupedPoints[category]}
          equipmentId={equipment.id}
          existingResults={equipment.checklists}
          onSave={handleSave}
          isSaving={isSaving}
        />
      ))}
    </div>
  );
}

// ============================================================================
// MAIN CHECKLIST TABLE
// ============================================================================

export function ChecklistTable({ equipment, organizationId, onComplete }: ChecklistTableProps) {
  const [activeTab, setActiveTab] = useState(equipment[0]?.id ?? "");

  // Track sync status across all equipment
  const [syncStatus] = useState<SyncStatus>("synced");

  if (equipment.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Ingen utstyr registrert</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-lg">Utstyr</h2>
          <SyncStatusBadge status={syncStatus} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" disabled>
            <span className="text-xs">↓</span> PDF
          </Button>
          <Button
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
            onClick={onComplete}
          >
            <span className="text-xs">💾</span> Lagre
          </Button>
        </div>
      </div>

      {/* Equipment Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <div className="border-b border-white/5 px-4">
          <TabsList className="bg-transparent h-auto p-0 gap-0">
            {equipment.map((eq) => (
              <TabsTrigger
                key={eq.id}
                value={eq.id}
                className={cn(
                  "rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-emerald-500",
                  "data-[state=active]:text-emerald-400 data-[state=active]:bg-transparent",
                  "text-slate-400 hover:text-white transition-colors",
                )}
              >
                {eq.productName} -
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab Content */}
        {equipment.map((eq) => (
          <TabsContent
            key={eq.id}
            value={eq.id}
            className="flex-1 mt-0 overflow-auto"
          >
            <EquipmentTabContent equipment={eq} organizationId={organizationId} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
