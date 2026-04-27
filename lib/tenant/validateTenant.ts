import { ROLES } from "@/constants/roles";
import type { AuthContext } from "@/lib/firebase/auth";

export function validateTenant(auth: AuthContext, clientId: string | null) {
  if (auth.role === ROLES.SUPER_ADMIN) {
    return true;
  }

  if (!clientId || !auth.clientId) {
    return false;
  }

  return auth.clientId === clientId;
}
