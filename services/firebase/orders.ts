"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  where,
  writeBatch,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import type {
  CartItem,
  OrderItem,
  OrderRecord,
  OrderStatus,
  Product,
  SalesSummary,
} from "@/lib/types/domain";
import { getDayKey, generateOrderId } from "@/lib/utils";
import { addAuditEntrySafe } from "./audit-trail";
import { getFirestoreDb } from "./client";

function cleanUndefined<T extends object>(obj: T): T {
  const result = { ...obj };
  Object.keys(result).forEach((key) => {
    if ((result as any)[key] === undefined) {
      delete (result as any)[key];
    }
  });
  return result;
}

const PRODUCTS_COLLECTION = "products";
const INGREDIENTS_COLLECTION = "ingredients";
const RECIPES_COLLECTION = "product_recipes";
const ACTIVE_ORDERS_COLLECTION = "orders_active";
const ORDER_HISTORY_COLLECTION = "orders_history";
const SALES_COLLECTION = "sales_summary";
const STOCK_HISTORY_COLLECTION = "stock_history";
const INGREDIENT_STOCK_HISTORY_COLLECTION = "ingredient_stock_history";

const ITEM_TYPE_TO_COLLECTION: Record<string, string> = {
  product: "products",
  variant: "maintenance_variants",
  addon: "maintenance_addons",
  modifier: "maintenance_modifiers",
};

function mapOrder(snapshot: QueryDocumentSnapshot | DocumentSnapshot): OrderRecord {
  const data = snapshot.data() as Record<string, unknown> | undefined;

  if (!data) {
    throw new Error("Order does not exist.");
  }

  return {
    id: snapshot.id,
    orderId: String(data.orderId ?? ""),
    items: (data.items as OrderItem[]) ?? [],
    totalAmount: Number(data.totalAmount ?? 0),
    cashReceived: Number(data.cashReceived ?? 0),
    change: Number(data.change ?? 0),
    customerName: data.customerName ? String(data.customerName) : undefined,
    status: (data.status as OrderStatus) ?? "pending",
    createdAt:
      data.createdAt && typeof data.createdAt === "object" && "toDate" in data.createdAt
        ? (data.createdAt as { toDate: () => Date }).toDate()
        : undefined,
    completedAt:
      data.completedAt && typeof data.completedAt === "object" && "toDate" in data.completedAt
        ? (data.completedAt as { toDate: () => Date }).toDate()
        : undefined,
    archivedAt:
      data.archivedAt && typeof data.archivedAt === "object" && "toDate" in data.archivedAt
        ? (data.archivedAt as { toDate: () => Date }).toDate()
        : undefined,
    dayKey: String(data.dayKey ?? ""),
    itemCount: Number(data.itemCount ?? 0),
  };
}

