"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseConfig } from "./config";

let persistenceReady = false;
let firebaseApp: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;

function canInitializeFirebase() {
  return typeof window !== "undefined" && Object.values(firebaseConfig).every(Boolean);
}

function getFirebaseApp() {
  if (!canInitializeFirebase()) {
    throw new Error("Firebase is not configured. Add the required NEXT_PUBLIC_FIREBASE_* values.");
  }

  if (firebaseApp) {
    return firebaseApp;
  }

  firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return firebaseApp;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirestoreDb() {
  if (firestore) {
    return firestore;
  }

  firestore = getFirestore(getFirebaseApp());
  return firestore;
}

export function getFirebaseStorage() {
  if (storage) {
    return storage;
  }

  storage = getStorage(getFirebaseApp());
  return storage;
}

export async function ensureAuthPersistence() {
  if (persistenceReady) {
    return;
  }

  await setPersistence(getFirebaseAuth(), browserLocalPersistence);
  persistenceReady = true;
}
