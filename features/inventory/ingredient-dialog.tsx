"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createIngredient, updateIngredient } from "@/services/firebase/ingredients";
import type { IngredientItem } from "@/lib/types/domain";

interface IngredientDialogProps {
  onSaved: () => void;
  ingredient?: IngredientItem;
  triggerLabel?: string;
}

export function IngredientDialog({ onSaved, ingredient, triggerLabel }: IngredientDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    unit: "pcs",
    stockQty: "",
    lowStockThreshold: "",
    isActive: true,
  });

  useEffect(() => {
    if (ingredient && open) {
      setForm({
        name: ingredient.name,
        unit: ingredient.unit,
        stockQty: String(ingredient.stockQty),
        lowStockThreshold: String(ingredient.lowStockThreshold),
        isActive: ingredient.isActive,
      });
    } else if (!ingredient && open) {
      setForm({
        name: "",
        unit: "pcs",
        stockQty: "",
        lowStockThreshold: "",
        isActive: true,
      });
    }
  }, [ingredient, open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required.");
    if (!form.unit.trim()) return toast.error("Unit is required.");
    if (form.stockQty === "") return toast.error("Initial stock is required.");
    if (form.lowStockThreshold === "") return toast.error("Low stock threshold is required.");

    const parsedStockQty = Number(form.stockQty);
    const parsedLowStockThreshold = Number(form.lowStockThreshold);
    if (!Number.isFinite(parsedStockQty) || parsedStockQty < 0) {
      return toast.error("Initial stock must be zero or above.");
    }
    if (!Number.isFinite(parsedLowStockThreshold) || parsedLowStockThreshold < 0) {
      return toast.error("Low stock threshold must be zero or above.");
    }
    
    setLoading(true);
    try {
      const payload = {
        ...form,
        stockQty: parsedStockQty,
        lowStockThreshold: parsedLowStockThreshold,
      };
      if (ingredient) {
        await updateIngredient(ingredient.id, payload);
        toast.success("Ingredient updated.");
      } else {
        await createIngredient(payload);
        toast.success("Ingredient added to warehouse.");
      }
      setOpen(false);
      onSaved();
    } catch (e) {
      toast.error(ingredient ? "Failed to update ingredient." : "Failed to add ingredient.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {ingredient ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-stone-300 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-colors bg-white"
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        ) : (
          <Button className="rounded-xl px-5 font-semibold shadow-sm">
            {triggerLabel || "Add Ingredient"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl border-stone-100 p-0 shadow-xl overflow-hidden bg-white">
        <form onSubmit={handleSave} className="flex flex-col">
          <DialogHeader className="bg-white border-b border-stone-100 px-6 py-5">
            <DialogTitle className="text-lg font-bold text-stone-900">{ingredient ? "Edit Ingredient" : "New Ingredient"}</DialogTitle>
            <DialogDescription className="text-xs text-stone-500 mt-1">
              {ingredient 
                ? "Update details for this raw material in your inventory."
                : "Add a raw material or consumable to your global inventory stock."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 px-6 py-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Name</label>
              <Input
                placeholder="e.g. Milk, Brown Sugar, Coffee Beans"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="h-10 rounded-xl border-stone-200 shadow-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Unit</label>
                <Input
                  placeholder="pcs, ml, kg, etc."
                  value={form.unit}
                  onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                  className="h-10 rounded-xl border-stone-200 shadow-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Initial Stock</label>
                <Input
                  type="text"
                  min="0"
                  step="0.01"
                  value={form.stockQty}
                  onChange={(e) => setForm((p) => ({ ...p, stockQty: e.target.value }))}
                  placeholder="0"
                  className="h-10 rounded-xl border-stone-200 shadow-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Low Stock Threshold</label>
              <Input
                type="text"
                min="0"
                step="0.01"
                value={form.lowStockThreshold}
                onChange={(e) => setForm((p) => ({ ...p, lowStockThreshold: e.target.value }))}
                placeholder="0"
                className="h-10 rounded-xl border-stone-200 shadow-none"
              />
              <p className="text-[10px] font-medium text-stone-400">System will alert you when stock falls below this level.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Status</label>
              <Select
                value={form.isActive ? "active" : "inactive"}
                onValueChange={(value) => setForm((p) => ({ ...p, isActive: value === "active" }))}
              >
                <SelectTrigger className="h-10 rounded-xl border-stone-200 shadow-none text-sm font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="bg-white border-t border-stone-100 px-6 py-4 flex-row justify-end items-center gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} type="button" className="rounded-xl font-semibold px-5 shadow-sm">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl font-bold px-6 shadow-md shrink-0">
              {loading ? (ingredient ? "Updating..." : "Adding...") : (ingredient ? "Save Changes" : "Add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
