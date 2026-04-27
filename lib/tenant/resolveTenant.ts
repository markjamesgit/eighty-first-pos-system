import type { AuthContext } from "@/lib/firebase/auth";
import { getClientId } from "@/lib/tenant/getClientId";

export function resolveTenant(auth: AuthContext, requestedClientId?: string | null) {
  const tokenClientId = getClientId(auth);

  if (!requestedClientId) {
    return tokenClientId;
  }

  if (!tokenClientId) {
    return requestedClientId;
  }

  return tokenClientId === requestedClientId ? tokenClientId : null;
}
