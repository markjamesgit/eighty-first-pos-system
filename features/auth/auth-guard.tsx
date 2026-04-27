"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoadingState } from "@/components/shared/loading-state";
import { useAuthStore } from "@/store/auth-store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const redirectingRef = useRef(false);
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user && pathname !== "/login") {
      if (!redirectingRef.current) {
        redirectingRef.current = true;
        router.replace("/login");
      }
      return;
    }

    if (user && pathname === "/login") {
      if (!redirectingRef.current) {
        redirectingRef.current = true;
        if (user.role === "super_admin") {
          router.replace("/super-admin/dashboard");
        } else {
          router.replace("/dashboard");
        }
      }
      return;
    }

    // Protect regular routes from Super Admin (unless masquerading)
    if (user && user.role === "super_admin" && !pathname.startsWith("/super-admin") && !user.masqueradeClientId) {
      if (!redirectingRef.current) {
        redirectingRef.current = true;
        router.replace("/super-admin/dashboard");
      }
      return;
    }

    redirectingRef.current = false;
  }, [loading, pathname, router, user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <LoadingState title="Checking your session" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Prevent rendering children if we are about to redirect a Super Admin to their dashboard
  if (user.role === "super_admin" && !pathname.startsWith("/super-admin") && !user.masqueradeClientId) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <LoadingState title="Redirecting to Super Admin Console..." />
      </div>
    );
  }

  // Prevent rendering children if a regular user is on the login page (about to be redirected)
  if (pathname === "/login") {
    return null;
  }

  return <>{children}</>;
}
