"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { subscribeToAlerts, syncAlertRecordsSafe, type SystemAlert } from "@/services/firebase/alerts";
import { subscribeToIngredients } from "@/services/firebase/ingredients";
import { subscribeToActiveOrders } from "@/services/firebase/orders";
import { subscribeToAdminConfig, type AdminSystemConfig, DEFAULT_CONFIG } from "@/services/firebase/admin-config";
import { addAuditEntrySafe } from "@/services/firebase/audit-trail";
import type { AlertRecord, IngredientItem, OrderRecord } from "@/lib/types/domain";
import {
  BarChart3,
  BellRing,
  ClipboardList,
  Coffee,
  FileClock,
  FileSpreadsheet,
  LogOut,
  Package,
  Settings2,
  ShieldCheck,
  Warehouse,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { logoutAdmin } from "@/services/firebase/auth";
import { getAuth } from "firebase/auth";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/pos", label: "POS", icon: Coffee },
  { href: "/products", label: "Products", icon: Package },
  { href: "/recipes", label: "Recipes", icon: ClipboardList },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: FileSpreadsheet },
  { href: "/alerts", label: "Alerts", icon: BellRing },
];

const maintenanceItems = [
  { href: "/maintenance?section=categories", label: "Categories" },
  { href: "/maintenance?section=variants", label: "Variants" },
  { href: "/maintenance?section=addons", label: "Addons" },
  { href: "/maintenance?section=modifiers", label: "Modifiers" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<OrderRecord[]>([]);
  const effectiveClientId = user?.masqueradeClientId || user?.clientId || (user?.role === "super_admin" ? "system" : null);
  const isMasquerading = user?.role === "super_admin" && !!user.masqueradeClientId;
  const isRegularAdmin = (user?.role === "admin" || user?.role === "client_admin" || user?.role === "cashier") && !!user.clientId;
  const shouldConnect = isMasquerading || isRegularAdmin;

  const [tenantName, setTenantName] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldConnect || !effectiveClientId || effectiveClientId === "system") {
      setTenantName(null);
      return;
    }

    import("@/services/firebase/client").then(({ getFirestoreDb }) => {
      import("firebase/firestore").then(({ doc, getDoc }) => {
        const db = getFirestoreDb();
        getDoc(doc(db, "clients", effectiveClientId))
          .then((snap) => {
            if (snap.exists()) {
              setTenantName(snap.data().name || null);
            }
          })
          .catch((err) => {
            console.warn("Tenant name fetch failed (offline or connection issue):", err);
          });
      });
    }).catch(err => console.error("Dynamic import failed:", err));
  }, [effectiveClientId, shouldConnect]);

  useEffect(() => {
    if (!shouldConnect || !effectiveClientId) return;
    return subscribeToAlerts(effectiveClientId, setAlerts, 50);
  }, [user, shouldConnect, effectiveClientId]);

  useEffect(() => {
    if (!shouldConnect || !effectiveClientId) return;
    return subscribeToIngredients(effectiveClientId, (data) => {
      setIngredients(data);
    });
  }, [user, shouldConnect, effectiveClientId]);

  useEffect(() => {
    if (!shouldConnect || !effectiveClientId) return;
    return subscribeToActiveOrders(effectiveClientId, (data) => {
      setActiveOrders(data);
    }, 100);
  }, [user, shouldConnect, effectiveClientId]);

  // Heartbeat to keep tenant "Online"
  useEffect(() => {
    if (!shouldConnect || !effectiveClientId || effectiveClientId === "system") return;

    const sendHeartbeat = async () => {
      try {
        const auth = getAuth();
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return;
        
        const token = await firebaseUser.getIdToken();
        await fetch("/api/usage", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
          },
          body: JSON.stringify({ actionType: "heartbeat" })
        });
      } catch (err) {
        // Silently fail heartbeats
      }
    };

    // Initial heartbeat
    void sendHeartbeat();

    // Every 2 minutes
    const interval = setInterval(sendHeartbeat, 120000);
    return () => clearInterval(interval);
  }, [shouldConnect, effectiveClientId]);

  const [sysConfig, setSysConfig] = useState<AdminSystemConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (!shouldConnect || !effectiveClientId) return;
    return subscribeToAdminConfig(effectiveClientId, setSysConfig);
  }, [user, shouldConnect, effectiveClientId]);

  // Global Alerts Engine
  useEffect(() => {
    if (!shouldConnect) return;
    const activeAlerts: AlertRecord[] = [];

    // Inventory
    if (ingredients.length > 0) {
      ingredients.forEach((item) => {
        const baseId = `inv_alert_${item.id}`;

        if (item.stockQty <= 0) {
          activeAlerts.push({
            id: baseId,
            level: "critical",
            module: "Inventory",
            message: `${item.name} is out of stock.`,
          });
        } else if (item.stockQty <= item.lowStockThreshold) {
          activeAlerts.push({
            id: baseId,
            level: "warning",
            module: "Inventory",
            message: `${item.name} has reached low stock threshold (${item.stockQty} remaining).`,
          });
        } else {
          activeAlerts.push({
            id: baseId,
            level: "good",
            module: "Inventory",
            message: `${item.name} optimal stock restored (${item.stockQty} available).`,
          });
        }
      });
    }

    // Orders
    const pendingOrders = activeOrders.filter(o => o.status === "pending");
    if (pendingOrders.length > 0) {
      activeAlerts.push({
        id: `orders_pending_alert`,
        level: "informational",
        module: "Orders",
        message: `${pendingOrders.length} pending order(s) remain to be fulfilled.`,
      });
    } else if (activeOrders.length >= 0) { // Push a 'good' alert to clear any previous pending alert
      activeAlerts.push({
        id: `orders_pending_alert`,
        level: "good",
        module: "Orders",
        message: `All current orders have been fulfilled.`,
      });
    }

    if (activeAlerts.length > 0 && effectiveClientId) {
      void syncAlertRecordsSafe(effectiveClientId, activeAlerts);
    }
  }, [ingredients, activeOrders]);

  const unreadAlertIds = alerts.filter(a => !a.isRead).map(a => a.id);
  const unreadCount = unreadAlertIds.length;

  // Optional auto-clear on visit - but user requested manual "Mark as Read" UI too,
  // so we won't auto-clear the whole database. We just let the badge react to unreadCount.

  const motifHex = (sysConfig.primaryColor || "#1c1917").replace('#', '');
  const motifR = parseInt(motifHex.substring(0, 2), 16) || 28;
  const motifG = parseInt(motifHex.substring(2, 4), 16) || 25;
  const motifB = parseInt(motifHex.substring(4, 6), 16) || 23;
  const isLightMotif = (motifR * 299 + motifG * 587 + motifB * 114) / 1000 > 128;
  const motifStyle = {
    backgroundColor: sysConfig.primaryColor || "#1c1917",
    color: isLightMotif ? "#1c1917" : "#ffffff",
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <Link href="/profile" style={motifStyle} className="block mb-6 shrink-0 rounded-xl p-4 shadow-sm transition-all hover:shadow-md hover:opacity-90 cursor-pointer group">
        <div className="flex items-center gap-3">
          {sysConfig.logoUrl ? (
            <img src={sysConfig.logoUrl} alt="Logo" className="h-10 w-10 lg:h-12 lg:w-12 rounded-lg object-cover bg-white shrink-0" />
          ) : (
            <div className={`h-10 w-10 lg:h-12 lg:w-12 rounded-lg flex items-center justify-center shrink-0 ${isLightMotif ? 'bg-black/5' : 'bg-white/10'}`}>
              <Coffee className={`h-5 w-5 ${isLightMotif ? 'text-stone-700' : 'text-stone-200'}`} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-90 transition-colors truncate">
              {(sysConfig.shopName === DEFAULT_CONFIG.shopName && tenantName) ? tenantName : sysConfig.shopName}
            </p>
            <h1 className="text-base lg:text-lg font-semibold truncate leading-tight mt-0.5">{sysConfig.adminName || "System Administrator"}</h1>
          </div>
        </div>
        <div className={`mt-4 flex items-center justify-between border-t pt-3 ${isLightMotif ? 'border-black/10' : 'border-white/20'}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-95 transition-colors group-hover:opacity-100">
            View Profile →
          </p>
        </div>
      </Link>
      <nav className="space-y-1.5 flex-1 overflow-y-auto pb-24 pr-2 custom-scrollbar">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950",
                active && "bg-stone-950 text-white hover:bg-stone-900 hover:text-white",
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </div>

              {item.href === "/alerts" && unreadCount > 0 && (
                <span className="flex h-5 items-center justify-center rounded-full bg-red-500 px-2 text-[10px] font-black text-white shadow-sm">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
        <details className="group rounded-lg" open={pathname.includes("/maintenance")}>
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950",
              pathname.includes("/maintenance") && "bg-stone-950 text-white hover:bg-stone-900 hover:text-white",
            )}
          >
            <span className="flex items-center gap-3">
              <Settings2 className="h-4 w-4" />
              Maintenance
            </span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-1 space-y-1 pl-4">
            {maintenanceItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </details>
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 relative">
      {user?.masqueradeClientId && (
        <div className="sticky top-0 z-[100] flex items-center justify-between bg-stone-900 px-4 py-2 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-500 text-stone-900">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider">
              Viewing as <span className="text-amber-400 font-black">
                {(sysConfig.shopName === DEFAULT_CONFIG.shopName && tenantName) ? tenantName : sysConfig.shopName}
              </span>
            </p>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 border-white/20 bg-white/10 text-[10px] font-bold text-white hover:bg-white hover:text-stone-900"
            onClick={() => useAuthStore.getState().setMasquerade(null)}
          >
            Exit Console
          </Button>
        </div>
      )}
      {/* Clean Aesthetic Minimal Background */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#fafaf9] overflow-hidden">
        {/* Soft top gradient sweep */}
        <div className="absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b from-stone-200/40 via-stone-100/10 to-transparent" />

        {/* Organic floating blur orbs for a premium aesthetic vibe */}
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-stone-300/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[45%] h-[50%] bg-amber-100/20 rounded-full blur-[140px]" />
        <div className="absolute -bottom-[20%] left-[10%] w-[50%] h-[50%] bg-orange-50/30 rounded-full blur-[120px]" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col lg:grid lg:grid-cols-[230px_1fr] xl:grid-cols-[250px_1fr]">
        <aside className="sticky top-0 hidden h-[100dvh] flex-col border-r border-stone-200 bg-white p-4 lg:flex shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] z-10 transition-all">
          {sidebarContent}
          <div className="absolute bottom-4 left-4 right-4 bg-white pb-1 pt-2">
            <div className="mb-3 flex items-center gap-3 px-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 border border-stone-200 shrink-0">
                <span className="text-[11px] font-black text-stone-600">{user?.email?.charAt(0).toUpperCase() || "A"}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-bold text-stone-900">{user?.email || "Administrator"}</p>
                <p className="truncate text-[9px] font-black uppercase tracking-widest text-emerald-500">Active</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-stone-200 shadow-sm"
              onClick={() => {
                if (user?.email && effectiveClientId) {
                  void addAuditEntrySafe({
                    module: "Authentication",
                    action: "logout",
                    description: `User ${user.email} signed out`,
                    performedBy: user.email,
                    clientId: effectiveClientId
                  }).finally(() => {
                    void logoutAdmin();
                  });
                } else {
                  void logoutAdmin();
                }
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>
        <div className="flex flex-col min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 border-stone-200"
                onClick={() => setMobileNavOpen((prev) => !prev)}
                aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
              >
                {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-stone-900">Admin Console</p>
                <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  {user?.email ?? "Admin"}
                </p>
              </div>
            </div>
          </header>
          {mobileNavOpen ? (
            <div className="fixed inset-0 z-40 lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
                aria-label="Close navigation"
                onClick={() => setMobileNavOpen(false)}
              />
              <aside className="absolute left-0 top-0 flex h-[100dvh] w-[85%] max-w-[320px] flex-col border-r border-stone-100 bg-white p-4 shadow-2xl transition-transform">
                {sidebarContent}
                <div className="absolute bottom-4 left-4 right-4 bg-white pb-1 pt-2">
                  <div className="mb-3 flex items-center gap-3 px-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 border border-stone-200 shrink-0 shadow-sm">
                      <span className="text-[11px] font-black text-stone-600">{user?.email?.charAt(0).toUpperCase() || "A"}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-stone-900">{user?.email || "Administrator"}</p>
                      <p className="truncate text-[9px] font-black uppercase tracking-widest text-emerald-500">Active Session</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 border-stone-200 shadow-sm"
                    onClick={() => {
                      if (user?.email && effectiveClientId) {
                        void addAuditEntrySafe({
                          module: "Authentication",
                          action: "logout",
                          description: `User ${user.email} signed out`,
                          performedBy: user.email,
                          clientId: effectiveClientId
                        }).finally(() => {
                          void logoutAdmin();
                        });
                      } else {
                        void logoutAdmin();
                      }
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              </aside>
            </div>
          ) : null}
          <main className="p-4 lg:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
