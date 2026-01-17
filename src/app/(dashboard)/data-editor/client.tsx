"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  GripVertical,
  Layers,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import {
  bulkCreateServicePoints,
  createServicePoint,
  deleteServicePoint,
  updateServicePoint,
  updateServicePointOrder,
} from "@/lib/actions/service-points-actions";

// Types
interface ServicePoint {
  id: string;
  productType: string;
  category: string;
  text: string;
  sortOrder: number;
  isForService: boolean;
  isForCommissioning: boolean;
}

interface DataEditorClientProps {
  initialData: {
    servicePoints: ServicePoint[];
    grouped: Record<string, Record<string, ServicePoint[]>>;
  };
  productTypes: string[];
}

export function DataEditorClient({
  initialData,
  productTypes,
}: DataEditorClientProps) {
  const router = useRouter();
  const [_isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [data, setData] = useState(initialData);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(
    new Set(productTypes.slice(0, 1)),
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Sync data state with initialData prop when it changes (after router.refresh)
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<ServicePoint | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pointToDelete, setPointToDelete] = useState<string | null>(null);

  // Form state for new/edit
  const [formProductType, setFormProductType] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formText, setFormText] = useState("");
  const [formIsService, setFormIsService] = useState(true);
  const [formIsCommissioning, setFormIsCommissioning] = useState(true);
  const [newProductType, setNewProductType] = useState("");

  // Import state
  const [isImporting, setIsImporting] = useState(false);

  // DnD sensors - require 8px movement before drag starts (avoids accidental drags)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle drag end - reorder and persist
  const handleDragEnd = async (
    event: DragEndEvent,
    categoryPoints: ServicePoint[],
    productType: string,
    category: string,
  ) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categoryPoints.findIndex((p) => p.id === active.id);
    const newIndex = categoryPoints.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistically update UI
    const reordered = arrayMove(categoryPoints, oldIndex, newIndex);
    setData((prev) => {
      const newGrouped = { ...prev.grouped };
      if (!newGrouped[productType]) newGrouped[productType] = {};
      newGrouped[productType] = { ...newGrouped[productType] };
      newGrouped[productType][category] = reordered;
      return { ...prev, grouped: newGrouped };
    });

    // Persist to database
    const updates = reordered.map((p, idx) => ({ id: p.id, sortOrder: idx }));
    await updateServicePointOrder(updates);
  };

  // Toggle expansion
  const toggleType = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Open add dialog
  const openAddDialog = (productType?: string, category?: string) => {
    setFormProductType(productType ?? productTypes[0] ?? "");
    setFormCategory(category ?? "");
    setFormText("");
    setFormIsService(true);
    setFormIsCommissioning(true);
    setNewProductType("");
    setEditingPoint(null);
    setAddDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (point: ServicePoint) => {
    setEditingPoint(point);
    setFormProductType(point.productType);
    setFormCategory(point.category);
    setFormText(point.text);
    setFormIsService(point.isForService);
    setFormIsCommissioning(point.isForCommissioning);
    setAddDialogOpen(true);
  };

  // Save handler
  const handleSave = async () => {
    const productType = newProductType.trim() || formProductType;

    if (editingPoint) {
      await updateServicePoint(editingPoint.id, {
        text: formText,
        category: formCategory,
        isForService: formIsService,
        isForCommissioning: formIsCommissioning,
      });
    } else {
      await createServicePoint({
        productType,
        category: formCategory,
        text: formText,
        isForService: formIsService,
        isForCommissioning: formIsCommissioning,
      });
    }

    setAddDialogOpen(false);
    startTransition(() => router.refresh());
  };

  // Delete handler
  const handleDelete = async () => {
    if (!pointToDelete) return;
    await deleteServicePoint(pointToDelete);
    setDeleteDialogOpen(false);
    setPointToDelete(null);
    startTransition(() => router.refresh());
  };

  // Excel Template Download
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        Produkttype: "Generator",
        Kategori: "Motor",
        Tekst: "Sjekk oljenivå",
        Service: "Ja",
        Igangkjøring: "Ja",
      },
      {
        Produkttype: "Generator",
        Kategori: "Elektrisk",
        Tekst: "Mål batterispenning",
        Service: "Ja",
        Igangkjøring: "Nei",
      },
    ]);

    // Set column widths
    ws["!cols"] = [
      { wch: 15 }, // Produkttype
      { wch: 15 }, // Kategori
      { wch: 40 }, // Tekst
      { wch: 10 }, // Service
      { wch: 10 }, // Igangkjøring
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Servicepunkter");
    XLSX.writeFile(wb, "rapport-mal.xlsx");
  };

  // Excel Import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet);

      const points = json
        .map((row: any) => ({
          productType: row.Produkttype || "Annet",
          category: row.Kategori || "Generelt",
          text: row.Tekst || "",
          isForService: String(row.Service).toLowerCase() === "ja",
          isForCommissioning: String(row.Igangkjøring).toLowerCase() === "ja",
        }))
        .filter((p) => p.text.length > 0);

      if (points.length > 0) {
        await bulkCreateServicePoints(points);
        startTransition(() => router.refresh());
      }
    } catch (error) {
      console.error("Import failed", error);
      alert("Feil ved import av Excel-fil. Sjekk at formatet er riktig.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Get all categories across all types
  const allCategories = [
    ...new Set(data.servicePoints.map((p) => p.category)),
  ].sort();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur border-b border-white/5">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">Dataredigering</h1>
              <p className="text-sm text-slate-400">
                {data.servicePoints.length} servicepunkter •{" "}
                {productTypes.length} produkttyper
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImport}
              />
              <Button
                variant="outline"
                className="flex-1 sm:flex-none border-white/10 hover:bg-white/5"
                onClick={() => handleDownloadTemplate()}
              >
                <Download className="size-4 mr-2" />
                Last ned mal
              </Button>
              <Button
                variant="outline"
                className="flex-1 sm:flex-none border-white/10 hover:bg-white/5"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                {isImporting ? (
                  <span className="size-4 mr-2 animate-spin rounded-full border-2 border-slate-400 border-t-white" />
                ) : (
                  <Upload className="size-4 mr-2" />
                )}
                Importer Excel
              </Button>
              <Button
                onClick={() => openAddDialog()}
                className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20"
              >
                <Plus className="size-4 mr-2" />
                Nytt punkt
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 lg:px-6 py-6 pb-20">
        {productTypes.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
            <Database className="size-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              Ingen servicepunkter ennå
            </h3>
            <p className="text-slate-400 mb-6">
              Legg til servicepunkter manuelt eller importer fra Excel.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => openAddDialog()}>
                <Plus className="size-4 mr-2" />
                Legg til første punkt
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="size-4 mr-2" />
                Importer Excel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {productTypes.map((type) => {
              const isExpanded = expandedTypes.has(type);
              const categories = data.grouped[type] ?? {};
              const categoryNames = Object.keys(categories).sort();
              const totalPoints = Object.values(categories).flat().length;

              return (
                <div
                  key={type}
                  className="rounded-2xl border border-white/5 overflow-hidden bg-white/[0.02]"
                >
                  {/* Product type header */}
                  <Button
                    onClick={() => toggleType(type)}
                    variant="ghost"
                    className="w-full justify-between h-auto py-4 px-4 hover:bg-white/5 rounded-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center">
                        <Layers className="size-5 text-emerald-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-white">{type}</p>
                        <p className="text-sm text-slate-400">
                          {categoryNames.length} kategorier • {totalPoints}{" "}
                          punkter
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="size-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="size-5 text-slate-400" />
                    )}
                  </Button>

                  {/* Categories */}
                  {isExpanded && (
                    <div className="border-t border-white/5">
                      {categoryNames.map((category) => {
                        const catKey = `${type}:${category}`;
                        const isCatExpanded = expandedCategories.has(catKey);
                        const points = categories[category];

                        return (
                          <div
                            key={catKey}
                            className="border-b border-white/5 last:border-b-0"
                          >
                            {/* Category header */}
                            <Button
                              onClick={() => toggleCategory(catKey)}
                              variant="ghost"
                              className="w-full justify-between h-auto py-3 px-4 pl-8 hover:bg-white/5 rounded-none"
                            >
                              <div className="flex items-center gap-4">
                                <FileText className="size-4 text-slate-400" />
                                <span className="font-medium text-slate-200">
                                  {category}
                                </span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-slate-500">
                                  {points.length} punkter
                                </span>
                                {isCatExpanded ? (
                                  <ChevronDown className="size-4 text-slate-500" />
                                ) : (
                                  <ChevronRight className="size-4 text-slate-500" />
                                )}
                              </div>
                            </Button>

                            {/* Points */}
                            {isCatExpanded && (
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={(e) =>
                                  handleDragEnd(e, points, type, category)
                                }
                              >
                                <SortableContext
                                  items={points.map((p) => p.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  <div className="bg-white/[0.02]">
                                    {points.map((point) => (
                                      <SortableServicePoint
                                        key={point.id}
                                        point={point}
                                        onEdit={() => openEditDialog(point)}
                                        onDelete={() => {
                                          setPointToDelete(point.id);
                                          setDeleteDialogOpen(true);
                                        }}
                                      />
                                    ))}
                                    {/* Add to category button */}
                                    <Button
                                      variant="ghost"
                                      onClick={() => openAddDialog(type, category)}
                                      className="w-full justify-start gap-2 px-4 py-2 pl-14 text-sm text-slate-500 hover:text-blue-400 hover:bg-white/5 rounded-none h-10"
                                    >
                                      <Plus className="size-4" />
                                      Legg til punkt i {category}
                                    </Button>
                                  </div>
                                </SortableContext>
                              </DndContext>
                            )}
                          </div>
                        );
                      })}
                      {/* Add category button */}
                      <Button
                        variant="ghost"
                        onClick={() => openAddDialog(type)}
                        className="w-full justify-start gap-2 px-4 py-3 pl-8 text-sm text-slate-500 hover:text-blue-400 hover:bg-white/5 rounded-none h-12"
                      >
                        <Plus className="size-4" />
                        Legg til ny kategori
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle>
              {editingPoint ? "Rediger punkt" : "Nytt servicepunkt"}
            </DialogTitle>
            <DialogDescription>
              {editingPoint
                ? "Endre punktet nedenfor."
                : "Legg til et nytt punkt i sjekklisten."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Product Type */}
            {!editingPoint && (
              <div className="space-y-2">
                <Label>Produkttype</Label>
                {productTypes.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={formProductType}
                      onChange={(e) => setFormProductType(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white"
                    >
                      {productTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                      <option value="__new__">+ Ny produkttype...</option>
                    </select>
                    {formProductType === "__new__" && (
                      <Input
                        placeholder="Navn på ny produkttype"
                        value={newProductType}
                        onChange={(e) => setNewProductType(e.target.value)}
                        className="bg-white/5 border-white/10"
                      />
                    )}
                  </div>
                ) : (
                  <Input
                    placeholder="F.eks. Generator"
                    value={newProductType}
                    onChange={(e) => setNewProductType(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                )}
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Input
                placeholder="F.eks. Motor, Olje, Elektrisk"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="bg-white/5 border-white/10"
                list="categories"
              />
              <datalist id="categories">
                {allCategories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            {/* Text */}
            <div className="space-y-2">
              <Label>Sjekktekst</Label>
              <Input
                placeholder="F.eks. Sjekk oljenivå"
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-between pt-2">
              <Label>Bruk ved service</Label>
              <Switch
                checked={formIsService}
                onCheckedChange={setFormIsService}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Bruk ved igangkjøring</Label>
              <Switch
                checked={formIsCommissioning}
                onCheckedChange={setFormIsCommissioning}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Avbryt
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                (!formProductType && !newProductType) ||
                !formCategory.trim() ||
                !formText.trim()
              }
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {editingPoint ? "Lagre endringer" : "Legg til"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Slett servicepunkt?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette dette punktet? Denne handlingen
              kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10">
              Avbryt
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Sortable service point component with drag handle
function SortableServicePoint({
  point,
  onEdit,
  onDelete,
}: {
  point: ServicePoint;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: point.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 px-4 py-3 pl-10 border-t border-white/5 hover:bg-white/5 transition-colors"
    >
      {/* Drag handle - 64px touch target */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex items-center justify-center size-8 -ml-4 touch-none cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300"
      >
        <GripVertical className="size-4" />
      </button>
      <p className="flex-1 text-slate-300">{point.text}</p>
      <div className="flex items-center gap-2">
        {point.isForService && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
            Service
          </span>
        )}
        {point.isForCommissioning && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
            Igangkjøring
          </span>
        )}
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
