import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { ROLES } from "@/constants/roles";
import { getFirebaseClientDb } from "@/lib/firebase/client";
import { setUserRoleClaims } from "@/lib/firebase/admin";
import type { AppUser } from "@/types/user";

export async function upsertUserProfile(user: AppUser) {
  const db = getFirebaseClientDb();
  await setDoc(
    doc(db, COLLECTIONS.USERS, user.uid),
    {
      ...user,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function assignClientAdmin(uid: string, email: string, clientId: string) {
  await setUserRoleClaims(uid, ROLES.CLIENT_ADMIN, clientId);
  await upsertUserProfile({
    uid,
    email,
    role: ROLES.CLIENT_ADMIN,
    clientId,
  });
}

export async function getUserByUid(uid: string) {
  const db = getFirebaseClientDb();
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...(snap.data() as Omit<AppUser, "uid">) };
}
