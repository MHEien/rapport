"use client";

import { FileText, Package, Truck } from "lucide-react";
import { useState } from "react";
import { InventoryList } from "@/components/inventory/inventory-list";
import { InventoryUpload } from "@/components/inventory/inventory-upload";
import type { ParsedPart } from "@/lib/actions/inventory-actions";

export function InventoryPageClient() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = (_parts: ParsedPart[], _sessionId: string) => {
    // Trigger refresh of the inventory list
    setRefreshKey((prev) => prev + 1);
  };

  const handleClear = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center">
          <Truck className="size-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Varebeholdning</h1>
          <p className="text-slate-400">
            Last opp PDF fra leverandør for å spore deler
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
            <FileText className="size-4 text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-white text-sm">1. Last opp PDF</p>
            <p className="text-xs text-slate-400">
              PDF fra leverandør med delenummer og antall
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="size-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Package className="size-4 text-emerald-400" />
          </div>
          <div>
            <p className="font-medium text-white text-sm">2. Registrer bruk</p>
            <p className="text-xs text-slate-400">
              Velg deler fra beholdningen i rapporter
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <Truck className="size-4 text-amber-400" />
          </div>
          <div>
            <p className="font-medium text-white text-sm">
              3. Se restbeholdning
            </p>
            <p className="text-xs text-slate-400">
              Hold oversikt over hva du har igjen
            </p>
          </div>
        </div>
      </div>

      {/* Upload section */}
      <InventoryUpload onUploadComplete={handleUploadComplete} />

      {/* Current inventory */}
      <InventoryList
        key={refreshKey}
        onClear={handleClear}
        onRefresh={() => setRefreshKey((prev) => prev + 1)}
      />
    </div>
  );
}
