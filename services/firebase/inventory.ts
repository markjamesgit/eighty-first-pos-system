"use client";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import type { IngredientItem, StockAdjustmentValues, StockHistoryEntry } from "@/lib/types/domain";
import { addAuditEntrySafe } from "./audit-trail";
import { getFirestoreDb } from "./client";

const INGREDIENTS_COLLECTION = "ingredients";
const INGREDIENT_STOCK_HISTORY_COLLECTION = "ingredient_stock_history";

export async function adjustStock(
  clientId: string,
  ingredient: IngredientItem,
  values: StockAdjustmentValues,
  performedBy = "admin",
) {
  const firestore = getFirestoreDb();
  const nextQty = ingredient.stockQty + values.quantityDelta;

  if (nextQty < 0) {
    throw new Error("Stock adjustment would make quantity negative.");
  }

  await updateDoc(doc(firestore, INGREDIENTS_COLLECTION, ingredient.id), {
    stockQty: increment(values.quantityDelta),
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(firestore, INGREDIENT_STOCK_HISTORY_COLLECTION), {
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    unit: ingredient.unit,
    type: values.reason,
    quantityChange: values.quantityDelta,
    beforeQty: ingredient.stockQty,
    afterQty: nextQty,
    clientId,
    createdAt: serverTimestamp(),
    performedBy,
  });

  await addAuditEntrySafe({
    clientId,
    module: "Inventory",
    action: values.reason,
    description: `Adjusted global stock for ${ingredient.name} by ${values.quantityDelta}`,
    performedBy,
  });
}


function mapHistory(
  snapshot: Awaited<ReturnType<typeof import("firebase/firestore").getDocs>>["docs"][number],
): StockHistoryEntry {
  const data = snapshot.data() as Record<string, unknown>;
  return {
    id: snapshot.id,
    productId: String(data.ingredientId ?? ""),
    productName: String(data.ingredientName ?? ""),
    type: data.type as StockHistoryEntry["type"],
    quantityChange: Number(data.quantityChange ?? 0),
    beforeQty: Number(data.beforeQty ?? 0),
    afterQty: Number(data.afterQty ?? 0),
    referenceOrderId: data.referenceOrderId ? String(data.referenceOrderId) : undefined,
    createdAt:
      data.createdAt && typeof data.createdAt === "object" && "toDate" in data.createdAt
        ? (data.createdAt as { toDate: () => Date }).toDate()
        : undefined,
    performedBy: data.performedBy ? String(data.performedBy) : undefined,
  };
}

export function subscribeToLowStockIngredients(
  threshold: number,
  callback: (ingredients: IngredientItem[]) => void,
): Unsubscribe {
  const firestore = getFirestoreDb();
  return onSnapshot(
    query(
      collection(firestore, INGREDIENTS_COLLECTION),
      where("stockQty", "<=", threshold),
      orderBy("stockQty"),
    ),
    (snapshot) => {
      callback(
        snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...(docSnapshot.data() as Omit<IngredientItem, "id">),
          createdAt: docSnapshot.data().createdAt?.toDate?.(),
          updatedAt: docSnapshot.data().updatedAt?.toDate?.(),
        })),
      );
    },
    (error) => {
      console.error("Firestore [LowStock] Subscription Error:", error);
    }
  );
}

export function subscribeToStockHistory(
  productId: string,
  callback: (entries: StockHistoryEntry[]) => void,
): Unsubscribe {
  const firestore = getFirestoreDb();
  return onSnapshot(
    query(
      collection(firestore, INGREDIENT_STOCK_HISTORY_COLLECTION),
      where("ingredientId", "==", productId), // Keeping parameter name for compatibility
      orderBy("createdAt", "desc"),
    ),
    (snapshot) => callback(snapshot.docs.map(mapHistory)),
    (error) => {
      console.error("Firestore [StockHistory] Subscription Error:", error);
    }
  );
}

export async function listRecentStockHistory(limitCount = 200) {
  const firestore = getFirestoreDb();
  const snapshot = await getDocs(
    query(
      collection(firestore, INGREDIENT_STOCK_HISTORY_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ),
  );

  return snapshot.docs.map(mapHistory);
}
