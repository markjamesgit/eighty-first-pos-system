"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingCart, Image as ImageIcon, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, cn } from "@/lib/utils";
import { createOrder } from "@/services/firebase/orders";
import { usePosStore, getCartSubtotal } from "@/store/pos-store";
import { useProductsStore } from "@/store/products-store";
import { listMaintenanceItems } from "@/services/firebase/maintenance";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ProductConfigDialog } from "./product-config-dialog";
import type { Product, CartItem } from "@/lib/types/domain";

export function PosView() {
  const products = useProductsStore((state) => state.products);
  const fetchProducts = useProductsStore((state) => state.fetchProducts);
  const {
    cart,
    cashReceived,
    addItem,
    incrementItem,
    decrementItem,
    removeItem,
    resetCart,
    setCashReceived,
  } = usePosStore();

  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [modifiers, setModifiers] = useState<any[]>([]);
  const [mtLoading, setMtLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [configProduct, setConfigProduct] = useState<Product | null>(null);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setMtLoading(true);
    Promise.all([
      listMaintenanceItems("variants"),
      listMaintenanceItems("addons"),
      listMaintenanceItems("modifiers"),
    ]).then(([fetchedVariants, fetchedAddons, fetchedModifiers]) => {
      setVariants(fetchedVariants);
      setAddons(fetchedAddons);
      setModifiers(fetchedModifiers);
    }).finally(() => setMtLoading(false));
  }, []);

  const productCategories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeTab === "All") return products;
    return products.filter(p => p.category === activeTab);
  }, [products, activeTab]);

  const subtotal = useMemo(() => getCartSubtotal(cart), [cart]);
  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const change = cashReceived > subtotal ? cashReceived - subtotal : 0;

  async function handleCheckout() {
    if (!cart.length) {
      toast.error("Add at least one item before checkout.");
      return;
    }
    if (!Number.isFinite(cashReceived) || cashReceived <= 0) {
      toast.error("Enter a valid cash amount.");
      return;
    }
    if (cashReceived < subtotal) {
      toast.error("Received cash cannot be lower than total payment.");
      return;
    }
    setLoading(true);
    try {
      const result = await createOrder({
        items: cart,
        cashReceived,
        totalAmount: subtotal,
      });
      toast.success(`Order ${result.orderId} processed.`);
      resetCart();
      await fetchProducts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleProductClick(product: Product) {
    if (!product.isActive) return;
    const hasOptions = (product.maintenanceLinkIds || []).length > 0;
    if (hasOptions) {
      setConfigProduct(product);
    } else {
      addItem(product, { addons: [], modifiers: [] });
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-6rem)] items-start gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_400px]">
      <div className="flex min-h-0 flex-col space-y-4 overflow-hidden lg:h-[calc(100vh-6rem)]">
        <div className="sticky top-0 z-10 bg-stone-100/80 backdrop-blur-sm pb-2 pt-1 border-b border-stone-200/50">
          <ScrollArea className="w-full whitespace-nowrap rounded-lg border border-stone-200 bg-white p-1">
            <div className="flex w-max space-x-1 p-0.5">
              <Button
                variant={activeTab === "All" ? "default" : "ghost"}
                size="sm"
                className="rounded-md font-bold px-4"
                onClick={() => setActiveTab("All")}
              >
                All Products
              </Button>
              {productCategories.map((category) => (
                <Button
                  key={category}
                  variant={activeTab === category ? "default" : "ghost"}
                  size="sm"
                  className="rounded-md font-bold px-4"
                  onClick={() => setActiveTab(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
          </ScrollArea>
        </div>

        <div className="flex-1 overflow-y-auto pb-6 pr-1 lg:pb-20 lg:pr-2 custom-scrollbar">
          {mtLoading ? (
            <div className="py-20 text-center text-stone-400 font-medium">Syncing store data...</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const isInactive = !product.isActive;
                return (
                  <Card
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className={cn(
                      "cursor-pointer transition-all border-stone-200 overflow-hidden group",
                      isInactive ? "opacity-60 grayscale cursor-not-allowed" : "hover:border-stone-400 hover:shadow-md"
                    )}
                  >
                    <div className="relative aspect-video bg-stone-50 border-b border-stone-100 flex items-center justify-center text-stone-200">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      ) : <ImageIcon className="h-8 w-8" />}
                      {isInactive && (
                        <div className="absolute inset-0 bg-stone-900/10 flex items-center justify-center">
                          <Badge variant="outline" className="bg-white/90 text-[10px] font-black uppercase">Inactive</Badge>
                        </div>
                      )}
                      {(product.maintenanceLinkIds || []).length > 0 && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-white text-[11px] font-black">Options</Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 truncate leading-tight">{product.name}</p>
                          <p className="text-[10px] uppercase font-black tracking-widest text-stone-400 mt-1">{product.category}</p>
                        </div>
                        <p className="font-black text-stone-950 text-sm">{formatCurrency(product.price)}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {!filteredProducts.length && !mtLoading && (
            <div className="py-20 text-center text-stone-400 font-medium bg-white rounded-xl border border-stone-100">No products found here.</div>
          )}
        </div>
      </div>

      <Card className="flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border-stone-200 bg-white shadow-sm lg:h-[calc(100vh-6rem)] lg:max-h-none">
        <CardHeader className="flex flex-row items-center justify-between border-b border-stone-100 bg-stone-50/60 px-5 py-4">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-stone-900">
              <ShoppingCart className="h-4 w-4" />
              Current Order
            </CardTitle>
            <p className="mt-1 text-xs text-stone-500">
              {totalItems} {totalItems === 1 ? "item" : "items"} in cart
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetCart()}
            disabled={!cart.length}
            className="h-8 gap-1 px-2 text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-red-600 disabled:opacity-30"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </Button>
        </CardHeader>

        <CardContent className="flex-1 space-y-3 overflow-y-auto px-5 py-4 custom-scrollbar">
          {cart.map((item) => (
            <div
              key={`${item.productId}-${item.variantId}-${(item.addonIds || []).join("")}`}
              className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-snug text-stone-900">{item.name}</p>
                  <p className="mt-0.5 text-xs text-stone-500">{formatCurrency(item.price)} each</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-stone-400 hover:text-red-600"
                  onClick={() => removeItem(item.productId, item.variantId, item.addonIds, item.modifierIds)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center rounded-lg border border-stone-200 bg-stone-50 p-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-stone-600 hover:bg-stone-100"
                    onClick={() => decrementItem(item.productId, item.variantId, item.addonIds, item.modifierIds)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-8 text-center text-sm font-semibold text-stone-900">{item.qty}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-stone-600 hover:bg-stone-100"
                    onClick={() => incrementItem(item.productId, item.variantId, item.addonIds, item.modifierIds)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-sm font-bold text-stone-950">{formatCurrency(item.qty * item.price)}</p>
              </div>
            </div>
          ))}
          {!cart.length && (
            <div className="py-16 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Empty Cart</p>
              <p className="mt-2 text-sm text-stone-500">Add products to start an order.</p>
            </div>
          )}
        </CardContent>

        <div className="space-y-4 border-t border-stone-100 bg-stone-50/70 px-5 py-5">
          <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm text-stone-600">
              <span>Items</span>
              <span>{totalItems}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-stone-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-lg font-bold text-stone-950">
              <span>Total Payment</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-4">
            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-500">
              Cash Tendered
            </label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-stone-400">₱</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={cashReceived || ""}
                onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                placeholder="0.00"
                className="h-11 border-none bg-transparent px-0 text-xl font-bold shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-stone-500">Change Due</span>
              <span className="font-bold text-stone-950">{formatCurrency(change)}</span>
            </div>
            {cashReceived > 0 && cashReceived < subtotal && (
              <p className="text-xs text-amber-600">Received cash is below total payment.</p>
            )}
          </div>

          <Button
            className="h-12 w-full text-sm font-bold shadow-md transition-transform active:scale-[0.98]"
            disabled={!cart.length || loading}
            onClick={() => void handleCheckout()}
          >
            {loading ? "Processing..." : "Finish Transaction"}
          </Button>
        </div>
      </Card>

      <ProductConfigDialog
        product={configProduct}
        open={!!configProduct}
        onOpenChange={(open) => !open && setConfigProduct(null)}
        allVariants={variants}
        allAddons={addons}
        allModifiers={modifiers}
        onConfirm={(selections) => configProduct && addItem(configProduct, selections)}
      />
    </div>
  );
}
