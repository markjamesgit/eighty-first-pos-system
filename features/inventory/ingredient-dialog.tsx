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
    stockQty: 0,
    lowStockThreshold: 10,
    isActive: true,
  });

  useEffect(() => {
    if (ingredient && open) {
      setForm({
        name: ingredient.name,
        unit: ingredient.unit,
        stockQty: ingredient.stockQty,
        lowStockThreshold: ingredient.lowStockThreshold,
        isActive: ingredient.isActive,
      });
    } else if (!ingredient && open) {
      setForm({
        name: "",
        unit: "pcs",
        stockQty: 0,
        lowStockThreshold: 10,
        isActive: true,
      });
    }
  }, [ingredient, open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required.");
    
    setLoading(true);
    try {
      if (ingredient) {
        await updateIngredient(ingredient.id, form);
        toast.success("Ingredient updated.");
      } else {
        await createIngredient(form);
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
                  value={form.stockQty}
                  onChange={(e) => setForm((p) => ({ ...p, stockQty: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Low Stock Threshold</label>
              <Input
                type="number"
                value={form.lowStockThreshold}
                onChange={(e) => setForm((p) => ({ ...p, lowStockThreshold: Number(e.target.value) }))}
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
