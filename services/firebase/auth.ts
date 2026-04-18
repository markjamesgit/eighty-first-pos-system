"use client";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { AppUser } from "@/lib/types/domain";
import { addAuditEntrySafe } from "./audit-trail";
import { ensureAuthPersistence, getFirebaseAuth, getFirestoreDb } from "./client";

const USERS_COLLECTION = "users";

export async function loginAdmin(email: string, password: string) {
  await ensureAuthPersistence();

  const auth = getFirebaseAuth();
  const firestore = getFirestoreDb();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = doc(collection(firestore, USERS_COLLECTION), credential.user.uid);
  const existing = await getDoc(userDoc);

  if (existing.exists()) {
    await updateDoc(userDoc, {
      lastLoginAt: serverTimestamp(),
    });
  } else {
    await setDoc(userDoc, {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.email?.split("@")[0] ?? "Admin",
      role: "admin",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  }

  await addAuditEntrySafe({
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
  const email = auth.currentUser?.email ?? "admin";
  await signOut(auth);
  await addAuditEntrySafe({
    module: "Auth",
    action: "logout",
    description: `User logged out: ${email}`,
    performedBy: email,
  });
}
