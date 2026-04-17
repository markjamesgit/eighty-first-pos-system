"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Edit2 } from "lucide-react";
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
          <Button variant="ghost" size="icon" className="h-9 w-9 text-stone-300 hover:text-stone-900 transition-colors rounded-xl bg-white border border-stone-200 shadow-sm">
            <Edit2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="font-bold gap-2">
            <Plus className="h-4 w-4" />
            {triggerLabel || "Add Ingredient"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>{ingredient ? "Edit Ingredient" : "New Ingredient"}</DialogTitle>
            <DialogDescription>
              {ingredient 
                ? "Update details for this raw material in your inventory."
                : "Add a raw material or consumable to your global inventory stock."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Name</label>
              <Input
                placeholder="e.g. Milk, Brown Sugar, Coffee Beans"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Unit</label>
                <Input
                  placeholder="pcs, ml, kg, etc."
                  value={form.unit}
                  onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Initial Stock</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.stockQty}
                  onChange={(e) => setForm((p) => ({ ...p, stockQty: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Low Stock Threshold</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.lowStockThreshold}
                onChange={(e) => setForm((p) => ({ ...p, lowStockThreshold: e.target.value }))}
                placeholder="0"
              />
              <p className="text-[10px] text-stone-400">System will alert you when stock falls below this level.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Status</label>
              <Select
                value={form.isActive ? "active" : "inactive"}
                onValueChange={(value) => setForm((p) => ({ ...p, isActive: value === "active" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full font-bold">
              {loading ? (ingredient ? "Updating..." : "Adding...") : (ingredient ? "Save Changes" : "Confirm Addition")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
