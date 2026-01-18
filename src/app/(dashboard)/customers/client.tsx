"use client";

import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  Building2,
  ChevronRight,
  Edit2,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  addCustomerEquipment,
  type CreateCustomerInput,
  createCustomer,
  deleteCustomer,
  deleteCustomerEquipment,
  getCustomers,
  getCustomerWithEquipment,
  updateCustomer,
} from "@/lib/actions/customer-actions";
import { getProductTypes } from "@/lib/actions/service-points-actions";

interface Customer {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  contact: string | null;
  _count: {
    equipment: number;
    reports: number;
  };
}

interface CustomerEquipmentWithHistory {
  id: string;
  productType: string;
  productName: string;
  model: string | null;
  serialNumber: string | null;
  lastRunningHours: number | null;
  lastServiceDate: Date | null;
  lastReportNumber: number | null;
}

interface CustomerDetails {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  contact: string | null;
  equipment: CustomerEquipmentWithHistory[];
}

export function CustomersPageClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(
    null,
  );
  const [viewingCustomer, setViewingCustomer] =
    useState<CustomerDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateCustomerInput>({
    name: "",
    address: "",
    phone: "",
    email: "",
    contact: "",
  });
  const [saving, setSaving] = useState(false);

  // Equipment dialog
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [newEquipment, setNewEquipment] = useState({
    productType: "",
    productName: "",
    model: "",
    serialNumber: "",
  });

  // Fetch customers on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchCustomers is stable
  useEffect(() => {
    fetchCustomers();
    fetchProductTypes();
  }, []);

  const fetchProductTypes = async () => {
    try {
      const types = await getProductTypes();
      setProductTypes(types);
      if (types.length > 0) {
        setNewEquipment((prev) => ({ ...prev, productType: types[0] }));
      } else {
        setNewEquipment((prev) => ({ ...prev, productType: "Annet" }));
      }
    } catch (error) {
      console.error("Failed to fetch product types:", error);
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      toast.error("Kunne ikke laste kunder");
    } finally {
      setLoading(false);
    }
  };

  const handleViewCustomer = async (customer: Customer) => {
    setLoadingDetails(true);
    try {
      const details = await getCustomerWithEquipment(customer.id);
      if (details) {
        setViewingCustomer(details);
      }
    } catch (error) {
      console.error("Failed to fetch customer details:", error);
      toast.error("Kunne ikke laste kundedetaljer");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      if (editingCustomer) {
        const result = await updateCustomer(editingCustomer.id, formData);
        if (result.success) {
          toast.success("Kunde oppdatert");
          setEditingCustomer(null);
          fetchCustomers();
        } else {
          toast.error(result.error || "Kunne ikke oppdatere kunde");
        }
      } else {
        const result = await createCustomer(formData);
        if (result.success) {
          toast.success("Kunde opprettet");
          setShowNewDialog(false);
          fetchCustomers();
        } else {
          toast.error(result.error || "Kunne ikke opprette kunde");
        }
      }
    } catch (error) {
      console.error("Failed to save customer:", error);
      toast.error("En feil oppstod");
    } finally {
      setSaving(false);
      setFormData({ name: "", address: "", phone: "", email: "", contact: "" });
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;

    try {
      const result = await deleteCustomer(deletingCustomer.id);
      if (result.success) {
        toast.success("Kunde slettet");
        setDeletingCustomer(null);
        fetchCustomers();
      } else {
        toast.error(result.error || "Kunne ikke slette kunde");
      }
    } catch (error) {
      console.error("Failed to delete customer:", error);
      toast.error("En feil oppstod");
    }
  };

  const handleAddEquipment = async () => {
    if (!viewingCustomer || !newEquipment.productName.trim()) return;

    try {
      const result = await addCustomerEquipment({
        customerId: viewingCustomer.id,
        productType: newEquipment.productType,
        productName: newEquipment.productName,
        model: newEquipment.model || undefined,
        serialNumber: newEquipment.serialNumber || undefined,
      });

      if (result.success) {
        toast.success("Utstyr lagt til");
        setShowEquipmentDialog(false);
        setNewEquipment({
          productType: "Generator",
          productName: "",
          model: "",
          serialNumber: "",
        });
        // Refresh customer details
        handleViewCustomer({ id: viewingCustomer.id } as Customer);
      } else {
        toast.error(result.error || "Kunne ikke legge til utstyr");
      }
    } catch (error) {
      console.error("Failed to add equipment:", error);
      toast.error("En feil oppstod");
    }
  };

  const handleDeleteEquipment = async (equipmentId: string) => {
    if (!viewingCustomer) return;

    try {
      const result = await deleteCustomerEquipment(equipmentId);
      if (result.success) {
        toast.success("Utstyr slettet");
        handleViewCustomer({ id: viewingCustomer.id } as Customer);
      } else {
        toast.error(result.error || "Kunne ikke slette utstyr");
      }
    } catch (error) {
      console.error("Failed to delete equipment:", error);
      toast.error("En feil oppstod");
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 flex items-center justify-center">
            <Users className="size-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Kunder</h1>
            <p className="text-slate-400">
              {customers.length} kunde{customers.length !== 1 && "r"} registrert
            </p>
          </div>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="size-4 mr-2" />
          Ny kunde
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <Input
          placeholder="Søk etter kunde..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10"
        />
      </div>

      {/* Customer list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-blue-400" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="py-12 text-center">
            <Building2 className="size-12 mx-auto mb-4 text-slate-500" />
            <p className="text-slate-400 mb-4">
              {searchQuery
                ? "Ingen kunder funnet"
                : "Ingen kunder registrert ennå"}
            </p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="size-4 mr-2" />
              Opprett første kunde
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredCustomers.map((customer) => (
            <Card
              key={customer.id}
              className="border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer"
              onClick={() => handleViewCustomer(customer)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="size-4 text-slate-400" />
                      <span className="font-medium text-white truncate">
                        {customer.name}
                      </span>
                    </div>
                    {customer.address && (
                      <p className="text-sm text-slate-400 truncate">
                        {customer.address}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="text-right">
                      <p>{customer._count.equipment} utstyr</p>
                      <p>{customer._count.reports} rapporter</p>
                    </div>
                    <ChevronRight className="size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New/Edit Customer Dialog */}
      <Dialog
        open={showNewDialog || !!editingCustomer}
        onOpenChange={(open) => {
          if (!open) {
            setShowNewDialog(false);
            setEditingCustomer(null);
            setFormData({
              name: "",
              address: "",
              phone: "",
              email: "",
              contact: "",
            });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Rediger kunde" : "Ny kunde"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? "Oppdater kundeinformasjon"
                : "Legg til en ny kunde i systemet"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Kundenavn *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="F.eks. Statoil ASA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Gateadresse, postnummer by"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+47 XXX XX XXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="kunde@firma.no"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Kontaktperson</Label>
              <Input
                id="contact"
                value={formData.contact}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, contact: e.target.value }))
                }
                placeholder="Navn på kontaktperson"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewDialog(false);
                setEditingCustomer(null);
              }}
              disabled={saving}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSaveCustomer}
              disabled={!formData.name.trim() || saving}
            >
              {saving ? "Lagrer..." : editingCustomer ? "Oppdater" : "Opprett"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingCustomer}
        onOpenChange={() => setDeletingCustomer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slette kunde?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette "{deletingCustomer?.name}"? Alt
              registrert utstyr vil også bli slettet. Denne handlingen kan ikke
              angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              className="bg-red-600 hover:bg-red-700"
            >
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Customer Details Sheet */}
      <Sheet
        open={!!viewingCustomer}
        onOpenChange={(open) => !open && setViewingCustomer(null)}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {loadingDetails ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="size-8 animate-spin text-blue-400" />
            </div>
          ) : viewingCustomer ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="size-5" />
                  {viewingCustomer.name}
                </SheetTitle>
                <SheetDescription>
                  {viewingCustomer.address || "Ingen adresse registrert"}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Contact info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {viewingCustomer.phone && (
                    <div>
                      <p className="text-slate-400">Telefon</p>
                      <p className="text-white">{viewingCustomer.phone}</p>
                    </div>
                  )}
                  {viewingCustomer.email && (
                    <div>
                      <p className="text-slate-400">E-post</p>
                      <p className="text-white">{viewingCustomer.email}</p>
                    </div>
                  )}
                  {viewingCustomer.contact && (
                    <div>
                      <p className="text-slate-400">Kontaktperson</p>
                      <p className="text-white">{viewingCustomer.contact}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        name: viewingCustomer.name,
                        address: viewingCustomer.address || "",
                        phone: viewingCustomer.phone || "",
                        email: viewingCustomer.email || "",
                        contact: viewingCustomer.contact || "",
                      });
                      setEditingCustomer(
                        viewingCustomer as unknown as Customer,
                      );
                      setViewingCustomer(null);
                    }}
                  >
                    <Edit2 className="size-4 mr-1" />
                    Rediger
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => {
                      setDeletingCustomer(
                        viewingCustomer as unknown as Customer,
                      );
                      setViewingCustomer(null);
                    }}
                  >
                    <Trash2 className="size-4 mr-1" />
                    Slett
                  </Button>
                </div>

                {/* Equipment */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-white flex items-center gap-2">
                      <Wrench className="size-4" />
                      Registrert utstyr
                    </h3>
                    <Button
                      size="sm"
                      onClick={() => setShowEquipmentDialog(true)}
                    >
                      <Plus className="size-4 mr-1" />
                      Legg til
                    </Button>
                  </div>

                  {viewingCustomer.equipment.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">
                      Ingen utstyr registrert
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {viewingCustomer.equipment.map((eq) => (
                        <div
                          key={eq.id}
                          className="p-3 rounded-lg bg-white/5 group"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-white">
                                {eq.productName}
                              </p>
                              <p className="text-xs text-slate-400">
                                {eq.productType}
                                {eq.serialNumber && ` · SN: ${eq.serialNumber}`}
                              </p>
                              {eq.lastRunningHours !== null && (
                                <p className="text-xs text-amber-400 mt-1">
                                  Siste service: {eq.lastRunningHours} timer
                                  {eq.lastServiceDate &&
                                    ` (${format(
                                      new Date(eq.lastServiceDate),
                                      "d. MMM yyyy",
                                      { locale: nb },
                                    )})`}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 opacity-0 group-hover:opacity-100 text-red-400"
                              onClick={() => handleDeleteEquipment(eq.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Add Equipment Dialog */}
              <Dialog
                open={showEquipmentDialog}
                onOpenChange={setShowEquipmentDialog}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Legg til utstyr</DialogTitle>
                    <DialogDescription>
                      Registrer nytt utstyr for {viewingCustomer.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Produkttype</Label>
                      <select
                        value={newEquipment.productType}
                        onChange={(e) =>
                          setNewEquipment((prev) => ({
                            ...prev,
                            productType: e.target.value,
                          }))
                        }
                        className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm"
                      >
                        {productTypes.length > 0 ? (
                          productTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))
                        ) : (
                          <option value="Annet">Annet</option>
                        )}
                        {/* Always ensure Annet is available if not in the list */}
                        {!productTypes.includes("Annet") && (
                          <option value="Annet">Annet</option>
                        )}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Merking / Navn *</Label>
                      <Input
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
                        <Label>Modell</Label>
                        <Input
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
                        <Label>Serienummer</Label>
                        <Input
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
                      onClick={() => setShowEquipmentDialog(false)}
                    >
                      Avbryt
                    </Button>
                    <Button
                      onClick={handleAddEquipment}
                      disabled={!newEquipment.productName.trim()}
                    >
                      Legg til
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
