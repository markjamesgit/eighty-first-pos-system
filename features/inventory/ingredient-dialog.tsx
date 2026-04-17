"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { createIngredient } from "@/services/firebase/ingredients";

interface IngredientDialogProps {
  onSaved: () => void;
}

export function IngredientDialog({ onSaved }: IngredientDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    unit: "pcs",
    stockQty: 0,
    lowStockThreshold: 10,
    isActive: true,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required.");
    
    setLoading(true);
    try {
      await createIngredient(form);
      toast.success("Ingredient added to warehouse.");
      setOpen(false);
      setForm({ name: "", unit: "pcs", stockQty: 0, lowStockThreshold: 10, isActive: true });
      onSaved();
    } catch (e) {
      toast.error("Failed to add ingredient.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-bold gap-2">
          <Plus className="h-4 w-4" />
          Add Ingredient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>New Ingredient</DialogTitle>
            <DialogDescription>
              Add a raw material or consumable to your global inventory stock.
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
              {loading ? "Adding..." : "Confirm Addition"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
