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
import { cn } from "@/lib/utils";

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
  const [mobileTab, setMobileTab] = useState<"items" | "recipe">("items");
  const [currentRecipeItems, setCurrentRecipeItems] = useState<(Omit<ProductRecipeItem, "qtyUsed"> & { qtyUsed: string })[]>([]);

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
        setCurrentRecipeItems(existing.items.map(i => ({ ...i, qtyUsed: String(i.qtyUsed) })));
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
        qtyUsed: "1",
        unit: firstIng.unit,
      },
    ]);
  };

  const handleUpdateIngredient = (index: number, field: string, value: any) => {
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
    if (!selectedTarget) {
      toast.error("Select an item first.");
      return;
    }
    if (!currentRecipeItems.length) {
      toast.error("Add at least one ingredient before saving.");
      return;
    }
    if (currentRecipeItems.some((item) => !item.ingredientId)) {
      toast.error("Each recipe row must have an ingredient.");
      return;
    }

    if (currentRecipeItems.some((item) => Number(item.qtyUsed) <= 0)) {
      toast.error("All ingredients must have a quantity greater than 0.");
      return;
    }

    setSaving(true);
    try {
      await saveProductRecipe({
        productId: selectedTarget.id,
        productName: selectedTarget.name,
        items: currentRecipeItems.map(i => ({
          ...i,
          qtyUsed: Number(i.qtyUsed)
        })),
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
    <div className="flex flex-col h-[calc(100dvh-5rem)] md:h-[calc(100vh-6rem)] gap-2 md:gap-0 mt-1 md:mt-0">
      <div className="flex md:hidden bg-stone-100/50 p-1 mb-1 rounded-2xl gap-1 shrink-0 w-full">
        <Button 
          variant={mobileTab === "items" ? "default" : "ghost"} 
          className={cn("flex-1 rounded-xl h-10 font-bold text-xs transition-all", mobileTab === "items" ? "bg-stone-900 text-white shadow-sm" : "")}
          onClick={() => setMobileTab("items")}
        >
          Menu Items
        </Button>
        <Button 
          variant={mobileTab === "recipe" ? "default" : "ghost"} 
          className={cn("flex-1 rounded-xl h-10 font-bold text-xs transition-all", mobileTab === "recipe" ? "bg-stone-900 text-white shadow-sm" : "")}
          onClick={() => setMobileTab("recipe")}
          disabled={!selectedTargetId}
        >
          Recipe Content
        </Button>
      </div>

      <div className="flex-1 flex flex-col md:grid md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr] md:gap-5 lg:gap-6 overflow-hidden">
        <Card className={cn("flex-col overflow-hidden md:rounded-2xl border-stone-100 border-x-0 border-t-0 md:border bg-white shadow-sm shrink-0 relative rounded-b-3xl md:rounded-b-2xl shadow-[0_10px_20px_-15px_rgba(0,0,0,0.1)] md:shadow-sm z-10 md:h-full", mobileTab === "items" ? "flex flex-1 rounded-2xl border-x border-t" : "hidden md:flex")}>
        <CardHeader className="bg-white border-b border-stone-100 pb-3 md:pb-4 px-4 md:px-5 pt-4">
          <CardTitle className="text-base md:text-lg font-bold text-stone-900 tracking-tight">Menu Items</CardTitle>
          <CardDescription>Select an item to assign ingredients.</CardDescription>
        </CardHeader>
        <ScrollArea className="flex-1 bg-white custom-scrollbar">
          <div className="p-3 md:p-4 space-y-4 md:space-y-6">
            {Object.entries(groupedTargets).map(([groupName, items]) => (
              <div key={groupName}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500 capitalize">{groupName}</h3>
                <div className="space-y-1">
                  {items.map((item) => {
                    const hasRecipe = recipes.some((r) => r.productId === item.id && r.items.length > 0);
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedTargetId(item.id);
                          setMobileTab("recipe");
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                          selectedTargetId === item.id
                            ? "bg-stone-900 text-white shadow-md shadow-stone-900/10"
                            : "bg-white border border-transparent hover:border-stone-100 hover:bg-stone-50 text-stone-600"
                        }`}
                      >
                        <span className="truncate">{item.name}</span>
                        {hasRecipe && (
                          <Badge variant={selectedTargetId === item.id ? "secondary" : "outline"} className="scale-75 origin-right uppercase tracking-wider text-[10px]">
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

      <Card className={cn("flex-col overflow-hidden rounded-t-3xl rounded-b-none md:rounded-2xl border border-stone-100 md:border-x border-b-0 md:border-b border-x-0 bg-white shadow-sm shrink-0 md:h-full", mobileTab === "recipe" ? "flex flex-1 rounded-2xl border-x border-b" : "hidden md:flex")}>
        {!selectedTarget ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-8 bg-white border border-stone-100 rounded-2xl m-4 border-dashed">
            <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4 mb-4">
              <ChefHat className="h-6 w-6 md:h-8 md:w-8 text-stone-300" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-stone-900">No Item Selected</h3>
            <p className="mt-1 text-xs md:text-sm font-medium text-stone-500 max-w-[280px]">
              Choose a product, variant, or addon from the sidebar to configure its recipe.
            </p>
          </div>
        ) : (
          <>
            <CardHeader className="relative z-10 border-b border-stone-100 bg-white pb-4 pt-3 px-4 md:px-5 md:pt-4 md:pb-5 shadow-[0_4px_20px_-15px_rgba(0,0,0,0.05)]">
              <div className="flex flex-col items-start justify-between gap-1 md:gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5 md:mb-2">
                    <Badge variant="outline" className="uppercase tracking-wider text-[9px] font-bold text-stone-400">{selectedTarget.type}</Badge>
                    {selectedTarget.category && (
                      <Badge variant="outline" className="uppercase tracking-wider text-[9px] font-bold text-stone-400">{selectedTarget.category}</Badge>
                    )}
                  </div>
                  <CardTitle className="break-words text-lg md:text-xl font-bold tracking-tight text-stone-900">Recipe: {selectedTarget.name}</CardTitle>
                  <CardDescription className="text-xs font-medium text-stone-500 mt-0.5">
                    Define the exact raw ingredients deducted when this is ordered.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 bg-stone-50/30 p-0 md:p-2 custom-scrollbar">
              <div className="p-3 md:p-4 space-y-3 md:space-y-4">
                {currentRecipeItems.map((item, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl border border-stone-100 bg-white p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] sm:grid-cols-[1fr_120px_auto] sm:items-end">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Ingredient</label>
                      <Select
                        value={item.ingredientId}
                        onValueChange={(val) => handleUpdateIngredient(index, "ingredientId", val)}
                      >
                        <SelectTrigger className="h-10 text-sm font-semibold rounded-xl shadow-none">
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

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Usage Amount</label>
                      <div className="relative">
                        <Input
                          type="text"
                          min="0"
                          step="0.01"
                          className="h-10 rounded-xl shadow-none pr-12 text-sm font-semibold"
                          value={item.qtyUsed}
                          onChange={(e) =>
                            handleUpdateIngredient(
                              index,
                              "qtyUsed",
                              e.target.value
                            )
                          }
                          placeholder="0.00"
                        />
                        <span className="absolute inset-y-0 right-3 flex items-center text-xs text-stone-400 pointer-events-none">
                          {item.unit}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 self-end text-stone-400 hover:bg-stone-50 border border-transparent hover:border-stone-100 hover:text-red-500 rounded-xl transition-colors"
                      onClick={() => handleRemoveIngredient(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {currentRecipeItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-200 bg-white py-8 text-center">
                    <BookOpen className="mx-auto h-6 w-6 text-stone-300 mb-2" />
                    <p className="text-sm font-bold text-stone-900">No ingredients linked</p>
                    <p className="text-xs font-semibold text-stone-400 mb-4">This item uses 0 inventory stock when ordered.</p>
                    <Button variant="outline" size="sm" onClick={handleAddIngredient} className="bg-white rounded-xl">
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add First Ingredient
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={handleAddIngredient} className="w-full border-dashed rounded-xl h-10 font-semibold text-sm">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Another Ingredient
                  </Button>
                )}
              </div>
            </ScrollArea>
            <div className="border-t border-stone-100 bg-white p-3 md:p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-10 relative">
              <Button onClick={() => void handleSaveRecipe()} disabled={saving} className="w-full font-bold h-10 md:h-12 text-xs md:text-sm rounded-xl">
                {saving ? "Saving..." : (
                  <>
                    <Save className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4"/> Save Recipe Configuration
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </Card>
      </div>
    </div>
  );
}
