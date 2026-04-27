"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { subscribeToAdminConfig, type AdminSystemConfig, DEFAULT_CONFIG } from "@/services/firebase/admin-config";

export function ThemeSync() {
  const user = useAuthStore(state => state.user);
  const [config, setConfig] = useState<AdminSystemConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const isMasquerading = user?.role === "super_admin" && !!user.masqueradeClientId;
    const isRegularAdmin = (user?.role === "admin" || user?.role === "client_admin" || user?.role === "cashier") && !!user.clientId;
    const shouldConnect = isMasquerading || isRegularAdmin;

    if (!shouldConnect) return;

    const effectiveClientId = user?.masqueradeClientId || user?.clientId;
    if (!effectiveClientId) return;

    return subscribeToAdminConfig(effectiveClientId, (newConfig) => {
      setConfig({ ...DEFAULT_CONFIG, ...newConfig });
    });
  }, [user]);

  return (
    <style dangerouslySetInnerHTML={{
      __html: `
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800;900&family=Merriweather:wght@400;700;900&family=Outfit:wght@400;500;600;700;800;900&family=Roboto:wght@400;500;700;900&display=swap');

        :root {
          --sys-primary: ${config.primaryColor};
          --sys-font: ${config.fontFamily};
        }
        
        body, button, input, select, textarea {
          font-family: var(--sys-font) !important;
        }

        .bg-stone-900, .bg-stone-950, .data-\\[state\\=active\\]\\:bg-stone-900[data-state="active"] {
          background-color: var(--sys-primary) !important;
        }
        
        .text-stone-900, .text-stone-950 {
          color: var(--sys-primary) !important;
        }

        .border-stone-900, .border-stone-950, .focus\\:ring-stone-900:focus, .focus-visible\\:ring-stone-950:focus-visible {
          border-color: var(--sys-primary) !important;
          --tw-ring-color: var(--sys-primary) !important;
        }

        .hover\\:bg-stone-800:hover, .hover\\:bg-stone-900:hover {
          background-color: color-mix(in srgb, var(--sys-primary) 85%, black) !important;
        }
      `
    }} />
  );
}
