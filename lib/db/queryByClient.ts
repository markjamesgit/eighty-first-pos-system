import {
  collection,
  getDocs,
  query,
  where,
  type DocumentData,
  type Firestore,
} from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";

export async function queryByClient<T extends DocumentData>(
  db: Firestore,
  collectionName: keyof typeof COLLECTIONS,
  clientId: string,
) {
  const ref = collection(db, COLLECTIONS[collectionName]);
  const scopedQuery = query(ref, where("clientId", "==", clientId));
  const snapshot = await getDocs(scopedQuery);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as T),
  }));
}
