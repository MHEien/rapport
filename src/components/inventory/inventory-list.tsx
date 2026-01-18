"use client";

import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Loader2, Package, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  clearInventorySession,
  getCurrentSessionInventory,
} from "@/lib/actions/inventory-actions";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  remaining: number;
  unit: string | null;
}

interface InventorySession {
  sessionId: string;
  createdAt: Date;
  items: InventoryItem[];
  totalItems: number;
  itemsWithStock: number;
}

interface InventoryListProps {
  session?: InventorySession | null;
  onRefresh?: () => void;
  onClear?: () => void;
  showActions?: boolean;
  className?: string;
}

export function InventoryList({
  session: externalSession,
  onRefresh,
  onClear,
  showActions = true,
  className,
}: InventoryListProps) {
  const [session, setSession] = useState<InventorySession | null>(
    externalSession ?? null,
  );
  const [loading, setLoading] = useState(!externalSession);
  const [clearing, setClearing] = useState(false);

  // Fetch if no external session provided
  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchInventory is stable
  useEffect(() => {
    if (!externalSession) {
      fetchInventory();
    } else {
      setSession(externalSession);
    }
  }, [externalSession]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const data = await getCurrentSessionInventory();
      setSession(data);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!session) return;

    setClearing(true);
    try {
      const result = await clearInventorySession(session.sessionId);
      if (result.success) {
        setSession(null);
        toast.success("Varebeholdning tømt");
        onClear?.();
      } else {
        toast.error(result.error || "Kunne ikke tømme beholdning");
      }
    } catch (error) {
      console.error("Failed to clear inventory:", error);
      toast.error("En feil oppstod");
    } finally {
      setClearing(false);
    }
  };

  const handleRefresh = () => {
    fetchInventory();
    onRefresh?.();
  };

  if (loading) {
    return (
      <Card className={cn("border-white/5 bg-white/[0.02]", className)}>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-blue-400" />
        </CardContent>
      </Card>
    );
  }

  if (!session || session.items.length === 0) {
    return (
      <Card className={cn("border-white/5 bg-white/[0.02]", className)}>
        <CardContent className="py-8 text-center">
          <Package className="size-10 mx-auto mb-3 text-slate-500" />
          <p className="text-slate-400 mb-1">Ingen varebeholdning lastet</p>
          <p className="text-sm text-slate-500">Last opp PDF for å starte</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-white/5 bg-white/[0.02]", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white">
              Nåværende beholdning
            </CardTitle>
            <CardDescription>
              Lastet{" "}
              {format(new Date(session.createdAt), "d. MMM yyyy 'kl.' HH:mm", {
                locale: nb,
              })}
            </CardDescription>
          </div>
          {showActions && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw
                  className={cn("size-4", loading && "animate-spin")}
                />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    disabled={clearing}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tøm varebeholdning?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Dette vil slette alle {session.items.length} deler fra din
                      nåværende varebeholdning. Denne handlingen kan ikke
                      angres.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClear}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Tøm beholdning
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 p-3 rounded-lg bg-white/5">
            <p className="text-2xl font-bold text-white">
              {session.totalItems}
            </p>
            <p className="text-xs text-slate-400">Totalt</p>
          </div>
          <div className="flex-1 p-3 rounded-lg bg-emerald-500/10">
            <p className="text-2xl font-bold text-emerald-400">
              {session.itemsWithStock}
            </p>
            <p className="text-xs text-slate-400">På lager</p>
          </div>
          <div className="flex-1 p-3 rounded-lg bg-red-500/10">
            <p className="text-2xl font-bold text-red-400">
              {session.totalItems - session.itemsWithStock}
            </p>
            <p className="text-xs text-slate-400">Oppbrukt</p>
          </div>
        </div>

        {/* Items list */}
        <div className="max-h-80 overflow-y-auto space-y-1">
          {session.items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-between py-2 px-3 rounded-lg text-sm",
                item.remaining > 0
                  ? "bg-white/5"
                  : "bg-white/[0.02] opacity-50",
              )}
            >
              <div className="flex-1 min-w-0">
                <span className="font-mono text-xs text-slate-400 mr-2">
                  {item.partNumber}
                </span>
                <span className="text-white truncate">{item.description}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span
                  className={cn(
                    "font-medium",
                    item.remaining > 0 ? "text-emerald-400" : "text-slate-500",
                  )}
                >
                  {item.remaining}
                </span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-400">{item.quantity}</span>
                <span className="text-xs text-slate-500">{item.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
