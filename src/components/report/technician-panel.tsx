"use client";

import { AlertTriangle, Eye, EyeOff, Loader2, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getRemainingInventoryForReport } from "@/lib/actions/parts-actions";
import { cn } from "@/lib/utils";

interface RemainingItem {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  remaining: number;
  unit: string | null;
}

interface TechnicianPanelProps {
  reportId: string;
  className?: string;
}

/**
 * TechnicianPanel - Internal-only view showing remaining inventory
 * This data is NEVER exported to customer-facing PDF
 */
export function TechnicianPanel({ reportId, className }: TechnicianPanelProps) {
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<{
    sessionIds: string[];
    items: RemainingItem[];
    totalRemaining: number;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await getRemainingInventoryForReport(reportId);
        setData(result);
      } catch (error) {
        console.error("Failed to fetch remaining inventory:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reportId]);

  // No inventory used from sessions
  if (!loading && !data) {
    return null;
  }

  return (
    <Card className={cn("border-amber-500/20 bg-amber-500/5", className)}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 flex items-center justify-center">
                <EyeOff className="size-5 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg text-amber-100 flex items-center gap-2">
                  Tekniker-oversikt
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-normal">
                    Intern
                  </span>
                </CardTitle>
                <CardDescription className="text-amber-200/60">
                  Denne informasjonen vises ikke til kunden
                </CardDescription>
              </div>
            </div>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {expanded ? (
                  <>
                    <EyeOff className="size-4 mr-1" />
                    Skjul
                  </>
                ) : (
                  <>
                    <Eye className="size-4 mr-1" />
                    Vis
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-5 animate-spin text-amber-400" />
              </div>
            ) : data && data.items.length > 0 ? (
              <div className="space-y-4">
                {/* Warning banner */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-100">
                      Kun for tekniker
                    </p>
                    <p className="text-amber-200/70">
                      Restbeholdningen under vises IKKE i kundens rapport eller
                      PDF-eksport.
                    </p>
                  </div>
                </div>

                {/* Remaining inventory */}
                <div>
                  <h4 className="text-sm font-medium text-amber-200 mb-2 flex items-center gap-2">
                    <Package className="size-4" />
                    Restbeholdning ({data.totalRemaining} enheter)
                  </h4>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {data.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-xs text-slate-400 mr-2">
                            {item.partNumber}
                          </span>
                          <span className="text-white truncate">
                            {item.description}
                          </span>
                        </div>
                        <span className="text-amber-300 font-medium shrink-0 ml-2">
                          {item.remaining} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-amber-200/60 py-4">
                Alle deler fra varebeholdningen er brukt
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
