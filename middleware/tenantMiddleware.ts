import { ROLES } from "@/constants/roles";
import type { AuthContext } from "@/lib/firebase/auth";
import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { validateTenant } from "@/lib/tenant/validateTenant";

export function tenantMiddleware(
  auth: AuthContext,
  requestedClientId?: string | null,
  allowedRoles?: string[],
) {
  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    throw new Error("Forbidden role.");
  }

  const resolvedClientId = resolveTenant(auth, requestedClientId);
  if (!validateTenant(auth, resolvedClientId)) {
    throw new Error("Forbidden tenant access.");
  }

  if (auth.role !== ROLES.SUPER_ADMIN && !resolvedClientId) {
    throw new Error("Client tenant is required.");
  }

  return resolvedClientId;
}
