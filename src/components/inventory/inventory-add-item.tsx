"use client";

import { ChevronDown, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addInventoryItem } from "@/lib/actions/inventory-actions";
import { cn } from "@/lib/utils";

interface InventoryAddItemProps {
  onItemAdded?: () => void;
  className?: string;
}

export function InventoryAddItem({
  onItemAdded,
  className,
}: InventoryAddItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [partNumber, setPartNumber] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("stk");

  const resetForm = () => {
    setPartNumber("");
    setDescription("");
    setQuantity("");
    setUnit("stk");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!partNumber.trim()) {
      toast.error("Artikkelnummer er påkrevd");
      return;
    }
    if (!description.trim()) {
      toast.error("Beskrivelse er påkrevd");
      return;
    }
    const qty = Number.parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error("Antall må være et positivt tall");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addInventoryItem({
        partNumber: partNumber.trim(),
        description: description.trim(),
        quantity: qty,
        unit,
      });

      if (result.success) {
        toast.success("Vare lagt til i beholdningen");
        resetForm();
        setIsOpen(false);
        onItemAdded?.();
      } else {
        toast.error(result.error || "Kunne ikke legge til vare");
      }
    } catch (error) {
      console.error("Failed to add inventory item:", error);
      toast.error("En feil oppstod");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={cn("border-white/5 bg-white/[0.02]", className)}>
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Plus className="size-4 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-base text-white">
                  Legg til vare manuelt
                </CardTitle>
                <CardDescription className="text-sm">
                  Registrer enkeltdeler direkte
                </CardDescription>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "size-5 text-slate-400 transition-transform duration-200",
                isOpen && "rotate-180",
              )}
            />
          </div>
        </CardHeader>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Part Number */}
            <div className="space-y-2">
              <Label htmlFor="partNumber" className="text-slate-300">
                Artikkelnummer
              </Label>
              <Input
                id="partNumber"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="f.eks. ABC-123"
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-300">
                Beskrivelse
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Hva er denne delen?"
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                disabled={isSubmitting}
              />
            </div>

            {/* Quantity and Unit in row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-slate-300">
                  Antall
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit" className="text-slate-300">
                  Enhet
                </Label>
                <Select
                  value={unit}
                  onValueChange={setUnit}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="unit"
                    className="h-12 bg-white/5 border-white/10 text-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stk">stk</SelectItem>
                    <SelectItem value="pcs">pcs</SelectItem>
                    <SelectItem value="liter">liter</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Legger til...
                </>
              ) : (
                <>
                  <Plus className="size-4 mr-2" />
                  Legg til
                </>
              )}
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
