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
        router.replace("/dashboard");
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

  return <>{children}</>;
}
