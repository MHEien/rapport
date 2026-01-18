"use client";

import { Check, Loader2, Package, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ParsedPart,
  parseAndSaveInventoryPdf,
} from "@/lib/actions/inventory-actions";
import { cn } from "@/lib/utils";

interface InventoryUploadProps {
  onUploadComplete?: (parts: ParsedPart[], sessionId: string) => void;
  className?: string;
}

export function InventoryUpload({
  onUploadComplete,
  className,
}: InventoryUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    parts: ParsedPart[];
    sessionId: string;
  } | null>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.type.includes("pdf")) {
        setError("Vennligst last opp en PDF-fil");
        return;
      }

      setUploading(true);
      setError(null);
      setResult(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await parseAndSaveInventoryPdf(formData);

        if (response.success && response.parts && response.sessionId) {
          setResult({
            parts: response.parts,
            sessionId: response.sessionId,
          });
          toast.success(`${response.partsCount} deler importert!`);
          onUploadComplete?.(response.parts, response.sessionId);
        } else {
          setError(response.error || "Ukjent feil ved parsing");
        }
      } catch (err) {
        console.error("Upload error:", err);
        setError("Feil ved opplasting. Prøv igjen.");
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const resetUpload = () => {
    setResult(null);
    setError(null);
  };

  return (
    <Card className={cn("border-white/5 bg-white/[0.02]", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center">
              <Package className="size-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">
                Last inn varebeholdning
              </CardTitle>
              <CardDescription>Last opp PDF fra leverandør</CardDescription>
            </div>
          </div>
          {result && (
            <Button variant="outline" size="sm" onClick={resetUpload}>
              Last opp ny
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!result ? (
          // biome-ignore lint/a11y/useSemanticElements: intentional - drop zone with visible file input overlay
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.currentTarget.querySelector("input")?.click();
              }
            }}
            className={cn(
              "relative border-2 border-dashed rounded-xl transition-all p-8",
              isDragging
                ? "border-blue-500 bg-blue-500/10"
                : "border-white/10 hover:border-white/20",
              uploading && "pointer-events-none opacity-50",
            )}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />

            <div className="flex flex-col items-center text-center">
              {uploading ? (
                <>
                  <Loader2 className="size-10 text-blue-400 animate-spin mb-3" />
                  <p className="font-medium text-white">Parser PDF...</p>
                  <p className="text-sm text-slate-400">
                    Dette kan ta noen sekunder
                  </p>
                </>
              ) : (
                <>
                  <Upload className="size-10 text-slate-400 mb-3" />
                  <p className="font-medium text-white mb-1">
                    Slipp PDF her eller klikk for å velge
                  </p>
                  <p className="text-sm text-slate-400">
                    Støtter de fleste leverandør-formater
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="size-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="size-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-white">
                  {result.parts.length} deler importert
                </p>
                <p className="text-sm text-slate-400">
                  Klar til bruk i rapporter
                </p>
              </div>
            </div>

            {/* Preview of imported parts */}
            <div className="max-h-60 overflow-y-auto space-y-1">
              {result.parts.slice(0, 10).map((part, idx) => (
                <div
                  key={`${part.partNumber}-${idx}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs text-slate-400 mr-2">
                      {part.partNumber}
                    </span>
                    <span className="text-white truncate">
                      {part.description}
                    </span>
                  </div>
                  <span className="text-slate-300 shrink-0 ml-2">
                    {part.quantity} {part.unit}
                  </span>
                </div>
              ))}
              {result.parts.length > 10 && (
                <p className="text-center text-sm text-slate-400 py-2">
                  ... og {result.parts.length - 10} mer
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <X className="size-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
