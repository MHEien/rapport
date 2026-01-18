"use client";

import { Loader2, Minus, Package, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getCurrentSessionInventory } from "@/lib/actions/inventory-actions";
import {
  addPartFromInventory,
  getReportParts,
  removePartFromReport,
} from "@/lib/actions/parts-actions";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  remaining: number;
  unit: string | null;
}

interface ReportPart {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  unit: string | null;
}

interface PartSelectorProps {
  reportId: string;
  onChange?: (parts: ReportPart[]) => void;
  className?: string;
}

export function PartSelector({
  reportId,
  onChange,
  className,
}: PartSelectorProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [reportParts, setReportParts] = useState<ReportPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addingPart, setAddingPart] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Fetch inventory and report parts
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [inventoryData, partsData] = await Promise.all([
          getCurrentSessionInventory(),
          getReportParts(reportId),
        ]);

        if (inventoryData) {
          setInventory(inventoryData.items);
          // Initialize quantities to 1
          const initialQty: Record<string, number> = {};
          for (const item of inventoryData.items) {
            initialQty[item.id] = 1;
          }
          setQuantities(initialQty);
        }

        setReportParts(partsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reportId]);

  // Notify parent when parts change
  useEffect(() => {
    onChange?.(reportParts);
  }, [reportParts, onChange]);

  const handleAddPart = async (item: InventoryItem) => {
    const qty = quantities[item.id] || 1;
    if (qty > item.remaining) {
      toast.error(`Kun ${item.remaining} tilgjengelig`);
      return;
    }

    setAddingPart(item.id);
    try {
      const result = await addPartFromInventory(reportId, item.id, qty);
      if (result.success && "part" in result && result.part) {
        const newPart: ReportPart = {
          id: result.part.id,
          partNumber: result.part.partNumber,
          description: result.part.description,
          quantity: result.part.quantity,
          unit: result.part.unit,
        };
        setReportParts((prev) => [...prev, newPart]);
        // Update local inventory
        setInventory((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, remaining: i.remaining - qty } : i,
          ),
        );
        toast.success(`${item.description} lagt til`);
      } else if ("error" in result) {
        toast.error(result.error || "Kunne ikke legge til del");
      }
    } catch (error) {
      console.error("Failed to add part:", error);
      toast.error("En feil oppstod");
    } finally {
      setAddingPart(null);
    }
  };

  const handleRemovePart = async (part: ReportPart) => {
    try {
      const result = await removePartFromReport(part.id);
      if (result.success) {
        setReportParts((prev) => prev.filter((p) => p.id !== part.id));
        // Refresh inventory to get updated remaining count
        const inventoryData = await getCurrentSessionInventory();
        if (inventoryData) {
          setInventory(inventoryData.items);
        }
        toast.success("Del fjernet");
      } else {
        toast.error(result.error || "Kunne ikke fjerne del");
      }
    } catch (error) {
      console.error("Failed to remove part:", error);
      toast.error("En feil oppstod");
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[itemId] || 1;
      const item = inventory.find((i) => i.id === itemId);
      const max = item?.remaining || 1;
      const newQty = Math.max(1, Math.min(max, current + delta));
      return { ...prev, [itemId]: newQty };
    });
  };

  return (
    <Card className={cn("border-white/5 bg-white/[0.02]", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 flex items-center justify-center">
              <Package className="size-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">Deler brukt</CardTitle>
              <CardDescription>
                {reportParts.length} del{reportParts.length !== 1 && "er"}{" "}
                registrert
              </CardDescription>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={inventory.length === 0 || loading}>
                <Plus className="size-4 mr-1" />
                Legg til del
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Velg deler fra varebeholdning</DialogTitle>
                <DialogDescription>
                  Velg deler du har brukt i denne servicen
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-80 overflow-y-auto space-y-2 mt-4">
                {inventory.filter((i) => i.remaining > 0).length === 0 ? (
                  <p className="text-center text-slate-400 py-4">
                    Ingen deler tilgjengelig i varebeholdning
                  </p>
                ) : (
                  inventory
                    .filter((item) => item.remaining > 0)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {item.description}
                          </p>
                          <p className="text-xs text-slate-400">
                            {item.partNumber} · {item.remaining} {item.unit}{" "}
                            tilgjengelig
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => updateQuantity(item.id, -1)}
                            disabled={quantities[item.id] <= 1}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <Input
                            type="number"
                            value={quantities[item.id] || 1}
                            onChange={(e) =>
                              setQuantities((prev) => ({
                                ...prev,
                                [item.id]: Math.max(
                                  1,
                                  Math.min(
                                    item.remaining,
                                    Number.parseInt(e.target.value) || 1,
                                  ),
                                ),
                              }))
                            }
                            className="w-14 h-7 text-center text-sm bg-white/10 border-white/10"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => updateQuantity(item.id, 1)}
                            disabled={quantities[item.id] >= item.remaining}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleAddPart(item)}
                          disabled={addingPart === item.id}
                        >
                          {addingPart === item.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            "Legg til"
                          )}
                        </Button>
                      </div>
                    ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-6 animate-spin text-blue-400" />
          </div>
        ) : reportParts.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <p>Ingen deler registrert ennå</p>
            {inventory.length === 0 && (
              <p className="text-sm mt-1">
                Last opp varebeholdning for å velge deler
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {reportParts.map((part) => (
              <div
                key={part.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {part.description}
                  </p>
                  <p className="text-xs text-slate-400">{part.partNumber}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">
                    {part.quantity} {part.unit}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => handleRemovePart(part)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
