import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { ROLES } from "@/constants/roles";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import type { AuthContext } from "@/lib/firebase/auth";
import type { Client, ClientStatus, ClientUsage, SystemAuditLog } from "@/lib/types/domain";

export type ActionType = "product_created" | "product_deleted" | "transaction_created" | "user_created" | "user_deleted" | "heartbeat";


function ensureSuperAdmin(actor: AuthContext) {
  if (actor.role !== ROLES.SUPER_ADMIN) {
    throw new Error("Forbidden: super_admin required.");
  }
}

async function logAudit(
  actor: AuthContext | null,
  clientId: string,
  action: string,
  entity: string,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  const db = getFirebaseAdminDb();
  await db.collection(COLLECTIONS.AUDIT_LOGS).add({
    clientId,
    userId: actor?.uid || "system",
    action,
    entity,
    entityId,
    metadata,
    timestamp: FieldValue.serverTimestamp(),
  });
}

export async function createClient(actor: AuthContext, name: string) {
  ensureSuperAdmin(actor);
  const db = getFirebaseAdminDb();
  
  const clientRef = await db.collection(COLLECTIONS.CLIENTS).add({
    name: name.trim(),
    status: "active",
    createdBy: actor.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection(COLLECTIONS.CLIENT_USAGE).doc(clientRef.id).set({
    clientId: clientRef.id,
    totalProducts: 0,
    totalTransactions: 0,
    totalUsers: 0,
    createdAt: FieldValue.serverTimestamp(),
    lastActiveAt: FieldValue.serverTimestamp(),
  });

  await logAudit(actor, clientRef.id, "create", "client", clientRef.id);
  return clientRef.id;
}

export async function getAllClients(actor: AuthContext) {
  ensureSuperAdmin(actor);
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTIONS.CLIENTS).orderBy("createdAt", "desc").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
}

export async function getClientById(actor: AuthContext, clientId: string) {
  ensureSuperAdmin(actor);
  const db = getFirebaseAdminDb();
  const doc = await db.collection(COLLECTIONS.CLIENTS).doc(clientId).get();
  if (!doc.exists) throw new Error("Client not found");
  return { id: doc.id, ...doc.data() } as Client;
}

export async function updateClient(actor: AuthContext, clientId: string, name: string) {
  ensureSuperAdmin(actor);
  const db = getFirebaseAdminDb();
  await db.collection(COLLECTIONS.CLIENTS).doc(clientId).update({
    name: name.trim(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await logAudit(actor, clientId, "update", "client", clientId, { name });
}

export async function toggleClientStatus(actor: AuthContext, clientId: string, status: ClientStatus) {
  ensureSuperAdmin(actor);
  const db = getFirebaseAdminDb();
  await db.collection(COLLECTIONS.CLIENTS).doc(clientId).update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await logAudit(actor, clientId, "update_status", "client", clientId, { status });
}

export async function getClientUsage(actor: AuthContext, clientId: string) {
  ensureSuperAdmin(actor);
  const db = getFirebaseAdminDb();
  const doc = await db.collection(COLLECTIONS.CLIENT_USAGE).doc(clientId).get();
  if (!doc.exists) return null;
  return doc.data() as ClientUsage;
}

export async function updateClientUsage(clientId: string, actionType: ActionType) {
  if (!clientId) return;
  const db = getFirebaseAdminDb();
  const usageRef = db.collection(COLLECTIONS.CLIENT_USAGE).doc(clientId);
  
  const updates: Record<string, unknown> = {
    lastActiveAt: FieldValue.serverTimestamp(),
  };

  switch (actionType) {
    case "product_created":
      updates.totalProducts = FieldValue.increment(1);
      break;
    case "product_deleted":
      updates.totalProducts = FieldValue.increment(-1);
      break;
    case "transaction_created":
      updates.totalTransactions = FieldValue.increment(1);
      break;
    case "user_created":
      updates.totalUsers = FieldValue.increment(1);
      break;
    case "user_deleted":
      updates.totalUsers = FieldValue.increment(-1);
      break;
  }

  await usageRef.set(updates, { merge: true });
}

export async function resetClientUsage(clientId: string) {
  if (!clientId) return;
  const db = getFirebaseAdminDb();
  const usageRef = db.collection(COLLECTIONS.CLIENT_USAGE).doc(clientId);
  
  await usageRef.set({
    totalProducts: 0,
    totalTransactions: 0,
    totalUsers: 0,
    lastActiveAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function getTopClientsByUsage(actor: AuthContext, limit: number = 5) {
  ensureSuperAdmin(actor);
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTIONS.CLIENT_USAGE)
    .orderBy("totalTransactions", "desc")
    .limit(limit)
    .get();
  return snapshot.docs.map(doc => doc.data() as ClientUsage);
}

export async function getAuditLogs(actor: AuthContext, filters?: { clientId?: string; action?: string; limit?: number }) {
  ensureSuperAdmin(actor);
  const db = getFirebaseAdminDb();
  let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.AUDIT_LOGS);
  
  if (filters?.clientId) {
    query = query.where("clientId", "==", filters.clientId);
  }
  if (filters?.action) {
    query = query.where("action", "==", filters.action);
  }
  
  query = query.orderBy("timestamp", "desc");
  
  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(100);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemAuditLog));
}
