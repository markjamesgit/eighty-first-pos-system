import type { AuthContext } from "@/lib/firebase/auth";
import { ROLES } from "@/constants/roles";

export function getClientId(auth: AuthContext): string | null {
  if (auth.role === ROLES.SUPER_ADMIN) {
    return null;
  }

  return auth.clientId;
}
