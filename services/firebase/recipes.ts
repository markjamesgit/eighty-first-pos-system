"use client";

import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import type { ProductRecipe, ProductRecipeItem } from "@/lib/types/domain";
import { getFirestoreDb } from "./client";

const RECIPES_COLLECTION = "product_recipes";

function mapRecipe(snapshot: Awaited<ReturnType<typeof getDocs>>["docs"][number]): ProductRecipe {
  const data = snapshot.data() as Record<string, unknown>;
  return {
    id: snapshot.id,
    productId: String(data.productId ?? ""),
    productName: String(data.productName ?? ""),
    items: Array.isArray(data.items) ? (data.items as ProductRecipeItem[]) : [],
    createdAt:
      data.createdAt && typeof data.createdAt === "object" && "toDate" in data.createdAt
        ? (data.createdAt as { toDate: () => Date }).toDate()
        : undefined,
    updatedAt:
      data.updatedAt && typeof data.updatedAt === "object" && "toDate" in data.updatedAt
        ? (data.updatedAt as { toDate: () => Date }).toDate()
        : undefined,
  };
}

export async function saveProductRecipe(input: {
  productId: string;
  productName: string;
  items: ProductRecipeItem[];
}) {
  await setDoc(
    doc(getFirestoreDb(), RECIPES_COLLECTION, input.productId),
    {
      ...input,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function getProductRecipe(productId: string) {
  const snapshot = await getDoc(doc(getFirestoreDb(), RECIPES_COLLECTION, productId));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as Record<string, unknown>;
  return {
    id: snapshot.id,
    productId: String(data.productId ?? ""),
    productName: String(data.productName ?? ""),
    items: Array.isArray(data.items) ? (data.items as ProductRecipeItem[]) : [],
    createdAt: data.createdAt?.toDate?.(),
    updatedAt: data.updatedAt?.toDate?.(),
  } satisfies ProductRecipe;
}

export async function listProductRecipes() {
  const snapshot = await getDocs(
    query(collection(getFirestoreDb(), RECIPES_COLLECTION), orderBy("productName")),
  );
  return snapshot.docs.map(mapRecipe);
}
