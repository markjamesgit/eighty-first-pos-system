"use client";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  setDoc,
  doc,
  addDoc,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreDb } from "./client";
import type { AlertLevel, AlertRecord } from "@/lib/types/domain";

export type SystemAlert = {
  id: string;
  module: string;
  level: AlertLevel;
  message: string;
  createdAt: Date;
  updatedAt: Date;
};

export function subscribeToAlerts(
  callback: (alerts: SystemAlert[]) => void,
  count = 10,
): Unsubscribe {
  const firestore = getFirestoreDb();
  return onSnapshot(
    query(
      collection(firestore, "alerts"),
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
          createdAt: d.data().createdAt?.toDate?.() || new Date(),
          updatedAt: d.data().updatedAt?.toDate?.() || new Date(),
        })),
      );
    },
  );
}

export async function syncAlertRecordsSafe(alerts: AlertRecord[]) {
  const firestore = getFirestoreDb();
  const alertsCol = collection(firestore, "alerts");

  for (const alert of alerts) {
    const alertDoc = doc(alertsCol, alert.id);
    await setDoc(alertDoc, {
      ...alert,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(), // Firestore set with merge/doc ID usually behaves like this
    }, { merge: true });
  }
}

export async function queueAlertEmailSafe(payload: {
  recipientEmail: string;
  subject: string;
  message: string;
}) {
  const firestore = getFirestoreDb();
  const normalizedEmail = payload.recipientEmail.trim();
  if (!normalizedEmail) {
    throw new Error("Recipient email is required.");
  }

  // Firebase "Trigger Email" extension default payload.
  await addDoc(collection(firestore, "mail"), {
    to: [normalizedEmail],
    message: {
      subject: payload.subject,
      text: payload.message,
    },
    createdAt: serverTimestamp(),
  });
}
