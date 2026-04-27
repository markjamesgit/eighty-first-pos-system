import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { ROLES, type Role } from "@/constants/roles";

export interface AuthContext {
  uid: string;
  email?: string;
  role: Role;
  clientId: string | null;
}

export async function verifyBearerToken(authHeader: string | null): Promise<AuthContext | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return null;
  }

  const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
  return mapDecodedToken(decoded);
}

export function mapDecodedToken(decoded: DecodedIdToken): AuthContext {
  const role = (decoded.role as Role | undefined) ?? ROLES.CASHIER;
  const clientId = (decoded.clientId as string | undefined) ?? null;

  return {
    uid: decoded.uid,
    email: decoded.email,
    role,
    clientId,
  };
}
