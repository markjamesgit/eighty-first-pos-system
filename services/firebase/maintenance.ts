"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirestoreDb } from "./client";

export type MaintenanceSection = "categories" | "variants" | "addons" | "modifiers";

type MaintenanceItem = {
  id: string;
  name: string;
  imageUrl?: string;
  description?: string;
  price: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

const sectionToCollection: Record<MaintenanceSection, string> = {
  categories: "maintenance_categories",
  variants: "maintenance_variants",
  addons: "maintenance_addons",
  modifiers: "maintenance_modifiers",
};

function getSectionCollection(section: MaintenanceSection) {
  return sectionToCollection[section];
}

function mapMaintenanceItem(
  snapshot: Awaited<ReturnType<typeof getDocs>>["docs"][number],
): MaintenanceItem {
  const data = snapshot.data() as Record<string, unknown>;
  return {
    id: snapshot.id,
    name: String(data.name ?? ""),
    imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
    description: data.description ? String(data.description) : undefined,
    price: Number(data.price ?? 0),
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

export async function listMaintenanceItems(clientId: string, section: MaintenanceSection) {
  const snapshot = await getDocs(
    query(
      collection(getFirestoreDb(), getSectionCollection(section)),
      where("clientId", "==", clientId),
      orderBy("name")
    ),
  );
  return snapshot.docs.map(mapMaintenanceItem);
}

export async function createMaintenanceItem(
  clientId: string,
  section: MaintenanceSection,
  input: {
  name: string;
  imageUrl?: string;
  description?: string;
  price?: number;
  isActive?: boolean;
},
) {
  await addDoc(collection(getFirestoreDb(), getSectionCollection(section)), {
    ...input,
    clientId,
    name: input.name.trim(),
    imageUrl: input.imageUrl?.trim() || "",
    description: input.description?.trim() || "",
    price: Number(input.price ?? 0),
    isActive: input.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateMaintenanceItem(
  section: MaintenanceSection,
  id: string,
  input: { name: string; imageUrl?: string; description?: string; price?: number; isActive?: boolean },
) {
  await updateDoc(doc(getFirestoreDb(), getSectionCollection(section), id), {
    ...input,
    name: input.name.trim(),
    imageUrl: input.imageUrl?.trim() || "",
    description: input.description?.trim() || "",
    price: Number(input.price ?? 0),
    isActive: input.isActive ?? true,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMaintenanceItem(section: MaintenanceSection, id: string) {
  await deleteDoc(doc(getFirestoreDb(), getSectionCollection(section), id));
}
