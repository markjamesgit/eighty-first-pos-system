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

const CONFIG_DOC = "admin/config";

export const DEFAULT_CONFIG: AdminSystemConfig = {
  shopName: "Eighty First POS",
  adminName: "System Administrator",
  secondaryPin: "",
  primaryColor: "#1c1917", // stone-900
  fontFamily: "Inter, sans-serif",
  logoUrl: "",
};

export async function getAdminConfig(): Promise<AdminSystemConfig> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, CONFIG_DOC));
  if (snap.exists()) return snap.data() as AdminSystemConfig;
  return DEFAULT_CONFIG;
}

export async function saveAdminConfig(config: Partial<AdminSystemConfig>): Promise<void> {
  const db = getFirestoreDb();
  await setDoc(doc(db, CONFIG_DOC), config, { merge: true });
}

export function subscribeToAdminConfig(callback: (config: AdminSystemConfig) => void) {
  const db = getFirestoreDb();
  return onSnapshot(doc(db, CONFIG_DOC), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as AdminSystemConfig);
    } else {
      callback(DEFAULT_CONFIG);
    }
  });
}
