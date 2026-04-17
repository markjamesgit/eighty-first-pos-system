"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash, BookOpen, ChefHat, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { listProducts } from "@/services/firebase/products";
import { listMaintenanceItems } from "@/services/firebase/maintenance";
import { listIngredients } from "@/services/firebase/ingredients";
import { listProductRecipes, saveProductRecipe } from "@/services/firebase/recipes";
import type { Product, IngredientItem, ProductRecipe, ProductRecipeItem } from "@/lib/types/domain";

type RecipeTarget = {
  id: string;
  name: string;
  type: "product" | "variant" | "addon" | "modifier";
  category?: string;
};

export function RecipesView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [targets, setTargets] = useState<RecipeTarget[]>([]);
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [recipes, setRecipes] = useState<ProductRecipe[]>([]);

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [currentRecipeItems, setCurrentRecipeItems] = useState<ProductRecipeItem[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, vars, adds, mods, ings, recs] = await Promise.all([
        listProducts(),
        listMaintenanceItems("variants"),
        listMaintenanceItems("addons"),
        listMaintenanceItems("modifiers"),
        listIngredients(),
        listProductRecipes(),
      ]);

      const tgs: RecipeTarget[] = [
        ...prods.filter((p) => p.isActive).map((p) => ({ id: p.id, name: p.name, type: "product" as const, category: p.category })),
        ...vars.filter((v) => v.isActive).map((v) => ({ id: v.id, name: v.name, type: "variant" as const })),
        ...adds.filter((a) => a.isActive).map((a) => ({ id: a.id, name: a.name, type: "addon" as const })),
        ...mods.filter((m) => m.isActive).map((m) => ({ id: m.id, name: m.name, type: "modifier" as const })),
      ];

      setTargets(tgs);
      setIngredients(ings);
      setRecipes(recs);
    } catch (error) {
      toast.error("Failed to load recipe data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedTarget = useMemo(
    () => targets.find((t) => t.id === selectedTargetId) || null,
    [selectedTargetId, targets]
  );

  useEffect(() => {
    if (selectedTargetId) {
      const existing = recipes.find((r) => r.productId === selectedTargetId);
      if (existing) {
        setCurrentRecipeItems(existing.items);
      } else {
        setCurrentRecipeItems([]);
      }
    } else {
      setCurrentRecipeItems([]);
    }
  }, [selectedTargetId, recipes]);

  const handleAddIngredient = () => {
    if (!ingredients.length) {
       toast.error("No global ingredients found. Please create them in the Inventory module first.");
       return;
    }
    const firstIng = ingredients[0];
    setCurrentRecipeItems((prev) => [
      ...prev,
      {
        ingredientId: firstIng.id,
        ingredientName: firstIng.name,
        qtyUsed: 1,
        unit: firstIng.unit,
      },
    ]);
  };

  const handleUpdateIngredient = (index: number, field: keyof ProductRecipeItem, value: any) => {
    setCurrentRecipeItems((prev) => {
      const clone = [...prev];
      if (field === "ingredientId") {
        const found = ingredients.find((i) => i.id === value);
        if (found) {
          clone[index] = {
            ...clone[index],
            ingredientId: found.id,
            ingredientName: found.name,
            unit: found.unit,
          };
        }
      } else {
        clone[index] = { ...clone[index], [field]: value };
      }
      return clone;
    });
  };

  const handleRemoveIngredient = (index: number) => {
    setCurrentRecipeItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRecipe = async () => {
    if (!selectedTarget) return;

    if (currentRecipeItems.some((item) => item.qtyUsed <= 0)) {
      toast.error("All ingredients must have a quantity greater than 0.");
      return;
    }

    setSaving(true);
    try {
      await saveProductRecipe({
        productId: selectedTarget.id,
        productName: selectedTarget.name,
        items: currentRecipeItems,
      });
      toast.success("Recipe saved successfully.");
      void loadData(); // Reload to update recipes mapping
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save recipe.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !targets.length) {
    return <div className="py-12 text-center text-sm text-stone-500">Loading recipe system...</div>;
  }

  const groupedTargets = targets.reduce((acc, current) => {
    const groupName = current.type === "product" ? `Products: ${current.category}` : current.type + "s";
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(current);
    return acc;
  }, {} as Record<string, RecipeTarget[]>);

  return (
    <div className="grid h-[calc(100vh-8rem)] gap-6 xl:grid-cols-[340px_1fr]">
      <Card className="flex flex-col h-full overflow-hidden">
        <CardHeader className="bg-stone-50 border-b border-stone-100 pb-4">
          <CardTitle>Menu Items</CardTitle>
          <CardDescription>Select an item to assign ingredients.</CardDescription>
        </CardHeader>
        <ScrollArea className="flex-1 bg-white">
          <div className="p-4 space-y-6">
            {Object.entries(groupedTargets).map(([groupName, items]) => (
              <div key={groupName}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500 capitalize">{groupName}</h3>
                <div className="space-y-1">
                  {items.map((item) => {
                    const hasRecipe = recipes.some((r) => r.productId === item.id && r.items.length > 0);
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedTargetId(item.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          selectedTargetId === item.id
                            ? "bg-stone-900 text-white"
                            : "hover:bg-stone-100 text-stone-700"
                        }`}
                      >
                        <span className="font-medium truncate">{item.name}</span>
                        {hasRecipe && (
                          <Badge variant={selectedTargetId === item.id ? "secondary" : "default"} className="scale-75 origin-right">
                            Linked
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      <Card className="flex flex-col h-full relative overflow-hidden">
        {!selectedTarget ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-8 bg-stone-50/50">
            <div className="rounded-full bg-stone-100 p-4 mb-4">
              <ChefHat className="h-8 w-8 text-stone-400" />
            </div>
            <h3 className="text-lg font-medium text-stone-900">No Item Selected</h3>
            <p className="mt-1 text-sm text-stone-500 max-w-[280px]">
              Choose a product, variant, or addon from the sidebar to configure its recipe.
            </p>
          </div>
        ) : (
          <>
            <CardHeader className="border-b border-stone-100 bg-white shadow-[0_1px_12px_rgba(0,0,0,0.02)] z-10 relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="uppercase tracking-wider text-[10px] bg-stone-50">{selectedTarget.type}</Badge>
                    {selectedTarget.category && (
                      <Badge variant="outline" className="uppercase tracking-wider text-[10px] bg-stone-50 pb-0.5">{selectedTarget.category}</Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">Recipe: {selectedTarget.name}</CardTitle>
                  <CardDescription>
                    Define the exact raw ingredients deducted when this is ordered.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 bg-stone-50/30 p-2">
              <div className="p-4 space-y-4">
                {currentRecipeItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-300">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Ingredient</label>
                      <Select
                        value={item.ingredientId}
                        onValueChange={(val) => handleUpdateIngredient(index, "ingredientId", val)}
                      >
                        <SelectTrigger className="h-9 font-medium shadow-none">
                          <SelectValue placeholder="Select ingredient" />
                        </SelectTrigger>
                        <SelectContent>
                          {ingredients.map((ing) => (
                            <SelectItem key={ing.id} value={ing.id}>
                              {ing.name} <span className="opacity-50">({ing.unit})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-[120px] space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Usage Amount</label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          className="h-9 shadow-none pr-12 text-right"
                          value={item.qtyUsed}
                          onChange={(e) => handleUpdateIngredient(index, "qtyUsed", Number(e.target.value))}
                        />
                        <span className="absolute inset-y-0 right-3 flex items-center text-xs text-stone-400 pointer-events-none">
                          {item.unit}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-6 h-9 w-9 shrink-0 text-stone-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleRemoveIngredient(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {currentRecipeItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 py-10 text-center">
                    <BookOpen className="mx-auto h-8 w-8 text-stone-300 mb-2" />
                    <p className="text-sm font-medium text-stone-900">No ingredients linked</p>
                    <p className="text-xs text-stone-500 mb-4">This item uses 0 inventory stock when ordered.</p>
                    <Button variant="outline" size="sm" onClick={handleAddIngredient} className="bg-white">
                      <Plus className="mr-2 h-4 w-4" /> Add First Ingredient
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={handleAddIngredient} className="w-full border-dashed">
                    <Plus className="mr-2 h-4 w-4" /> Add Another Ingredient
                  </Button>
                )}
              </div>
            </ScrollArea>
            <div className="border-t border-stone-200 bg-stone-50 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-10 relative">
              <Button onClick={() => void handleSaveRecipe()} disabled={saving} className="w-full font-semibold">
                {saving ? "Saving..." : (
                  <>
                    <Save className="mr-2 h-4 w-4"/> Save Recipe Configuration
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
