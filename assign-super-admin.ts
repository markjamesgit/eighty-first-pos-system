import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const serviceAccount = {
  project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
} as any;

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

async function run() {
  const email = "saojttrk.2025@gmail.com";
  try {
    const userRecord = await getAuth().getUserByEmail(email);
    console.log("User found:", userRecord.uid);
    
    await getAuth().setCustomUserClaims(userRecord.uid, {
      role: "super_admin",
      clientId: null,
    });
    console.log("Custom claims set successfully.");
    
    const db = getFirestore();
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      role: "super_admin",
      clientId: null,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    
    console.log("User document updated in Firestore.");
  } catch (error) {
    console.error("Error setting custom claims:", error);
  }
}

run();