function mergeTopProducts(
  currentTopProducts: SalesSummary["topProducts"] = [],
  items: OrderItem[],
) {
  const counts = new Map<string, { productId: string; name: string; qty: number }>();

  currentTopProducts.forEach((item) => counts.set(item.productId, { ...item }));
  items.forEach((item) => {
    const existing = counts.get(item.productId);
    if (existing) {
      existing.qty += item.qty;
      return;
    }

    counts.set(item.productId, {
      productId: item.productId,
      name: item.name,
      qty: item.qty,
    });
  });

  return Array.from(counts.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
}

export async function createOrder(params: {
  items: CartItem[];
  cashReceived: number;
  totalAmount: number;
  customerName?: string;
}) {
  const firestore = getFirestoreDb();
  const { items, cashReceived, totalAmount, customerName } = params;
  const ingredientDeductions: Array<{
    ingredientId: string;
    ingredientName: string;
    unit: string;
    quantityChange: number;
    beforeQty: number;
    afterQty: number;
    referenceOrderId: string;
  }> = [];

  if (!items.length) {
    throw new Error("Cart is empty.");
  }

  if (cashReceived < totalAmount) {
    throw new Error("Cash received must cover the order total.");
  }

  const orderId = generateOrderId();
  const dayKey = getDayKey();
  const change = cashReceived - totalAmount;
  const salesRef = doc(firestore, SALES_COLLECTION, `daily_${dayKey}`);

  await runTransaction(firestore, async (transaction) => {
    // Firestore transactions require all reads to happen before any writes.
    const allRecipeIds = new Set<string>();
    items.forEach(item => {
      if (item.productId) allRecipeIds.add(item.productId);
      if (item.variantId) allRecipeIds.add(item.variantId);
      item.addonIds?.forEach(id => allRecipeIds.add(id));
      item.modifierIds?.forEach(id => allRecipeIds.add(id));
    });

    const uniqueRecipeIds = Array.from(allRecipeIds);
    const recipeRefs = uniqueRecipeIds.map(id => doc(firestore, RECIPES_COLLECTION, id));
    const recipeSnapshots = await Promise.all(recipeRefs.map(ref => transaction.get(ref)));
    const salesSnapshot = await transaction.get(salesRef);
    
    const recipeMap = new Map<string, any>();
    recipeSnapshots.forEach(snap => {
      if (snap.exists()) recipeMap.set(snap.id, snap.data());
    });

    const ingredientUsageMap = new Map<
      string,
      { ingredientId: string; ingredientName: string; unit: string; requiredQty: number }
    >();

    const processRecipe = (recipeId: string, itemQty: number) => {
      const recipeData = recipeMap.get(recipeId);
      if (!recipeData) return;
      
      const recipeItems = (recipeData.items || []) as Array<{
        ingredientId: string;
        ingredientName: string;
        qtyUsed: number;
        unit: string;
      }>;

      recipeItems.forEach((recipeItem) => {
        const requiredQty = Number(recipeItem.qtyUsed ?? 0) * itemQty;
        if (requiredQty <= 0) return;

        const existing = ingredientUsageMap.get(recipeItem.ingredientId);
        if (existing) {
          existing.requiredQty += requiredQty;
        } else {
          ingredientUsageMap.set(recipeItem.ingredientId, {
            ingredientId: recipeItem.ingredientId,
            ingredientName: recipeItem.ingredientName,
            unit: recipeItem.unit,
            requiredQty,
          });
        }
      });
    };

    items.forEach(item => {
      if (item.productId) processRecipe(item.productId, item.qty);
      if (item.variantId) processRecipe(item.variantId, item.qty);
      item.addonIds?.forEach(id => processRecipe(id, item.qty));
      item.modifierIds?.forEach(id => processRecipe(id, item.qty));
    });

    const ingredientUsageList = Array.from(ingredientUsageMap.values());
    const ingredientRefs = ingredientUsageList.map((item) =>
      doc(firestore, INGREDIENTS_COLLECTION, item.ingredientId),
    );
    const ingredientSnapshots = await Promise.all(ingredientRefs.map((ref) => transaction.get(ref)));

    const validatedIngredients = ingredientSnapshots.map((snapshot, index) => {
      const usage = ingredientUsageList[index];
      if (!usage) {
        throw new Error("Ingredient mapping mismatch.");
      }
      if (!snapshot.exists()) {
        throw new Error(`Missing ingredient for recipe: ${usage.ingredientName}`);
      }

      const currentQty = Number(snapshot.data().stockQty ?? 0);
      if (currentQty < usage.requiredQty) {
        throw new Error(`Insufficient ingredient stock: ${usage.ingredientName}`);
      }

      return {
        snapshot,
        usage,
        currentQty,
        nextQty: currentQty - usage.requiredQty,
      };
    });

    const existingSales = salesSnapshot.exists() ? salesSnapshot.data() : undefined;
    const orderRef = doc(collection(firestore, ACTIVE_ORDERS_COLLECTION));
    
    const orderData = cleanUndefined({
      orderId,
      items: items.map((item) => cleanUndefined({
        productId: item.productId,
        name: item.name,
        qty: item.qty,
        price: item.price,
        itemType: item.itemType || "product",
        variantId: item.variantId,
        addonIds: item.addonIds,
        modifierIds: item.modifierIds,
      })),
      totalAmount,
      cashReceived,
      change,
      customerName,
      status: "pending",
      createdAt: serverTimestamp(),
      completedAt: null,
      dayKey,
      itemCount: items.reduce((sum, item) => sum + item.qty, 0),
    });

    transaction.set(orderRef, orderData);

    validatedIngredients.forEach(({ snapshot, nextQty, usage, currentQty }) => {
      const ingredientData = snapshot.data();
      const threshold = Number(ingredientData.lowStockThreshold ?? 0);

      transaction.update(snapshot.ref, {
        stockQty: nextQty,
        updatedAt: serverTimestamp(),
      });

      // Create alert if below threshold
      if (nextQty <= threshold) {
        const alertRef = doc(collection(firestore, "alerts"));
        transaction.set(alertRef, {
          module: "Inventory",
          level: nextQty <= 0 ? "critical" : "warning",
          message: `Low stock for ${usage.ingredientName}: ${nextQty} ${usage.unit} remaining.`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      ingredientDeductions.push({
        ingredientId: usage.ingredientId,
        ingredientName: usage.ingredientName,
        unit: usage.unit,
        quantityChange: -usage.requiredQty,
        beforeQty: currentQty,
        afterQty: nextQty,
        referenceOrderId: orderId,
      });
    });

    // We no longer update sales_summary here. 
    // Revenue is now recorded only when the order is officially "completed".
  });

  await Promise.all(
    ingredientDeductions.map((entry) =>
      addDoc(collection(firestore, INGREDIENT_STOCK_HISTORY_COLLECTION), cleanUndefined({
        ingredientId: entry.ingredientId, // Actually works for maintenance IDs too
        ingredientName: entry.ingredientName,
        unit: entry.unit,
        quantityChange: entry.quantityChange,
        beforeQty: entry.beforeQty,
        afterQty: entry.afterQty,
        referenceOrderId: entry.referenceOrderId,
        type: "sale",
        createdAt: serverTimestamp(),
        performedBy: "admin",
      })),
    ),
  );

  await addAuditEntrySafe({
    module: "POS",
    action: "checkout",
    description: `Created order ${orderId} with ${items.length} line items`,
    performedBy: "admin",
  });

  return { orderId, change };
}

export function subscribeToActiveOrders(
  callback: (orders: OrderRecord[]) => void,
  orderLimit = 25,
): Unsubscribe {
  const firestore = getFirestoreDb();
  return onSnapshot(
    query(
      collection(firestore, ACTIVE_ORDERS_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(orderLimit),
    ),
    (snapshot) => callback(snapshot.docs.map(mapOrder)),
  );
}

export async function completeOrder(orderId: string) {
  const firestore = getFirestoreDb();
  const activeRef = doc(firestore, ACTIVE_ORDERS_COLLECTION, orderId);
  const snapshot = await getDoc(activeRef);

  if (!snapshot.exists()) {
    throw new Error("Order not found.");
  }

  const data = snapshot.data();
  const dayKey = data.dayKey || getDayKey();
  const salesRef = doc(firestore, SALES_COLLECTION, `daily_${dayKey}`);
  const batch = writeBatch(firestore);
  const historyRef = doc(collection(firestore, ORDER_HISTORY_COLLECTION));

  // Note: We use a simple batch here, but if we want to be perfectly atomic with the summary update, 
  // we normally use a transaction. However, keeping the current architecture:
  await runTransaction(firestore, async (transaction) => {
    const salesSnapshot = await transaction.get(salesRef);
    const existingSales = salesSnapshot.exists() ? salesSnapshot.data() : undefined;
    
    transaction.set(historyRef, {
      ...data,
      status: "completed" as OrderStatus,
      completedAt: serverTimestamp(),
      archivedAt: serverTimestamp(),
    });
    transaction.delete(activeRef);

    transaction.set(
      salesRef,
      {
        dateKey: dayKey,
        totalSales: (existingSales?.totalSales ?? 0) + (data.totalAmount ?? 0),
        orderCount: (existingSales?.orderCount ?? 0) + 1,
        topProducts: mergeTopProducts(existingSales?.topProducts, data.items || []),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  await addAuditEntrySafe({
    module: "Orders",
    action: "complete",
    description: `Completed order ${orderId}`,
    performedBy: "admin",
  });
}

export async function cancelOrder(orderId: string) {
  const firestore = getFirestoreDb();
  const activeRef = doc(firestore, ACTIVE_ORDERS_COLLECTION, orderId);
  const snapshot = await getDoc(activeRef);

  if (!snapshot.exists()) {
    throw new Error("Order not found.");
  }

  const data = snapshot.data();
  const batch = writeBatch(firestore);
  const historyRef = doc(collection(firestore, ORDER_HISTORY_COLLECTION));

  // Since we only record to sales_summary on COMPLETE now, 
  // cancelling a pending order doesn't need to touch the summary.
  batch.set(historyRef, {
    ...data,
    status: "cancelled" as OrderStatus,
    completedAt: serverTimestamp(),
    archivedAt: serverTimestamp(),
  });
  batch.delete(activeRef);

  await batch.commit();
  await addAuditEntrySafe({
    module: "Orders",
    action: "cancel",
    description: `Cancelled order ${orderId}`,
    performedBy: "admin",
  });
}

export async function listOrderHistory(
  cursor?: QueryDocumentSnapshot,
  orderLimit = 10,
) {
  const firestore = getFirestoreDb();
  const baseQuery = query(
    collection(firestore, ORDER_HISTORY_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(orderLimit),
  );

  const historyQuery = cursor ? query(baseQuery, startAfter(cursor)) : baseQuery;
  const snapshot = await getDocs(historyQuery);

  return {
    orders: snapshot.docs.map(mapOrder),
    lastVisible: snapshot.docs.at(-1),
    hasMore: snapshot.docs.length === orderLimit,
  };
}

export async function deleteHistoryOrder(id: string) {
  await deleteDoc(doc(getFirestoreDb(), ORDER_HISTORY_COLLECTION, id));
}

export async function getCompletedOrdersForDate(dayKey: string) {
  const firestore = getFirestoreDb();
  const snapshot = await getDocs(
    query(
      collection(firestore, ORDER_HISTORY_COLLECTION),
      where("dayKey", "==", dayKey),
      orderBy("createdAt", "desc"),
      limit(50),
    ),
  );

  return snapshot.docs.map(mapOrder);
}

export async function listOrderHistoryForRange(params: {
  startDate?: Date;
  endDate?: Date;
  limitCount?: number;
}) {
  const firestore = getFirestoreDb();
  const { startDate, endDate, limitCount = 300 } = params;
  const constraints = [orderBy("createdAt", "desc"), limit(limitCount)] as const;
  const snapshot = await getDocs(query(collection(firestore, ORDER_HISTORY_COLLECTION), ...constraints));

  const startTime = startDate ? startDate.getTime() : undefined;
  const endTime = endDate ? endDate.getTime() : undefined;

  return snapshot.docs
    .map(mapOrder)
    .filter((order) => {
      const createdTime = order.createdAt?.getTime();
      if (!createdTime) {
        return false;
      }

      const matchesStart = startTime === undefined || createdTime >= startTime;
      const matchesEnd = endTime === undefined || createdTime <= endTime;
      return matchesStart && matchesEnd;
    });
}

export async function listRealtimeProductsForPos() {
  const firestore = getFirestoreDb();
  const snapshot = await getDocs(
    query(
      collection(firestore, PRODUCTS_COLLECTION),
      where("isActive", "==", true),
      orderBy("category"),
      orderBy("nameLowercase"),
      limit(100),
    ),
  );

  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...(docSnapshot.data() as Omit<Product, "id">),
    createdAt: docSnapshot.data().createdAt?.toDate?.(),
    updatedAt: docSnapshot.data().updatedAt?.toDate?.(),
  }));
}

export async function listIngredientUsageForRange(params: {
  startDate?: Date;
  endDate?: Date;
  limitCount?: number;
}) {
  const firestore = getFirestoreDb();
  const { startDate, endDate, limitCount = 500 } = params;
  const snapshot = await getDocs(
    query(
      collection(firestore, INGREDIENT_STOCK_HISTORY_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ),
  );

  const startTime = startDate ? startDate.getTime() : undefined;
  const endTime = endDate ? endDate.getTime() : undefined;

  return snapshot.docs
    .map((docSnapshot) => {
      const data = docSnapshot.data() as Record<string, unknown>;
      const createdAt =
        data.createdAt && typeof data.createdAt === "object" && "toDate" in data.createdAt
          ? (data.createdAt as { toDate: () => Date }).toDate()
          : undefined;

      return {
        id: docSnapshot.id,
        ingredientId: String(data.ingredientId ?? ""),
        ingredientName: String(data.ingredientName ?? ""),
        unit: String(data.unit ?? ""),
        quantityChange: Number(data.quantityChange ?? 0),
        beforeQty: Number(data.beforeQty ?? 0),
        afterQty: Number(data.afterQty ?? 0),
        referenceOrderId: String(data.referenceOrderId ?? ""),
        createdAt,
      };
    })
    .filter((item) => {
      const createdTime = item.createdAt?.getTime();
      if (!createdTime) {
        return false;
      }

      const matchesStart = startTime === undefined || createdTime >= startTime;
      const matchesEnd = endTime === undefined || createdTime <= endTime;
      return matchesStart && matchesEnd;
    });
}
