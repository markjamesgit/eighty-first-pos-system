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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");
  const [configProduct, setConfigProduct] = useState<Product | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");

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
        customerName: customerName.trim() || undefined,
      });
      toast.success(`Order ${result.orderId} processed.`);
      resetCart();
      setCustomerName("");
      setCheckoutOpen(false);
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
    <div className="flex flex-col h-[calc(100dvh-4.5rem)] md:h-[calc(100vh-6rem)] gap-2 md:gap-0 mt-1 md:mt-0">
      <div className="flex md:hidden bg-stone-100/50 p-1 rounded-2xl gap-1 shrink-0 w-full mb-1">
        <Button 
          variant={mobileTab === "products" ? "default" : "ghost"} 
          className={cn("flex-1 rounded-xl h-10 font-bold text-xs transition-all", mobileTab === "products" ? "bg-stone-900 text-white shadow-sm" : "")}
          onClick={() => setMobileTab("products")}
        >
          Menu Products
        </Button>
        <Button 
          variant={mobileTab === "cart" ? "default" : "ghost"} 
          className={cn("flex-1 rounded-xl h-10 font-bold text-xs relative transition-all", mobileTab === "cart" ? "bg-stone-900 text-white shadow-sm" : "")}
          onClick={() => setMobileTab("cart")}
        >
          Current Order
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-600 border border-white text-[10px] pointer-events-none shadow-sm">{totalItems}</Badge>
          )}
        </Button>
      </div>

      <div className="flex-1 flex flex-col md:grid md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_400px] md:gap-5 lg:gap-6 overflow-hidden">
        <div className={cn("flex-col space-y-2 lg:space-y-3 overflow-hidden min-h-0 md:h-full border border-stone-100 md:border-none rounded-2xl md:rounded-none bg-white md:bg-transparent shadow-sm md:shadow-none", mobileTab === "products" ? "flex flex-1" : "hidden md:flex")}>
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

        <div className="flex-1 overflow-y-auto px-2 pb-2 md:pb-20 md:pr-2 custom-scrollbar">
          {mtLoading ? (
            <div className="py-20 text-center text-stone-400 font-medium text-sm">Syncing store data...</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const isInactive = !product.isActive;
                return (
                  <Card
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className={cn(
                      "cursor-pointer transition-all border border-stone-100 shadow-sm rounded-xl overflow-hidden group flex flex-col",
                      isInactive ? "opacity-60 grayscale cursor-not-allowed" : "hover:border-stone-300 hover:shadow-md"
                    )}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-50 border-b border-stone-100 flex shrink-0 items-center justify-center text-stone-200">
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
                    <CardContent className="p-3 flex flex-col flex-1 justify-between gap-1.5">
                       <div className="min-w-0">
                         <p className="font-bold text-stone-900 truncate leading-tight text-xs sm:text-sm">{product.name}</p>
                         <p className="text-[9px] uppercase font-bold tracking-widest text-stone-400 mt-0.5">{product.category}</p>
                       </div>
                       <div className="flex flex-col items-start leading-none gap-1">
                         {product.discount ? (
                           <>
                             <p className="font-black text-emerald-600 text-sm">{formatCurrency(product.price - product.discount)}</p>
                             <p className="text-[10px] text-stone-400 line-through font-medium leading-none">{formatCurrency(product.price)}</p>
                           </>
                         ) : (
                           <p className="font-black text-stone-900 text-sm">{formatCurrency(product.price)}</p>
                         )}
                       </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {!filteredProducts.length && !mtLoading && (
            <div className="py-12 text-center text-stone-400 font-medium text-sm border border-stone-100 rounded-xl bg-stone-50">No products found here.</div>
          )}
        </div>
      </div>

      <Card className={cn("flex-col overflow-hidden rounded-t-3xl rounded-b-none md:rounded-2xl border-stone-100 border-x-0 border-b-0 md:border-x md:border-b bg-white shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] md:shadow-sm shrink-0 md:h-full", mobileTab === "cart" ? "flex flex-1 h-full shadow-none w-full border-x border-b rounded-2xl" : "hidden md:flex")}>
        <CardHeader className="flex flex-row items-center justify-between border-b border-stone-100 bg-white px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-stone-900">
              <ShoppingCart className="h-4 w-4" />
              Current Order
            </CardTitle>
            <p className="mt-0.5 text-[10px] sm:text-xs font-medium text-stone-500">
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
              className="rounded-xl border border-stone-100 bg-white p-3.5 shadow-sm hover:border-stone-200 transition-colors"
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
                <div className="flex items-center rounded-lg border border-stone-100 bg-stone-50 p-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 sm:h-7 sm:w-7 text-stone-600 hover:bg-stone-100"
                    onClick={() => decrementItem(item.productId, item.variantId, item.addonIds, item.modifierIds)}
                  >
                    <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                  <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-semibold text-stone-900">{item.qty}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 sm:h-7 sm:w-7 text-stone-600 hover:bg-stone-100"
                    onClick={() => incrementItem(item.productId, item.variantId, item.addonIds, item.modifierIds)}
                  >
                    <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </div>
                <p className="text-sm font-bold text-stone-950">{formatCurrency(item.qty * item.price)}</p>
              </div>
            </div>
          ))}
          {!cart.length && (
            <div className="py-10 text-center">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-stone-400">Empty Cart</p>
              <p className="mt-1 text-xs text-stone-400">Add products to start an order.</p>
            </div>
          )}
        </CardContent>

        <div className="space-y-3 border-t border-stone-100 bg-white px-3 py-3 sm:space-y-4 sm:px-4 sm:py-4">
          <div className="space-y-1.5 sm:space-y-2 rounded-xl border border-stone-100 bg-white p-2.5 sm:p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between text-sm text-stone-600">
              <span>Items</span>
              <span>{totalItems}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-stone-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-base sm:text-lg font-bold text-stone-950">
              <span>Total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:hidden">
             <div className="flex items-center justify-between bg-stone-50 p-2.5 rounded-xl border border-stone-100">
               <span className="hidden">Cash Tendered</span>
               <div className="flex items-center gap-1.5 w-full">
                  <span className="text-sm font-bold text-stone-400">₱</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={cashReceived || ""}
                    onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                    placeholder="Cash Amount"
                    className="h-7 border-none bg-transparent px-0 text-sm font-bold shadow-none focus-visible:ring-0"
                  />
               </div>
               <div className="shrink-0 text-right min-w-[60px]">
                  <span className="block text-[8px] font-bold text-stone-400 uppercase">Change</span>
                  <span className="block text-xs font-bold text-stone-900">{formatCurrency(change)}</span>
               </div>
             </div>
          </div>

          <div className="hidden md:block space-y-2 rounded-xl border border-stone-100 bg-stone-50/50 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500">
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
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="font-medium text-stone-400">Change Due</span>
              <span className="font-bold text-stone-900">{formatCurrency(change)}</span>
            </div>
          </div>

          <Button
            className="h-10 sm:h-12 w-full text-xs sm:text-sm font-bold shadow-md md:shadow-lg transition-transform active:scale-[0.98] rounded-xl"
            disabled={!cart.length || loading || cashReceived < subtotal}
            onClick={() => setCheckoutOpen(true)}
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

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl border-stone-100 p-0 overflow-hidden shadow-xl">
          <DialogHeader className="bg-white border-b border-stone-100 px-6 py-5">
            <DialogTitle className="text-lg font-bold text-stone-900">Customer Nickname</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-stone-500">
              Enter the customer's nickname to display on the order.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6">
            <div className="space-y-2.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Nickname (Optional)</label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. John"
                className="h-11 rounded-xl shadow-none text-base border-stone-200"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="bg-white border-t border-stone-100 px-6 py-4 flex flex-row justify-end gap-2">
            <Button variant="secondary" onClick={() => setCheckoutOpen(false)} className="rounded-xl font-semibold w-24">
              Cancel
            </Button>
            <Button onClick={() => void handleCheckout()} disabled={loading} className="rounded-xl font-bold w-24 shadow-md">
              {loading ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
