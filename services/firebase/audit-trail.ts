"use client";

import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import type { AuditTrailEntry } from "@/lib/types/domain";
import { getFirestoreDb } from "./client";
import { cleanUndefined } from "@/lib/utils";

const AUDIT_TRAIL_COLLECTION = "audit_trail";

function mapAuditEntry(
  snapshot: Awaited<ReturnType<typeof getDocs>>["docs"][number],
): AuditTrailEntry {
  const data = snapshot.data() as Record<string, unknown>;
  return {
    id: snapshot.id,
    module: String(data.module ?? ""),
    action: String(data.action ?? ""),
    description: String(data.description ?? ""),
    performedBy: String(data.performedBy ?? "admin"),
    clientId: String(data.clientId ?? ""),
    createdAt:

      data.createdAt && typeof data.createdAt === "object" && "toDate" in data.createdAt
        ? (data.createdAt as { toDate: () => Date }).toDate()
        : undefined,
  };
}

export async function addAuditEntry(input: Omit<AuditTrailEntry, "id" | "createdAt">) {
  await addDoc(collection(getFirestoreDb(), AUDIT_TRAIL_COLLECTION), cleanUndefined({
    ...input,
    createdAt: serverTimestamp(),
  }));
}

export async function addAuditEntrySafe(input: Omit<AuditTrailEntry, "id" | "createdAt">) {
  try {
    await addAuditEntry(input);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Missing or insufficient permissions")) {
      return;
    }
    throw error;
  }
}

export async function listAuditTrail(clientId: string, limitCount = 300) {
  const snapshot = await getDocs(
    query(
      collection(getFirestoreDb(), AUDIT_TRAIL_COLLECTION),
      where("clientId", "==", clientId),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    ),
  );

  return snapshot.docs.map(mapAuditEntry);
}
