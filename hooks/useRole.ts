"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/constants/roles";
import { ROLES } from "@/constants/roles";
import { useAuth } from "@/hooks/useAuth";

export function useRole() {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<Role>(ROLES.CASHIER);

  useEffect(() => {
    async function syncClaims() {
      if (!user) {
        setRole(ROLES.CASHIER);
        return;
      }

      const token = await user.getIdTokenResult();
      setRole((token.claims.role as Role | undefined) ?? ROLES.CASHIER);
    }

    void syncClaims();
  }, [user]);

  return { role, loading };
}
