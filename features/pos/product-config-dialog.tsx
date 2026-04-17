"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
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

  useEffect(() => {
    if (open) {
      setSelectedVariant(null);
      setSelectedAddons([]);
      setSelectedModifiers([]);
    }
  }, [open, product]);

  if (!product) return null;

  const availableVariants = allVariants.filter(
    (v) => v.isActive && product.maintenanceLinkIds?.includes(v.id),
  );
  const availableAddons = allAddons.filter(
    (a) => a.isActive && product.maintenanceLinkIds?.includes(a.id),
  );
  const availableModifiers = allModifiers.filter(
    (m) => m.isActive && product.maintenanceLinkIds?.includes(m.id),
  );

  const totalExtras = (selectedVariant?.price || 0) + selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
  const finalPrice = product.price + totalExtras;

  const toggleAddon = (item: any) => {
    setSelectedAddons(prev => 
      prev.find(p => p.id === item.id) 
        ? prev.filter(p => p.id !== item.id) 
        : [...prev, item]
    );
  };

  const toggleModifier = (item: any) => {
    setSelectedModifiers(prev => 
      prev.find(p => p.id === item.id) 
        ? prev.filter(p => p.id !== item.id) 
        : [...prev, item]
    );
  };

  const handleConfirm = () => {
    onConfirm({
      variant: selectedVariant,
      addons: selectedAddons,
      modifiers: selectedModifiers,
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
              <div className="grid grid-cols-2 gap-2">
                {availableVariants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all",
                      selectedVariant?.id === v.id 
                        ? "border-stone-900 bg-stone-900 text-white" 
                        : "border-stone-100 bg-white text-stone-600 hover:border-stone-300"
                    )}
                  >
                    <span>{v.name}</span>
                    <span className={cn("text-[10px] font-bold opacity-70", selectedVariant?.id === v.id ? "text-stone-300" : "text-stone-400")}>
                      +{formatCurrency(v.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableAddons.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Extras & Addons</p>
              <div className="grid grid-cols-2 gap-2">
                {availableAddons.map((a) => {
                  const active = selectedAddons.find(p => p.id === a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleAddon(a)}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-left",
                        active 
                          ? "border-stone-900 bg-stone-50/50 text-stone-900" 
                          : "border-stone-100 bg-white text-stone-600 hover:border-stone-300"
                      )}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate leading-none">{a.name}</p>
                        <p className="text-[10px] opacity-60 mt-1 leading-none">+{formatCurrency(a.price)}</p>
                      </div>
                      {active && <Check className="h-4 w-4 text-stone-950 shrink-0" />}
                    </button>
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
                  const active = selectedModifiers.find(p => p.id === m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleModifier(m)}
                      className={cn(
                        "px-4 py-2 rounded-xl border text-xs font-semibold transition-all",
                        active 
                          ? "border-stone-900 bg-stone-900 text-white" 
                          : "border-stone-100 bg-white text-stone-500 hover:border-stone-300"
                      )}
                    >
                      {m.name}
                    </button>
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
