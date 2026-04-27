"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useClient() {
  const { user, loading } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    async function syncClaims() {
      if (!user) {
        setClientId(null);
        return;
      }

      const token = await user.getIdTokenResult();
      setClientId((token.claims.clientId as string | undefined) ?? null);
    }

    void syncClaims();
  }, [user]);

  return { clientId, loading };
}
