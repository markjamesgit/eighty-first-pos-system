"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { useAuthStore } from "@/store/auth-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const unsubscribe = useAuthStore.getState().initialize();
    return () => unsubscribe?.();
  }, []);

  return (
    <>
      {children}
      <Toaster richColors position="top-right" />
    </>
  );
}
