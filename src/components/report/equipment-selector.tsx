"use client";

import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar, Clock, Loader2, Plus, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addCustomerEquipment,
  getCustomerWithEquipment,
} from "@/lib/actions/customer-actions";
import { cn } from "@/lib/utils";

export interface CustomerEquipmentWithHistory {
  id: string;
  productType: string;
  productName: string;
  model: string | null;
  serialNumber: string | null;
  lastRunningHours: number | null;
  lastServiceDate: Date | null;
  lastReportNumber: number | null;
}

interface SelectedEquipment extends CustomerEquipmentWithHistory {
  selected: boolean;
  currentRunningHours?: number;
}

interface EquipmentSelectorProps {
  customerId: string | null;
  productTypes: string[];
  onEquipmentChange: (equipment: SelectedEquipment[]) => void;
  className?: string;
}

export function EquipmentSelector({
  customerId,
  productTypes,
  onEquipmentChange,
  className,
}: EquipmentSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [equipment, setEquipment] = useState<SelectedEquipment[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    productType: productTypes[0] || "",
    productName: "",
    model: "",
    serialNumber: "",
  });
  const [adding, setAdding] = useState(false);

  // Fetch customer equipment when customerId changes
  useEffect(() => {
    if (!customerId) {
      setEquipment([]);
      return;
    }

    const fetchEquipment = async () => {
      setLoading(true);
      try {
        const customer = await getCustomerWithEquipment(customerId);
        if (customer) {
          setEquipment(
            customer.equipment.map((eq) => ({
              ...eq,
              selected: true, // Default to selected
              currentRunningHours: undefined,
            })),
          );
        }
      } catch (error) {
        console.error("Failed to fetch equipment:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [customerId]);

  // Notify parent when equipment changes
  useEffect(() => {
    onEquipmentChange(equipment);
  }, [equipment, onEquipmentChange]);

  const toggleEquipment = (id: string) => {
    setEquipment((prev) =>
      prev.map((eq) => (eq.id === id ? { ...eq, selected: !eq.selected } : eq)),
    );
  };

  const updateCurrentHours = (id: string, hours: number | undefined) => {
    setEquipment((prev) =>
      prev.map((eq) =>
        eq.id === id ? { ...eq, currentRunningHours: hours } : eq,
      ),
    );
  };

  const handleAddEquipment = async () => {
    if (!customerId || !newEquipment.productName.trim()) return;

    setAdding(true);
    try {
      const result = await addCustomerEquipment({
        customerId,
        productType: newEquipment.productType,
        productName: newEquipment.productName,
        model: newEquipment.model || undefined,
        serialNumber: newEquipment.serialNumber || undefined,
      });

      if (result.success && result.equipment) {
        const added: SelectedEquipment = {
          id: result.equipment.id,
          productType: result.equipment.productType,
          productName: result.equipment.productName,
          model: result.equipment.model,
          serialNumber: result.equipment.serialNumber,
          lastRunningHours: null,
          lastServiceDate: null,
          lastReportNumber: null,
          selected: true,
        };
        setEquipment((prev) => [...prev, added]);
        setShowAddDialog(false);
        setNewEquipment({
          productType: productTypes[0] || "",
          productName: "",
          model: "",
          serialNumber: "",
        });
      }
    } catch (error) {
      console.error("Failed to add equipment:", error);
    } finally {
      setAdding(false);
    }
  };

  if (!customerId) {
    return (
      <div className={cn("text-center py-8 text-slate-400", className)}>
        <Wrench className="size-8 mx-auto mb-2 opacity-50" />
        <p>Velg kunde først for å se utstyret</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("text-center py-8", className)}>
        <Loader2 className="size-8 mx-auto mb-2 animate-spin text-blue-400" />
        <p className="text-slate-400">Henter utstyr...</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center">
            <Wrench className="size-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Kundens utstyr</h3>
            <p className="text-sm text-slate-400">
              {equipment.filter((e) => e.selected).length} av {equipment.length}{" "}
              valgt
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="size-4 mr-1" />
          Legg til
        </Button>
      </div>

      {/* Equipment list */}
      {equipment.length === 0 ? (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="py-8 text-center">
            <p className="text-slate-400 mb-4">
              Ingen utstyr registrert for denne kunden
            </p>
            <Button variant="outline" onClick={() => setShowAddDialog(true)}>
              <Plus className="size-4 mr-2" />
              Registrer første utstyr
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {equipment.map((eq) => (
            <Card
              key={eq.id}
              className={cn(
                "border-white/5 bg-white/[0.02] transition-all",
                eq.selected && "border-blue-500/30 bg-blue-500/5",
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <Checkbox
                    checked={eq.selected}
                    onCheckedChange={() => toggleEquipment(eq.id)}
                    className="mt-1"
                  />

                  {/* Equipment info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white truncate">
                        {eq.productName}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                        {eq.productType}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                      {eq.serialNumber && <span>SN: {eq.serialNumber}</span>}
                      {eq.model && <span>Modell: {eq.model}</span>}
                    </div>

                    {/* Last service info */}
                    {eq.lastRunningHours !== null && (
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-amber-400">
                          <Clock className="size-3.5" />
                          <span>Siste: {eq.lastRunningHours} timer</span>
                        </div>
                        {eq.lastServiceDate && (
                          <div className="flex items-center gap-1 text-slate-400">
                            <Calendar className="size-3.5" />
                            <span>
                              {format(
                                new Date(eq.lastServiceDate),
                                "d. MMM yyyy",
                                {
                                  locale: nb,
                                },
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Current hours input (when selected) */}
                    {eq.selected && (
                      <div className="mt-3 flex items-center gap-2">
                        <Label
                          htmlFor={`hours-${eq.id}`}
                          className="text-xs text-slate-400 whitespace-nowrap"
                        >
                          Nåværende timer:
                        </Label>
                        <Input
                          id={`hours-${eq.id}`}
                          type="number"
                          placeholder={
                            eq.lastRunningHours
                              ? `> ${eq.lastRunningHours}`
                              : "Timer"
                          }
                          value={eq.currentRunningHours ?? ""}
                          onChange={(e) =>
                            updateCurrentHours(
                              eq.id,
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            )
                          }
                          className="w-28 h-8 text-sm bg-white/5 border-white/10"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Equipment Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Legg til utstyr</DialogTitle>
            <DialogDescription>
              Registrer nytt utstyr for denne kunden
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="eqProductType">Produkttype</Label>
              <select
                id="eqProductType"
                value={newEquipment.productType}
                onChange={(e) =>
                  setNewEquipment((prev) => ({
                    ...prev,
                    productType: e.target.value,
                  }))
                }
                className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm"
              >
                {productTypes.length > 0
                  ? productTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))
                  : ["Generator", "UV-system", "Pumpe", "Annet"].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eqProductName">Merking / Navn *</Label>
              <Input
                id="eqProductName"
                value={newEquipment.productName}
                onChange={(e) =>
                  setNewEquipment((prev) => ({
                    ...prev,
                    productName: e.target.value,
                  }))
                }
                placeholder="F.eks. Pumpe hovedbygg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eqModel">Modell</Label>
                <Input
                  id="eqModel"
                  value={newEquipment.model}
                  onChange={(e) =>
                    setNewEquipment((prev) => ({
                      ...prev,
                      model: e.target.value,
                    }))
                  }
                  placeholder="Modellbetegnelse"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eqSerial">Serienummer</Label>
                <Input
                  id="eqSerial"
                  value={newEquipment.serialNumber}
                  onChange={(e) =>
                    setNewEquipment((prev) => ({
                      ...prev,
                      serialNumber: e.target.value,
                    }))
                  }
                  placeholder="Serienr."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={adding}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleAddEquipment}
              disabled={!newEquipment.productName.trim() || adding}
            >
              {adding ? "Legger til..." : "Legg til utstyr"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
