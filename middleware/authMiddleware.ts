import { verifyBearerToken } from "@/lib/firebase/auth";

export async function authMiddleware(authHeader: string | null) {
  const auth = await verifyBearerToken(authHeader);

  if (!auth) {
    throw new Error("Unauthorized.");
  }

  return auth;
}
