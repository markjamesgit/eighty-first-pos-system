"use client";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import type { AppUser } from "@/lib/types/domain";
import { addAuditEntrySafe } from "./audit-trail";
import { ensureAuthPersistence, getFirebaseAuth, getFirestoreDb } from "./client";

const USERS_COLLECTION = "users";

export async function loginAdmin(email: string, password: string) {
  await ensureAuthPersistence();

  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);

  // Fetch client ID for audit logging
  const profile = await getCurrentAdminProfile(credential.user.uid);
  const clientId = profile?.clientId;

  await addAuditEntrySafe({
    clientId: clientId || "system",
    module: "Auth",
    action: "login",
    description: `User logged in: ${credential.user.email ?? email}`,
    performedBy: credential.user.email ?? email,
  });


  return credential.user;
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function resetAdminPassword(email: string) {
  if (!email) throw new Error("Email address is required.");
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function getCurrentAdminProfile(uid: string): Promise<AppUser | null> {
  const firestore = getFirestoreDb();
  const snapshot = await getDoc(doc(firestore, USERS_COLLECTION, uid));

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  return {
    uid,
    email: data.email ?? "",
    displayName: data.displayName ?? "Admin",
    role: data.role ?? "admin",
    createdAt: data.createdAt?.toDate?.(),
    lastLoginAt: data.lastLoginAt?.toDate?.(),
  };
}

export async function logoutAdmin() {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  const email = user?.email ?? "admin";
  
  // We need to try and get the clientId before they sign out
  // This is best effort - usually it's in the auth store, but since we're in a service,
  // we'll try to peek it from the user profile if possible, or just log it without clientId.
  // Actually, we can just log it. If clientId is missing, it won't show in tenant logs but will be in global.
  
  await signOut(auth);
  await addAuditEntrySafe({
    clientId: "system",
    module: "Auth",
    action: "logout",
    description: `User logged out: ${email}`,
    performedBy: email,
  });
}

