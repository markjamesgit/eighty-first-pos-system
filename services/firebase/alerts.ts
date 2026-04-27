"use client";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "./client";
import type { AlertLevel, AlertRecord } from "@/lib/types/domain";

export type SystemAlert = {
  id: string;
  module: string;
  level: AlertLevel;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function subscribeToAlerts(
  clientId: string,
  callback: (alerts: SystemAlert[]) => void,
  count = 10,
): Unsubscribe {
  const firestore = getFirestoreDb();
  return onSnapshot(
    query(
      collection(firestore, "alerts"),
      where("clientId", "==", clientId),
      orderBy("createdAt", "desc"),
      limit(count),
    ),
    (snapshot) => {
      callback(
        snapshot.docs.map((d) => ({
          id: d.id,
          module: d.data().module,
          level: d.data().level,
          message: d.data().message,
          isRead: d.data().isRead || false,
          createdAt: d.data().createdAt?.toDate?.() || new Date(),
          updatedAt: d.data().updatedAt?.toDate?.() || new Date(),
        })),
      );
    },
    (error) => {
      console.error("Firestore [Alerts] Subscription Error:", error);
    }
  );
}

export async function syncAlertRecordsSafe(clientId: string, alerts: AlertRecord[]) {
  const firestore = getFirestoreDb();
  const alertsCol = collection(firestore, "alerts");
  const batch = writeBatch(firestore);

  // Run all reads in parallel
  const docSnaps = await Promise.all(
    alerts.map((alert) => getDoc(doc(alertsCol, alert.id)))
  );

  alerts.forEach((alert, index) => {
    const docSnap = docSnaps[index];
    const alertDoc = doc(alertsCol, alert.id);

    const isNew = !docSnap.exists();
    const existingData = isNew ? null : docSnap.data();

    if (isNew && (alert.level === "good" || alert.level === "informational")) {
      return; // Skip creating a fresh green alert out of nowhere. Only use green alerts to resolve existing red/yellow ones.
    }

    const needsUpdate =
      isNew ||
      existingData?.message !== alert.message ||
      existingData?.level !== alert.level;

    if (needsUpdate) {
      batch.set(
        alertDoc,
        {
          ...alert,
          clientId,
          isRead: false,
          updatedAt: serverTimestamp(),
          ...(isNew ? { createdAt: serverTimestamp() } : {}),
        },
        { merge: true },
      );
    }
  });

  await batch.commit();
}

export async function markAlertsAsRead(alertIds: string[]) {
  if (!alertIds.length) return;
  const firestore = getFirestoreDb();
  const batch = writeBatch(firestore);
  const alertsCol = collection(firestore, "alerts");

  for (const id of alertIds) {
    batch.update(doc(alertsCol, id), { isRead: true });
  }

  await batch.commit();
}

export async function wipeAllAlerts(clientId: string) {
  const firestore = getFirestoreDb();
  const alertsCol = collection(firestore, "alerts");
  const snapshot = await getDocs(query(alertsCol, where("clientId", "==", clientId)));
  
  if (snapshot.empty) return;

  const batch = writeBatch(firestore);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}


