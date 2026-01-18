"use client";

import { Check, ChevronsUpDown, Plus, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CreateCustomerInput } from "@/lib/actions/customer-actions";
import {
  createCustomer,
  searchCustomers,
} from "@/lib/actions/customer-actions";
import { cn } from "@/lib/utils";

export interface CustomerOption {
  id: string;
  name: string;
  address?: string | null;
  contact?: string | null;
}

interface CustomerSelectProps {
  value?: string; // Customer ID
  customerName?: string; // For display when no ID
  onSelect: (customer: CustomerOption | null) => void;
  onCreateNew?: (name: string) => void; // When creating inline
  disabled?: boolean;
  className?: string;
}

export function CustomerSelect({
  value,
  customerName,
  onSelect,
  disabled,
  className,
}: CustomerSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState<CreateCustomerInput>({
    name: "",
    address: "",
    phone: "",
    email: "",
    contact: "",
  });
  const [creating, setCreating] = useState(false);

  // Find selected customer for display
  const selectedCustomer = customers.find((c) => c.id === value);
  const displayName = selectedCustomer?.name || customerName || "";

  // Search customers on input change
  const doSearch = useCallback(async (query: string) => {
    if (query.length < 1) {
      setCustomers([]);
      return;
    }
    setLoading(true);
    try {
      const results = await searchCustomers(query, 10);
      setCustomers(results);
    } catch (error) {
      console.error("Failed to search customers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      doSearch(search);
    }, 200);
    return () => clearTimeout(timeout);
  }, [search, doSearch]);

  // Initial load - fetch some customers if we have a value
  useEffect(() => {
    if (value || customerName) {
      doSearch(customerName || "");
    }
  }, [value, customerName, doSearch]);

  const handleSelect = (customer: CustomerOption) => {
    onSelect(customer);
    setOpen(false);
    setSearch("");
  };

  const handleCreateNew = async () => {
    if (!newCustomer.name.trim()) return;

    setCreating(true);
    try {
      const result = await createCustomer(newCustomer);
      if (result.success && result.customer) {
        const created: CustomerOption = {
          id: result.customer.id,
          name: result.customer.name,
          address: result.customer.address,
          contact: result.customer.contact,
        };
        setCustomers((prev) => [created, ...prev]);
        onSelect(created);
        setShowNewDialog(false);
        setNewCustomer({
          name: "",
          address: "",
          phone: "",
          email: "",
          contact: "",
        });
        toast.success(`Kunde "${result.customer.name}" opprettet`);
      } else {
        toast.error(result.error || "Kunne ikke opprette kunde");
      }
    } catch (error) {
      console.error("Failed to create customer:", error);
      toast.error("En feil oppstod ved opprettelse av kunde");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between h-14 text-lg bg-white/5 border-white/10",
              className,
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <User className="size-4 text-slate-400 shrink-0" />
              {displayName || (
                <span className="text-slate-400">Velg eller søk kunde...</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Søk etter kunde..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading && (
                <div className="py-6 text-center text-sm text-slate-400">
                  Søker...
                </div>
              )}
              {!loading && customers.length === 0 && search.length > 0 && (
                <CommandEmpty>
                  <div className="py-4 text-center">
                    <p className="text-sm text-slate-400 mb-3">
                      Ingen kunde funnet for "{search}"
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewCustomer((prev) => ({ ...prev, name: search }));
                        setShowNewDialog(true);
                        setOpen(false);
                      }}
                    >
                      <Plus className="size-4 mr-1" />
                      Opprett ny kunde
                    </Button>
                  </div>
                </CommandEmpty>
              )}
              {!loading && customers.length > 0 && (
                <CommandGroup>
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={() => handleSelect(customer)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4",
                          value === customer.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{customer.name}</div>
                        {customer.address && (
                          <div className="text-xs text-slate-400">
                            {customer.address}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {!loading && search.length > 0 && customers.length > 0 && (
                <div className="border-t p-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setNewCustomer((prev) => ({ ...prev, name: search }));
                      setShowNewDialog(true);
                      setOpen(false);
                    }}
                  >
                    <Plus className="size-4 mr-2" />
                    Opprett ny kunde "{search}"
                  </Button>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* New Customer Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Opprett ny kunde</DialogTitle>
            <DialogDescription>
              Legg til en ny kunde i systemet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newCustomerName">Kundenavn *</Label>
              <Input
                id="newCustomerName"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="F.eks. Statoil ASA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCustomerAddress">Adresse</Label>
              <Input
                id="newCustomerAddress"
                value={newCustomer.address}
                onChange={(e) =>
                  setNewCustomer((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
                placeholder="Gateadresse, postnummer by"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newCustomerPhone">Telefon</Label>
                <Input
                  id="newCustomerPhone"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="+47 XXX XX XXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newCustomerEmail">E-post</Label>
                <Input
                  id="newCustomerEmail"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="kunde@firma.no"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCustomerContact">Kontaktperson</Label>
              <Input
                id="newCustomerContact"
                value={newCustomer.contact}
                onChange={(e) =>
                  setNewCustomer((prev) => ({
                    ...prev,
                    contact: e.target.value,
                  }))
                }
                placeholder="Navn på kontaktperson"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewDialog(false)}
              disabled={creating}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleCreateNew}
              disabled={!newCustomer.name.trim() || creating}
            >
              {creating ? "Oppretter..." : "Opprett kunde"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
