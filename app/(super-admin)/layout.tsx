"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROLES } from "@/constants/roles";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";

import { SuperAdminShell } from "@/components/layout/super-admin-shell";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { role, loading } = useRole();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const bootstrapEmail = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ?? "saojttrk.2025@gmail.com").toLowerCase();
  const isBootstrapEmail = (user?.email ?? "").toLowerCase() === bootstrapEmail;
  const canAccess = role === ROLES.SUPER_ADMIN || isBootstrapEmail;

  useEffect(() => {
    if (!loading && !authLoading && !canAccess) {
      router.replace("/login");
    }
  }, [authLoading, canAccess, loading, router]);

  if (loading || authLoading) return <div className="p-6 text-sm text-stone-500">Loading...</div>;
  if (!canAccess) return null;

  return <SuperAdminShell>{children}</SuperAdminShell>;
}

