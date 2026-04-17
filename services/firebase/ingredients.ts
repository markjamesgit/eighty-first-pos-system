"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import type { IngredientItem } from "@/lib/types/domain";
import { getFirestoreDb } from "./client";

const INGREDIENTS_COLLECTION = "ingredients";

function mapIngredient(
  snapshot: Awaited<ReturnType<typeof getDocs>>["docs"][number],
): IngredientItem {
  const data = snapshot.data() as Record<string, unknown>;
  return {
    id: snapshot.id,
    name: String(data.name ?? ""),
    unit: String(data.unit ?? "unit"),
    stockQty: Number(data.stockQty ?? 0),
    lowStockThreshold: Number(data.lowStockThreshold ?? 0),
    isActive: Boolean(data.isActive ?? true),
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

export async function listIngredients() {
  const snapshot = await getDocs(
    query(collection(getFirestoreDb(), INGREDIENTS_COLLECTION), orderBy("name")),
  );
  return snapshot.docs.map(mapIngredient);
}

export function subscribeToIngredients(callback: (items: IngredientItem[]) => void) {
  const q = query(collection(getFirestoreDb(), INGREDIENTS_COLLECTION), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(mapIngredient));
  });
}

export async function createIngredient(input: {
  name: string;
  unit: string;
  stockQty: number;
  lowStockThreshold: number;
  isActive?: boolean;
}) {
  await addDoc(collection(getFirestoreDb(), INGREDIENTS_COLLECTION), {
    ...input,
    name: input.name.trim(),
    unit: input.unit.trim(),
    isActive: input.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteIngredient(id: string) {
  await deleteDoc(doc(getFirestoreDb(), INGREDIENTS_COLLECTION, id));
}

export async function updateIngredientStock(id: string, stockQty: number) {
  await updateDoc(doc(getFirestoreDb(), INGREDIENTS_COLLECTION, id), {
    stockQty,
    updatedAt: serverTimestamp(),
  });
}
export async function updateIngredient(id: string, input: Partial<Omit<IngredientItem, "id" | "createdAt" | "updatedAt">>) {
  await updateDoc(doc(getFirestoreDb(), INGREDIENTS_COLLECTION, id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}
