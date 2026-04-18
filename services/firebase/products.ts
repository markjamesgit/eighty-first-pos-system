"use client";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/constants";
import type { Product, ProductFormValues } from "@/lib/types/domain";
import { addAuditEntrySafe } from "./audit-trail";
import { getFirestoreDb } from "./client";

const PRODUCTS_COLLECTION = "products";

function productsCollection() {
  return collection(getFirestoreDb(), PRODUCTS_COLLECTION);
}

function cleanUndefined<T extends object>(obj: T): T {
  const result = { ...obj };
  Object.keys(result).forEach((key) => {
    if ((result as any)[key] === undefined) {
      delete (result as any)[key];
    }
  });
  return result;
}

function mapProduct(
  snapshot: Awaited<ReturnType<typeof getDocs>>["docs"][number],
): Product {
  const data = snapshot.data() as Record<string, unknown>;

  return {
    id: snapshot.id,
    name: String(data.name ?? ""),
    nameLowercase: String(data.nameLowercase ?? ""),
    category: String(data.category ?? ""),
    maintenanceLinkType: (data.maintenanceLinkType as Product["maintenanceLinkType"]) || undefined,
    maintenanceLinkIds: Array.isArray(data.maintenanceLinkIds) ? data.maintenanceLinkIds.map(String) : undefined,
    description: data.description ? String(data.description) : undefined,
    price: Number(data.price ?? 0),
    discount: data.discount !== undefined ? Number(data.discount) : undefined,
    imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
    isActive: Boolean(data.isActive),
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

async function assertUniqueProductName(name: string, currentId?: string) {
  const normalized = name.trim().toLowerCase();
  const snapshot = await getDocs(
    query(productsCollection(), where("nameLowercase", "==", normalized), limit(1)),
  );

  const duplicate = snapshot.docs.find((item) => item.id !== currentId);
  if (duplicate) {
    throw new Error("A product with that name already exists.");
  }
}

export async function listProducts() {
  const snapshot = await getDocs(
    query(productsCollection(), orderBy("category"), orderBy("nameLowercase")),
  );

  return snapshot.docs.map(mapProduct);
}

export function subscribeToProducts(callback: (products: Product[]) => void): Unsubscribe {
  return onSnapshot(
    query(productsCollection(), orderBy("category"), orderBy("nameLowercase")),
    (snapshot) => {
      callback(snapshot.docs.map(mapProduct));
    },
  );
}

export async function getProductById(id: string) {
  const firestore = getFirestoreDb();
  const snapshot = await getDoc(doc(firestore, PRODUCTS_COLLECTION, id));
  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<Product, "id">),
    createdAt: snapshot.data().createdAt?.toDate?.(),
    updatedAt: snapshot.data().updatedAt?.toDate?.(),
  } satisfies Product;
}

export async function createProduct(values: ProductFormValues) {
  await assertUniqueProductName(values.name);

  const cleaned = cleanUndefined({
    ...values,
    name: values.name.trim(),
    nameLowercase: values.name.trim().toLowerCase(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await addDoc(productsCollection(), cleaned);

  await addAuditEntrySafe({
    module: "Products",
    action: "create",
    description: `Created product ${values.name.trim()}`,
    performedBy: "admin",
  });
}

export async function updateProduct(id: string, values: ProductFormValues) {
  const firestore = getFirestoreDb();
  await assertUniqueProductName(values.name, id);

  const cleaned = cleanUndefined({
    ...values,
    name: values.name.trim(),
    nameLowercase: values.name.trim().toLowerCase(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(firestore, PRODUCTS_COLLECTION, id), cleaned);

  await addAuditEntrySafe({
    module: "Products",
    action: "update",
    description: `Updated product ${values.name.trim()}`,
    performedBy: "admin",
  });
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(getFirestoreDb(), PRODUCTS_COLLECTION, id));
  await addAuditEntrySafe({
    module: "Products",
    action: "delete",
    description: `Deleted product ID ${id}`,
    performedBy: "admin",
  });
}

export async function seedDemoProducts(products: ProductFormValues[]) {
  const firestore = getFirestoreDb();
  const batch = writeBatch(firestore);
  products.forEach((product) => {
    const ref = doc(productsCollection());
    batch.set(ref, {
      ...product,
      nameLowercase: product.name.trim().toLowerCase(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}
