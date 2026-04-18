"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { adjustStock } from "@/services/firebase/inventory";
import { listIngredients } from "@/services/firebase/ingredients";
import { listProductRecipes } from "@/services/firebase/recipes";
import type { IngredientItem, ProductRecipe } from "@/lib/types/domain";
import { Archive, Plus, Minus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { IngredientDialog } from "./ingredient-dialog";
import { deleteIngredient } from "@/services/firebase/ingredients";

export function InventoryView() {
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [recipes, setRecipes] = useState<ProductRecipe[]>([]);
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ingData, recData] = await Promise.all([
        listIngredients(),
        listProductRecipes()
      ]);
      setIngredients(ingData || []);
      setRecipes(recData || []);
    } catch (error) {
      setIngredients([]);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const lowStockCount = useMemo(
    () => ingredients.filter((item) => item.stockQty <= item.lowStockThreshold).length,
    [ingredients],
  );

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const isLow = item.stockQty <= item.lowStockThreshold;
      const matchesStock = stockFilter === "all" || (stockFilter === "low" && isLow);
      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" ? item.isActive : !item.isActive);
      return matchesSearch && matchesStock && matchesStatus;
    });
  }, [ingredients, search, stockFilter, statusFilter]);

  const paginatedIngredients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredIngredients.slice(start, start + pageSize);
  }, [filteredIngredients, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredIngredients.length / pageSize));
  const filteredLowStockCount = useMemo(
    () => filteredIngredients.filter((item) => item.stockQty <= item.lowStockThreshold).length,
    [filteredIngredients],
  );
  const activeIngredientsCount = useMemo(
    () => ingredients.filter((item) => item.isActive).length,
    [ingredients],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, stockFilter, statusFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handleAdjustment(ingredient: IngredientItem, quantityDelta: number) {
    if (quantityDelta === 0) return;

    try {
      await adjustStock(ingredient, {
        ingredientId: ingredient.id,
        quantityDelta,
        reason: quantityDelta > 0 ? "manual_restock" : "manual_correction",
      });
      toast.success(`${ingredient.name} updated.`);
      setAdjustments((current) => ({ ...current, [ingredient.id]: 0 }));
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Adjustment failed.");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;
    try {
      await deleteIngredient(id);
      toast.success("Ingredient removed from warehouse.");
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Deletion failed.");
    }
  }

  const getUsageSummary = (ingredientId: string) => {
    const usedIn = recipes.filter(r => r.items.some(i => i.ingredientId === ingredientId));
    if (!usedIn.length) return "Not used in any recipe";
    return usedIn.map(r => r.productName).join(", ");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Supply Warehouse</h1>
          <p className="text-sm text-stone-500 font-medium">
            Manage raw materials and track stock levels connected to your recipes.
          </p>
        </div>
        <IngredientDialog onSaved={fetchData} />
      </div>

      <Card className="overflow-hidden rounded-2xl md:rounded-3xl border-stone-100 bg-white shadow-sm">
        <CardHeader className="bg-white pb-4 md:pb-5 border-b border-stone-100 px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl font-bold text-stone-900 tracking-tight">Inventory Management</CardTitle>
          <CardDescription className="text-xs md:text-sm font-medium text-stone-500">Real-time tracking of raw materials and ingredients.</CardDescription>
        </CardHeader>
        <CardContent className="grid p-0 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-4 border-b border-stone-100 bg-white p-4 md:p-5 lg:border-b-0 lg:border-r">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                <SlidersHorizontal className="h-4 w-4 text-stone-400" />
                Inventory Sidebar
              </h3>
              <p className="mt-0.5 text-xs text-stone-500">Filter stock and monitor critical inventory levels.</p>
            </div>

            <div className="space-y-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-stone-900" />
                <Input
                  className="h-10 rounded-xl border-stone-200 bg-white pl-10 font-medium transition-all focus-visible:ring-stone-950"
                  placeholder="Search ingredients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={stockFilter} onValueChange={(value: "all" | "low") => setStockFilter(value)}>
                <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white font-semibold text-stone-600">
                  <SelectValue placeholder="Stock status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-stone-200">
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="low">Low Stock Only</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}
              >
                <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white font-semibold text-stone-600">
                  <SelectValue placeholder="Ingredient status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-stone-200">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="hidden lg:block space-y-2">
              <div className="rounded-xl border border-stone-100 bg-stone-50/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total Ingredients</p>
                <p className="mt-1 text-2xl font-black text-stone-900">{ingredients.length}</p>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Low Stock Alerts</p>
                <p className="mt-1 text-2xl font-black text-stone-900">{lowStockCount}</p>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Active Ingredients</p>
                <p className="mt-1 text-2xl font-black text-stone-900">{activeIngredientsCount}</p>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Filtered Results</p>
                <p className="mt-1 text-2xl font-black text-stone-900">
                  {filteredIngredients.length}
                  <span className="ml-1 text-xs font-semibold text-stone-400">({filteredLowStockCount} low)</span>
                </p>
              </div>
            </div>
          </aside>

          <div>
            <div className="space-y-3 p-4 lg:hidden">
              {loading ? (
                <div className="flex h-40 items-center justify-center rounded-xl border border-stone-100 bg-white text-xs font-bold uppercase tracking-widest text-stone-400 opacity-40">
                  Synchronizing Warehouse...
                </div>
              ) : paginatedIngredients.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-stone-100 bg-white opacity-40">
                  <Archive className="mb-2 h-10 w-10 text-stone-300" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">Warehouse Empty</p>
                </div>
              ) : (
                paginatedIngredients.map((item) => {
                  const isLow = item.stockQty <= item.lowStockThreshold;
                  const adjValue = adjustments[item.id] || 0;
                  const usage = getUsageSummary(item.id);
                  return (
                    <article
                      key={item.id}
                      className={cn(
                        "space-y-3 rounded-xl border border-stone-100 bg-white p-4 shadow-sm",
                        isLow && "border-amber-100 bg-amber-50/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold tracking-tight text-stone-900">{item.name}</p>
                          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                            ID: {item.id.slice(0, 8)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex h-5 items-center rounded-full px-2.5 text-[9px] font-black uppercase tracking-widest",
                            item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-500",
                          )}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={cn("text-base font-bold tracking-tighter", isLow ? "text-red-600" : "text-emerald-700")}>
                            {item.stockQty.toLocaleString()} {item.unit}
                          </p>
                          {isLow ? (
                            <Badge variant="destructive" className="mt-1 h-4 rounded-full px-2 text-[7px] font-black uppercase tracking-widest">
                              Low Stock
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-xs font-medium text-stone-500">{usage || "No products linked"}</p>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center rounded-xl border border-stone-200 bg-white p-0.5 shadow-sm ring-1 ring-stone-100/50">
                          <button
                            onClick={() => {
                              const currentAdj = adjustments[item.id] || 0;
                              setAdjustments((p) => ({ ...p, [item.id]: currentAdj - 1 }));
                            }}
                            className="flex h-8 w-8 items-center justify-center text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className={cn("w-10 text-center text-xs font-black", adjValue !== 0 ? "text-stone-950" : "text-stone-200")}>
                            {adjValue > 0 ? `+${adjValue}` : adjValue}
                          </span>
                          <button
                            onClick={() => {
                              const currentAdj = adjustments[item.id] || 0;
                              setAdjustments((p) => ({ ...p, [item.id]: currentAdj + 1 }));
                            }}
                            className="flex h-8 w-8 items-center justify-center text-stone-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <Button
                          size="sm"
                          variant="default"
                          disabled={adjValue === 0 || !item.isActive}
                          onClick={() => void handleAdjustment(item, adjValue)}
                          className="h-9 bg-stone-900 px-3 text-[10px] font-bold uppercase tracking-wider text-stone-50 shadow-sm transition-all hover:bg-stone-800 rounded-xl"
                        >
                          Commit
                        </Button>
                      </div>
                      <div className="flex justify-end gap-2">
                        <IngredientDialog ingredient={item} onSaved={fetchData} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-stone-300 transition-colors hover:bg-red-50 hover:text-red-500 bg-white"
                          onClick={() => void handleDelete(item.id, item.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow className="hover:bg-transparent border-stone-100 h-12">
                    <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-6 md:pl-8">Ingredient</TableHead>
                    <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4">In Stock</TableHead>
                    <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4">Unit</TableHead>
                    <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4">Status</TableHead>
                    <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4">Usage context</TableHead>
                    <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4">Adjustments</TableHead>
                    <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4 pr-6 md:pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="h-64 text-center text-stone-400 font-medium italic animate-pulse text-xs tracking-widest uppercase opacity-40">Synchronizing Warehouse...</TableCell></TableRow>
                  ) : paginatedIngredients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center opacity-40">
                          <Archive className="h-12 w-12 mb-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">Warehouse Empty</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedIngredients.map((item) => {
                      const isLow = item.stockQty <= item.lowStockThreshold;
                      const adjValue = adjustments[item.id] || 0;
                      const usage = getUsageSummary(item.id);

                      return (
                        <TableRow key={item.id} className={cn("hover:bg-stone-50/50 transition-all border-stone-100", isLow && "bg-amber-50/20")}>
                          <TableCell className="pl-6 md:pl-8 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-stone-900 text-sm tracking-tight">{item.name}</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">ID: {item.id.slice(0, 8)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="pl-4">
                            <div className="flex flex-col items-start">
                              <span className={cn("text-base font-black tracking-tighter", isLow ? "text-red-600" : "text-emerald-700")}>
                                {item.stockQty.toLocaleString()}
                              </span>
                              {isLow && <Badge variant="destructive" className="mt-1 h-3.5 text-[7px] font-black uppercase tracking-widest px-2 rounded-full shadow-sm">Low Stock</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="pl-4">
                            <Badge variant="outline" className="bg-white border-stone-200 text-[10px] font-bold uppercase tracking-wider px-2 h-5 text-stone-500">
                              {item.unit}
                            </Badge>
                          </TableCell>
                          <TableCell className="pl-4">
                            <span
                              className={cn(
                                "inline-flex h-5 items-center rounded-md px-2.5 text-[10px] font-bold uppercase tracking-wider",
                                item.isActive ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-stone-100 text-stone-500",
                              )}
                            >
                              {item.isActive ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[220px] pl-4">
                            <p className="truncate text-xs font-medium text-stone-500 leading-tight" title={usage}>
                              {usage || "No products linked"}
                            </p>
                          </TableCell>
                          <TableCell className="pl-4">
                            <div className="flex items-center justify-start gap-2">
                              <div className="flex items-center rounded-xl border border-stone-200 bg-white p-0.5 shadow-sm overflow-hidden ring-1 ring-stone-100/50">
                                <button
                                  onClick={() => {
                                    const currentAdj = adjustments[item.id] || 0;
                                    setAdjustments((p) => ({ ...p, [item.id]: currentAdj - 1 }));
                                  }}
                                  className="h-8 w-8 flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className={cn("w-10 text-center text-xs font-black", adjValue !== 0 ? "text-stone-950" : "text-stone-200")}>
                                  {adjValue > 0 ? `+${adjValue}` : adjValue}
                                </span>
                                <button
                                  onClick={() => {
                                    const currentAdj = adjustments[item.id] || 0;
                                    setAdjustments((p) => ({ ...p, [item.id]: currentAdj + 1 }));
                                  }}
                                  className="h-8 w-8 flex items-center justify-center text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <Button
                                size="sm"
                                variant="default"
                                disabled={adjValue === 0 || !item.isActive}
                                onClick={() => void handleAdjustment(item, adjValue)}
                                className="h-9 px-3 text-[10px] font-bold uppercase tracking-wider bg-stone-900 text-stone-50 hover:bg-stone-800 transition-all rounded-xl active:scale-95 shadow-sm"
                              >
                                Commit
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="pl-4 pr-6 md:pr-8">
                            <div className="flex justify-start gap-2">
                              <IngredientDialog ingredient={item} onSaved={fetchData} />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors bg-white"
                                onClick={() => void handleDelete(item.id, item.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="bg-white border-t border-stone-100 py-3">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredIngredients.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 20, 30, 50]}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
