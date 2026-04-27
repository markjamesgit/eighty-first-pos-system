import { addDoc, collection, serverTimestamp, type DocumentData, type Firestore } from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";

export async function writeWithClient<T extends DocumentData>(
  db: Firestore,
  collectionName: keyof typeof COLLECTIONS,
  data: T,
  clientId: string,
) {
  return addDoc(collection(db, COLLECTIONS[collectionName]), {
    ...data,
    clientId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
