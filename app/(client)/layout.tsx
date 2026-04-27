"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROLES } from "@/constants/roles";
import { useClient } from "@/hooks/useClient";
import { useRole } from "@/hooks/useRole";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { role, loading: roleLoading } = useRole();
  const { clientId, loading: clientLoading } = useClient();
  const router = useRouter();

  useEffect(() => {
    if (!roleLoading && role === ROLES.SUPER_ADMIN) {
      router.replace("/super-admin/dashboard");
    }
  }, [roleLoading, role, router]);

  if (roleLoading || clientLoading) return <div className="p-6 text-sm text-stone-500">Loading...</div>;
  if (!clientId) return <div className="p-6 text-sm text-red-600">No tenant context found.</div>;

  return <div className="p-6">{children}</div>;
}
