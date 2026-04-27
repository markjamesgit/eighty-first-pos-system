"use client";

import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import type { OrderItem, SalesSummary } from "@/lib/types/domain";
import { getDayKey } from "@/lib/utils";
import { getFirestoreDb } from "./client";

const SALES_COLLECTION = "sales_summary";

function salesCollection() {
  return collection(getFirestoreDb(), SALES_COLLECTION);
}

function buildSummaryId(clientId: string, dateKey: string) {
  return `${clientId}_${dateKey}`;
}

export async function upsertDailySalesSummary(
  clientId: string,
  dateKey: string,
  orderTotal: number,
  items: OrderItem[],
) {
  const docRef = doc(getFirestoreDb(), SALES_COLLECTION, buildSummaryId(clientId, dateKey));
  const topProductsMap = new Map<string, { productId: string; name: string; qty: number }>();

  items.forEach((item) => {
    topProductsMap.set(item.productId, {
      productId: item.productId,
      name: item.name,
      qty: item.qty,
    });
  });

  await setDoc(
    docRef,
    {
      clientId,
      dateKey,
      totalSales: orderTotal,
      orderCount: 1,
      topProducts: Array.from(topProductsMap.values()),
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

function mapSummary(
  snapshot: Awaited<ReturnType<typeof getDocs>>["docs"][number],
): SalesSummary {
  const data = snapshot.data() as Record<string, unknown>;
  return {
    id: snapshot.id,
    dateKey: String(data.dateKey ?? ""),
    totalSales: Number(data.totalSales ?? 0),
    orderCount: Number(data.orderCount ?? 0),
    topProducts: (data.topProducts as SalesSummary["topProducts"]) ?? [],
    updatedAt:
      data.updatedAt && typeof data.updatedAt === "object" && "toDate" in data.updatedAt
        ? (data.updatedAt as { toDate: () => Date }).toDate()
        : undefined,
  };
}

export async function getSalesSummaryByFilter(clientId: string, filter: "today" | "weekly" | "monthly") {
  const today = new Date();

  if (filter === "today") {
    const snapshot = await getDocs(
      query(salesCollection(), 
        where("clientId", "==", clientId),
        where("dateKey", "==", getDayKey(today)), 
        limit(1)
      ),
    );
    return snapshot.docs.map(mapSummary);
  }

  const range = filter === "weekly" ? 7 : 31;
  const cutoff = new Date();
  cutoff.setDate(today.getDate() - (range - 1));

  const snapshot = await getDocs(
    query(salesCollection(), 
      where("clientId", "==", clientId),
      orderBy("dateKey", "desc"), 
      limit(range)
    ),
  );

  return snapshot.docs
    .map(mapSummary)
    .filter((item) => new Date(item.dateKey) >= new Date(getDayKey(cutoff)));
}

export async function getSalesSummaryByDateRange(clientId: string, startDate: Date, endDate: Date) {
  const normalizedStart = new Date(getDayKey(startDate));
  const normalizedEnd = new Date(getDayKey(endDate));
  normalizedEnd.setHours(23, 59, 59, 999);

  const snapshot = await getDocs(
    query(salesCollection(), 
      where("clientId", "==", clientId),
      orderBy("dateKey", "desc"), 
      limit(366)
    ),
  );

  return snapshot.docs
    .map(mapSummary)
    .filter((item) => {
      const date = new Date(item.dateKey);
      return date >= normalizedStart && date <= normalizedEnd;
    });
}

export async function syncDailySalesSummary(clientId: string, dayKey: string) {
  const db = getFirestoreDb();
  const snapshot = await getDocs(
    query(
      collection(db, "orders_history"),
      where("clientId", "==", clientId),
      where("dayKey", "==", dayKey),
      where("status", "==", "completed"),
    )
  );

  let totalSales = 0;
  let orderCount = 0;
  const topProductsMap = new Map<string, { productId: string; name: string; qty: number }>();

  snapshot.docs.forEach((snap) => {
    const data = snap.data();
    totalSales += Number(data.totalAmount || 0);
    orderCount += 1;

    (data.items || []).forEach((item: OrderItem) => {
      if (!item.productId) return;
      const existing = topProductsMap.get(item.productId);
      if (existing) {
        existing.qty += Number(item.qty || 0);
      } else {
        topProductsMap.set(item.productId, {
          productId: item.productId,
          name: item.name,
          qty: Number(item.qty || 0),
        });
      }
    });
  });

  const docRef = doc(db, SALES_COLLECTION, buildSummaryId(clientId, dayKey));
  await setDoc(
    docRef,
    {
      clientId,
      dateKey: dayKey,
      totalSales,
      orderCount,
      topProducts: Array.from(topProductsMap.values()),
      updatedAt: new Date(),
    },
    { merge: true },
  );
}
