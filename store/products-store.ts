"use client";

import { create } from "zustand";
import type { Product } from "@/lib/types/domain";
import { listProducts } from "@/services/firebase/products";

type ProductsState = {
  products: Product[];
  loading: boolean;
  hydrated: boolean;
  error: string | null;
  setProducts: (products: Product[]) => void;
  fetchProducts: (clientId?: string) => Promise<void>;
};

export const useProductsStore = create<ProductsState>((set) => ({
  products: [],
  loading: false,
  hydrated: false,
  error: null,
  setProducts: (products) => set({ products, hydrated: true }),
  fetchProducts: async (clientId?: string) => {
    set({ loading: true, error: null });
    try {
      if (!clientId) {
        set({ loading: false, error: "Client ID is required" });
        return;
      }
      const products = await listProducts(clientId);
      set({ products, hydrated: true, loading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load products.";
      set({ loading: false, error: message });
    }
  },
}));
