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
  fetchProducts: () => Promise<void>;
};

export const useProductsStore = create<ProductsState>((set) => ({
  products: [],
  loading: false,
  hydrated: false,
  error: null,
  setProducts: (products) => set({ products, hydrated: true }),
  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const products = await listProducts();
      set({ products, hydrated: true, loading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load products.";
      set({ loading: false, error: message });
    }
  },
}));
