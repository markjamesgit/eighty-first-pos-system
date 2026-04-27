"use client";

import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import type { ProductRecipe, ProductRecipeItem } from "@/lib/types/domain";
import { getFirestoreDb } from "./client";
import { addAuditEntrySafe } from "./audit-trail";

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

export async function saveProductRecipe(
  clientId: string,
  input: {
    productId: string;
    productName: string;
    items: ProductRecipeItem[];
  }
) {
  await setDoc(
    doc(getFirestoreDb(), RECIPES_COLLECTION, input.productId),
    {
      ...input,
      clientId,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  await addAuditEntrySafe({
    clientId,
    module: "Recipes",
    action: "save",
    description: `Saved recipe for ${input.productName}`,
    performedBy: "admin",
  });
}

export async function getProductRecipe(productId: string) {
  const snapshot = await getDoc(doc(getFirestoreDb(), RECIPES_COLLECTION, productId));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    id: snapshot.id,
    productId: String(data.productId ?? ""),
    productName: String(data.productName ?? ""),
    items: Array.isArray(data.items) ? (data.items as ProductRecipeItem[]) : [],
    createdAt: data.createdAt?.toDate?.(),
    updatedAt: data.updatedAt?.toDate?.(),
  } as ProductRecipe;
}

export async function listProductRecipes(clientId: string) {
  const snapshot = await getDocs(
    query(
      collection(getFirestoreDb(), RECIPES_COLLECTION),
      where("clientId", "==", clientId),
      orderBy("productName")
    ),
  );
  return snapshot.docs.map(mapRecipe);
}
