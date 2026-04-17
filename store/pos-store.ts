"use client";

import { create } from "zustand";
import type { CartItem, Product } from "@/lib/types/domain";

type Selections = {
  variant?: { id: string; name: string; price: number };
  addons: { id: string; name: string; price: number }[];
  modifiers: { id: string; name: string }[];
};

type PosState = {
  cart: CartItem[];
  cashReceived: number;
  addItem: (product: Product, selections: Selections) => void;
  incrementItem: (productId: string, variantId?: string, addonIds?: string[], modifierIds?: string[]) => void;
  decrementItem: (productId: string, variantId?: string, addonIds?: string[], modifierIds?: string[]) => void;
  removeItem: (productId: string, variantId?: string, addonIds?: string[], modifierIds?: string[]) => void;
  resetCart: () => void;
  setCashReceived: (value: number) => void;
};

// Helper to compare items
const isMatchingItem = (item: CartItem, productId: string, vId?: string, aIds: string[] = [], mIds: string[] = []) => {
  return item.productId === productId && 
         (item.variantId || undefined) === (vId || undefined) &&
         (item.addonIds || []).sort().join(",") === (aIds || []).sort().join(",") &&
         (item.modifierIds || []).sort().join(",") === (mIds || []).sort().join(",");
};

export const usePosStore = create<PosState>((set) => ({
  cart: [],
  cashReceived: 0,
  addItem: (product, selections) =>
    set((state) => {
      const vId = selections.variant?.id;
      const aIds = selections.addons.map(a => a.id);
      const mIds = selections.modifiers.map(m => m.id);
      
      // Calculate total price: Base + Variant + Sum(Addons)
      const optionsPrice = (selections.variant?.price || 0) + selections.addons.reduce((sum, a) => sum + (a.price || 0), 0);
      const totalPrice = product.price + optionsPrice;

      // Construct Display Name: Latte (Medium, Extra Shot)
      const parts = [];
      if (selections.variant) parts.push(selections.variant.name);
      selections.addons.forEach(a => parts.push(a.name));
      selections.modifiers.forEach(m => parts.push(m.name));
      
      const displayName = parts.length > 0 ? `${product.name} (${parts.join(", ")})` : product.name;

      const existing = state.cart.find((item) => isMatchingItem(item, product.id, vId, aIds, mIds));

      if (existing) {
        return {
          cart: state.cart.map((item) =>
            item === existing ? { ...item, qty: item.qty + 1 } : item,
          ),
        };
      }

      return {
        cart: [
          ...state.cart,
          {
            productId: product.id,
            name: displayName,
            price: totalPrice,
            qty: 1,
            category: product.category,
            itemType: "product",
            variantId: vId,
            addonIds: aIds,
            modifierIds: mIds,
          },
        ],
      };
    }),
  incrementItem: (productId, vId, aIds, mIds) => 
    set((state) => ({
      cart: state.cart.map((item) => 
        isMatchingItem(item, productId, vId, aIds, mIds) ? { ...item, qty: item.qty + 1 } : item
      )
    })),
  decrementItem: (productId, vId, aIds, mIds) =>
    set((state) => ({
      cart: state.cart
        .map((item) =>
          isMatchingItem(item, productId, vId, aIds, mIds) ? { ...item, qty: item.qty - 1 } : item,
        )
        .filter((item) => item.qty > 0),
    })),
  removeItem: (productId, vId, aIds, mIds) =>
    set((state) => ({
      cart: state.cart.filter((item) => !isMatchingItem(item, productId, vId, aIds, mIds)),
    })),
  resetCart: () => set({ cart: [], cashReceived: 0 }),
  setCashReceived: (value) => set({ cashReceived: value }),
}));

export function getCartSubtotal(cart: CartItem[]) {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}
