import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { getFirestoreDb } from "./client";

export type AdminSystemConfig = {
  shopName: string;
  adminName: string;
  secondaryPin: string;
  primaryColor: string;
  fontFamily: string;
  logoUrl: string;
};

const CONFIG_COLLECTION = "admin_config";

export const DEFAULT_CONFIG: AdminSystemConfig = {
  shopName: "Eighty First POS",
  adminName: "System Administrator",
  secondaryPin: "",
  primaryColor: "#1c1917", // stone-900
  fontFamily: "Inter, sans-serif",
  logoUrl: "",
};

export async function getAdminConfig(clientId: string): Promise<AdminSystemConfig> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, CONFIG_COLLECTION, clientId));
  if (snap.exists()) return snap.data() as AdminSystemConfig;
  return DEFAULT_CONFIG;
}

export async function saveAdminConfig(clientId: string, config: Partial<AdminSystemConfig>): Promise<void> {
  const db = getFirestoreDb();
  await setDoc(doc(db, CONFIG_COLLECTION, clientId), config, { merge: true });
}

export function subscribeToAdminConfig(clientId: string, callback: (config: AdminSystemConfig) => void) {
  const db = getFirestoreDb();
  return onSnapshot(doc(db, CONFIG_COLLECTION, clientId), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as AdminSystemConfig);
    } else {
      callback(DEFAULT_CONFIG);
    }
  }, (error) => {
    console.error("Firestore [AdminConfig] Subscription Error:", error);
  });
}
