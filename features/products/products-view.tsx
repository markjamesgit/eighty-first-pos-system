"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Trash2, Package, SlidersHorizontal } from "lucide-react";
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
import { formatCurrency, cn } from "@/lib/utils";
import { deleteProduct } from "@/services/firebase/products";
import { useAuthStore } from "@/store/auth-store";
import { useProductsStore } from "@/store/products-store";
import { ProductDialog } from "./product-dialog";

export function ProductsView() {
  const products = useProductsStore((state) => state.products);
  const loading = useProductsStore((state) => state.loading);
  const error = useProductsStore((state) => state.error);
  const fetchProducts = useProductsStore((state) => state.fetchProducts);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const user = useAuthStore(state => state.user);
  const effectiveClientId = useMemo(
    () => user?.masqueradeClientId || user?.clientId || "",
    [user]
  );

  const handleSaveProduct = useCallback(async () => {
    if (effectiveClientId) {
      await fetchProducts(effectiveClientId);
    }
  }, [effectiveClientId, fetchProducts]);

  useEffect(() => {
    const isMasquerading = user?.role === "super_admin" && !!user.masqueradeClientId;
    const isRegularAdmin = (user?.role === "admin" || user?.role === "client_admin" || user?.role === "cashier") && !!user.clientId;
    const shouldConnect = isMasquerading || isRegularAdmin;

    if (shouldConnect && effectiveClientId) {
      void fetchProducts(effectiveClientId);
    }
  }, [fetchProducts, user, effectiveClientId]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "all" || product.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [category, products, search]);
  const categoryOptions = useMemo(() => {
    const categories = products
      .map((product) => product.category?.trim())
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(categories)).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const totalActiveProducts = useMemo(() => products.filter((item) => item.isActive).length, [products]);
  const visibleActiveProducts = useMemo(
    () => filteredProducts.filter((item) => item.isActive).length,
    [filteredProducts],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (category !== "all" && !categoryOptions.includes(category)) {
      setCategory("all");
    }
  }, [category, categoryOptions]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(effectiveClientId, id);
      toast.success("Product removed from catalog.");

      await handleSaveProduct();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Deletion failed.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-950">Product Management</h1>
          <p className="text-sm text-stone-500 font-medium">
            Maintain your digital menu and sellable items.
          </p>
        </div>
        <ProductDialog triggerLabel="Add New Product" onSaved={handleSaveProduct} clientId={effectiveClientId} />
      </div>

      <Card className="overflow-hidden rounded-2xl lg:rounded-3xl border-stone-100 bg-white shadow-sm">
        <CardHeader className="bg-white pb-4 lg:pb-5 border-b border-stone-100 px-4 lg:px-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg lg:text-xl font-bold text-stone-900 tracking-tight">Menu Catalog</CardTitle>
              <CardDescription className="text-xs lg:text-sm font-medium text-stone-500">
                Manage your digital menu and sellable products.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <div className="grid p-0 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-5 border-b border-stone-100 bg-white p-4 lg:p-5 lg:border-b-0 lg:border-r">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                <SlidersHorizontal className="h-4 w-4 text-stone-400" />
                Product Sidebar
              </h3>
              <p className="mt-0.5 text-xs text-stone-500">Filter and monitor your product catalog.</p>
            </div>

            <div className="space-y-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-stone-900" />
                <Input
                  className="h-10 rounded-xl border-stone-200 bg-white pl-10 font-medium transition-all focus-visible:ring-stone-950"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white font-semibold text-stone-600">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-stone-200">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoryOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden lg:block space-y-2">
              <div className="rounded-xl border border-stone-100 bg-stone-50/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total Products</p>
                <p className="mt-1 text-2xl font-black text-stone-900">{products.length}</p>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Active Products</p>
                <p className="mt-1 text-2xl font-black text-stone-900">{totalActiveProducts}</p>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Filtered Results</p>
                <p className="mt-1 text-2xl font-black text-stone-900">
                  {filteredProducts.length}
                  <span className="ml-1 text-xs font-semibold text-stone-400">({visibleActiveProducts} live)</span>
                </p>
              </div>
            </div>
          </aside>

          <div>
            {error && (
              <div className="m-6 rounded-xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-700 animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}
            <div className="space-y-3 p-4 lg:hidden">
              {loading ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-stone-100 bg-white opacity-30 animate-pulse">
                  <Package className="mb-2 h-10 w-10 text-stone-300" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Syncing Catalog...</p>
                </div>
              ) : paginatedProducts.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-stone-100 bg-white opacity-30">
                  <Search className="mb-2 h-10 w-10 text-stone-300" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">Query returned 0 results</p>
                </div>
              ) : (
                paginatedProducts.map((product) => (
                  <article key={product.id} className="space-y-3 rounded-xl border border-stone-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stone-200/50 bg-stone-100">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-stone-300">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black tracking-tight text-stone-900">{product.name}</p>
                          <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-stone-400">
                            ID: {product.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={product.isActive ? "success" : "default"}
                        className={cn(
                          "rounded-full px-3 text-[9px] font-black uppercase",
                          !product.isActive && "bg-stone-200 text-stone-500",
                        )}
                      >
                        {product.isActive ? "Live" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="h-5 border-stone-200 bg-stone-100/50 px-2 text-[9px] font-black uppercase tracking-widest">
                        {product.category}
                      </Badge>
                      <div className="text-right flex flex-col items-end gap-0.5">
                        {product.discount ? (
                          <>
                            <span className="text-sm font-black text-emerald-600">{formatCurrency(product.price - product.discount)}</span>
                            <span className="text-[10px] font-medium text-stone-400 line-through leading-none">{formatCurrency(product.price)}</span>
                          </>
                        ) : (
                          <span className="text-sm font-black text-stone-950">{formatCurrency(product.price)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <ProductDialog product={product} triggerLabel="Edit" onSaved={handleSaveProduct} clientId={effectiveClientId} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-stone-300 transition-colors hover:bg-red-50 hover:text-red-500"
                        onClick={() => void handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow className="hover:bg-transparent border-stone-100">
                    <TableHead className="text-left h-10 py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-6 lg:pl-8">Product</TableHead>
                    <TableHead className="text-left h-10 py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4">Category</TableHead>
                    <TableHead className="text-left h-10 py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4">Base Price</TableHead>
                    <TableHead className="text-left h-10 py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4">Disc. Price</TableHead>
                    <TableHead className="text-left h-10 py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4">Status</TableHead>
                    <TableHead className="text-left h-10 py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4 pr-6 lg:pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center opacity-30 animate-pulse">
                          <Package className="h-12 w-12 mb-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Syncing Catalog...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center opacity-30">
                          <Search className="h-12 w-12 mb-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">Query returned 0 results</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedProducts.map((product) => (
                      <TableRow key={product.id} className="group hover:bg-stone-50/50 transition-all border-stone-100">
                        <TableCell className="py-3 pl-6 lg:pl-8">
                          <div className="flex items-center gap-3 lg:gap-4">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-stone-50 border border-stone-100 shadow-sm group-hover:scale-105 transition-transform">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-stone-300">
                                  <Package className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-stone-900 text-sm tracking-tight">{product.name}</span>
                              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">ID: {product.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="pl-4">
                          <Badge variant="outline" className="bg-white border-stone-200 text-[10px] font-bold uppercase tracking-wider px-2 h-5 text-stone-500">
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="pl-4">
                          <span className={cn("font-bold text-sm", product.discount ? "text-stone-400 line-through" : "text-stone-900")}>
                            {formatCurrency(product.price)}
                          </span>
                        </TableCell>
                        <TableCell className="pl-4">
                          <span className="font-bold text-emerald-600 text-sm">
                            {product.discount ? formatCurrency(product.price - product.discount) : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="pl-4">
                          <Badge variant={product.isActive ? "success" : "default"} className={cn("rounded-md h-5 px-3 text-[10px] font-bold uppercase tracking-wider transition-all", !product.isActive && "bg-stone-100 text-stone-500")}>
                            {product.isActive ? "Live" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="pl-4 pr-6 lg:pr-8">
                          <div className="flex justify-start gap-2">
                            <ProductDialog product={product} triggerLabel="Edit" onSaved={handleSaveProduct} clientId={effectiveClientId} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                              onClick={() => void handleDelete(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="border-t border-stone-100 bg-stone-50/50">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredProducts.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[8, 12, 20, 50]}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
