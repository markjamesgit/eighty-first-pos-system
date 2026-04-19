"use client";

import { useState, useEffect } from "react";
import { Check, Plus, Minus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import type { Product } from "@/lib/types/domain";

interface ProductConfigDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allVariants: any[];
  allAddons: any[];
  allModifiers: any[];
  onConfirm: (selections: {
    variant?: any;
    addons: any[];
    modifiers: any[];
    quantity?: number;
  }) => void;
}

export function ProductConfigDialog({
  product,
  open,
  onOpenChange,
  allVariants,
  allAddons,
  allModifiers,
  onConfirm,
}: ProductConfigDialogProps) {
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<any[]>([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (open) {
      setSelectedVariant(null);
      setSelectedAddons([]);
      setSelectedModifiers([]);
      setQuantity(1);
    }
  }, [open, product]);

  if (!product) return null;

  const overridePrice = (item: any) => ({
    ...item,
    price: product.customPrices?.[item.id] !== undefined ? product.customPrices[item.id] : item.price,
  });

  const availableVariants = allVariants.filter(
    (v) => v.isActive && product.maintenanceLinkIds?.includes(v.id),
  ).map(overridePrice);
  const availableAddons = allAddons.filter(
    (a) => a.isActive && product.maintenanceLinkIds?.includes(a.id),
  ).map(overridePrice);
  const availableModifiers = allModifiers.filter(
    (m) => m.isActive && product.maintenanceLinkIds?.includes(m.id),
  ).map(overridePrice);

  const totalAddons = selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
  const basePrice = selectedVariant ? selectedVariant.price : product.price;
  const finalPrice = (basePrice * quantity) + totalAddons;

  const updateAddon = (item: any, delta: number) => {
    setSelectedAddons(prev => {
      if (delta > 0) return [...prev, item];
      const index = prev.findIndex(p => p.id === item.id);
      if (index === -1) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const updateModifier = (item: any, delta: number) => {
    setSelectedModifiers(prev => {
      if (delta > 0) return [...prev, item];
      const index = prev.findIndex(p => p.id === item.id);
      if (index === -1) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm({
      variant: selectedVariant,
      addons: selectedAddons,
      modifiers: selectedModifiers,
      quantity,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl p-0 overflow-hidden border-stone-100 shadow-xl">
        <DialogHeader className="p-6 pb-4 bg-white border-b border-stone-100">
          <DialogTitle className="text-xl font-bold text-stone-950">{product.name}</DialogTitle>
          <DialogDescription className="text-stone-500 font-medium tracking-tight">
            Configure your product options.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {availableVariants.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Choose Size (Variant)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableVariants.map((v) => {
                  const isActive = selectedVariant?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all",
                        isActive ? "border-stone-900 bg-stone-50/50" : "border-stone-100 bg-white"
                      )}
                    >
                      <div>
                        <p className={cn("text-sm font-semibold", isActive ? "text-stone-900" : "text-stone-600")}>{v.name}</p>
                        <p className={cn("text-[10px] font-bold mt-0.5", isActive ? "text-stone-600" : "text-stone-400")}>
                          {formatCurrency(v.price)}
                        </p>
                      </div>
                      {isActive ? (
                        <div className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white p-1 shadow-sm shrink-0 self-start sm:self-auto">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-md hover:bg-stone-100" 
                            onClick={() => {
                              if (quantity > 1) setQuantity(quantity - 1);
                              else { setSelectedVariant(null); setQuantity(1); }
                            }}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-5 text-center text-xs font-bold">{quantity}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-md hover:bg-stone-100" 
                            onClick={() => setQuantity(quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 md:h-9 font-semibold rounded-lg shrink-0 self-start sm:self-auto w-full sm:w-auto" 
                          onClick={() => { setSelectedVariant(v); setQuantity(1); }}
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {availableAddons.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Extras & Addons</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableAddons.map((a) => {
                  const count = selectedAddons.filter((p) => p.id === a.id).length;
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all",
                        count > 0 ? "border-stone-900 bg-stone-50/50" : "border-stone-100 bg-white"
                      )}
                    >
                      <div className="min-w-0">
                        <p className={cn("truncate text-sm font-semibold", count > 0 ? "text-stone-900" : "text-stone-600")}>{a.name}</p>
                        <p className={cn("text-[10px] font-bold mt-0.5", count > 0 ? "text-emerald-600" : "text-stone-400 opacity-70")}>
                          +{formatCurrency(a.price)}
                        </p>
                      </div>
                      {count > 0 ? (
                        <div className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white p-1 shadow-sm shrink-0 self-start sm:self-auto">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-stone-100" onClick={() => updateAddon(a, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-5 text-center text-xs font-bold text-stone-900">{count}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-stone-100" onClick={() => updateAddon(a, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="h-8 md:h-9 font-semibold rounded-lg shrink-0 self-start sm:self-auto w-full sm:w-auto" onClick={() => updateAddon(a, 1)}>
                          Add
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {availableModifiers.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Special Instructions</p>
              <div className="flex flex-wrap gap-2">
                {availableModifiers.map((m) => {
                  const count = selectedModifiers.filter((p) => p.id === m.id).length;
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex items-center gap-2 p-1.5 pl-3 rounded-xl border transition-all",
                        count > 0 ? "border-stone-900 bg-stone-50/50" : "border-stone-100 bg-white"
                      )}
                    >
                      <span className={cn("text-xs font-semibold mr-1", count > 0 ? "text-stone-900" : "text-stone-500")}>{m.name}</span>
                      {count > 0 ? (
                        <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-0.5 shadow-sm">
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-stone-100" onClick={() => updateModifier(m, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-4 text-center text-[10px] font-bold text-stone-900">{count}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-stone-100" onClick={() => updateModifier(m, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="h-7 text-[10px] px-3 font-semibold rounded-lg" onClick={() => updateModifier(m, 1)}>
                          Add
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-white border-t border-stone-100 flex-row items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 leading-none mb-1">Total Price</span>
            <span className="text-2xl font-black text-stone-900 leading-none">{formatCurrency(finalPrice)}</span>
          </div>
          <Button onClick={handleConfirm} className="h-10 px-6 font-bold">
            Add to order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
