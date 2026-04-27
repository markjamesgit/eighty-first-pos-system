import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { ROLES, type Role } from "@/constants/roles";
import type { AuthContext } from "@/lib/firebase/auth";
import { getFirebaseAdminDb, setUserRoleClaims, getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { updateClientUsage } from "./clientService";

function ensureSuperAdmin(actor: AuthContext) {
  if (actor.role !== ROLES.SUPER_ADMIN) {
    throw new Error("Forbidden: super_admin required.");
  }
}

export async function assignUserRole(
  actor: AuthContext,
  payload: {
    uid: string;
    email: string;
    role: Exclude<Role, "super_admin">;
    clientId: string;
  },
) {
  ensureSuperAdmin(actor);

  await setUserRoleClaims(payload.uid, payload.role, payload.clientId);

  await getFirebaseAdminDb().collection(COLLECTIONS.USERS).doc(payload.uid).set(
    {
      uid: payload.uid,
      email: payload.email,
      role: payload.role,
      clientId: payload.clientId,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  // Track usage
  await updateClientUsage(payload.clientId, "user_created");
}

export async function bootstrapSuperAdmin(actor: AuthContext) {
  const allowedEmail = (process.env.SUPER_ADMIN_EMAIL || process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "saojttrk.2025@gmail.com").toLowerCase();
  const actorEmail = actor.email?.toLowerCase();

  if (!actorEmail || actorEmail !== allowedEmail) {
    throw new Error("Forbidden: this account is not allowed for super admin bootstrap.");
  }

  await setUserRoleClaims(actor.uid, ROLES.SUPER_ADMIN, null);

  await getFirebaseAdminDb().collection(COLLECTIONS.USERS).doc(actor.uid).set(
    {
      uid: actor.uid,
      email: actor.email ?? "",
      role: ROLES.SUPER_ADMIN,
      clientId: null,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function createClientAdmin(
  actor: AuthContext,
  payload: {
    email: string;
    password: string;
    clientId: string;
  }
) {
  ensureSuperAdmin(actor);

  // 1. Create Firebase Auth User
  const userRecord = await getFirebaseAdminAuth().createUser({
    email: payload.email,
    password: payload.password,
    emailVerified: true,
  });

  // 2. Set Claims & Sync to DB
  await assignUserRole(actor, {
    uid: userRecord.uid,
    email: userRecord.email!,
    role: ROLES.CLIENT_ADMIN,
    clientId: payload.clientId,
  });

  // Track usage
  await updateClientUsage(payload.clientId, "user_created");

  return userRecord;
}

export async function searchUsers(actor: AuthContext, query: string) {
  ensureSuperAdmin(actor);

  if (!query || query.length < 2) return [];

  const snapshot = await getFirebaseAdminDb()
    .collection(COLLECTIONS.USERS)
    .where("email", ">=", query.toLowerCase())
    .where("email", "<=", query.toLowerCase() + "\uf8ff")
    .limit(5)
    .get();

  return snapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  }));
}
