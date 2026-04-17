"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  Warehouse,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { logoutAdmin } from "@/services/firebase/auth";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { subscribeToAlerts } from "@/services/firebase/alerts";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/pos", label: "POS", icon: Coffee },
  { href: "/products", label: "Products", icon: Package },
  { href: "/recipes", label: "Recipes", icon: ClipboardList },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: FileSpreadsheet },
  { href: "/audit-trail", label: "Audit Trail", icon: FileClock },
  { href: "/alerts", label: "Alerts", icon: BellRing, isAlert: true },
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
  const [alertCount, setAlertCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    return subscribeToAlerts((alerts) => setAlertCount(alerts.length), 10);
  }, []);

  const sidebarContent = (
    <>
      <div className="mb-8 rounded-xl bg-stone-950 p-4 text-white">
        <p className="text-sm uppercase tracking-[0.2em] text-stone-300">Coffee POS</p>
        <h1 className="mt-2 text-2xl font-semibold">Admin Console</h1>
        <div className="mt-2 h-px bg-stone-800" />
        <p className="mt-2 truncate text-[10px] font-bold uppercase tracking-widest text-stone-500">
          {user?.email ?? "Admin"}
        </p>
      </div>
      <nav className="space-y-2 overflow-y-auto pb-24">
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
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              {item.isAlert && alertCount > 0 && (
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    active ? "bg-white text-stone-950" : "bg-red-600 text-white",
                  )}
                >
                  {alertCount}
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
    </>
  );

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[240px_1fr]">
        <aside className="sticky top-0 hidden h-screen border-r border-stone-200 bg-white p-4 lg:block">
          {sidebarContent}
          <div className="absolute bottom-4 left-4 right-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-stone-200"
              onClick={() => {
                void logoutAdmin();
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>
        <div className="flex flex-col">
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
              {alertCount > 0 ? (
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                  {alertCount}
                </span>
              ) : null}
            </div>
          </header>
          {mobileNavOpen ? (
            <div className="fixed inset-0 z-40 lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/30"
                aria-label="Close navigation"
                onClick={() => setMobileNavOpen(false)}
              />
              <aside className="absolute left-0 top-0 h-full w-[85%] max-w-[320px] border-r border-stone-200 bg-white p-4 shadow-xl">
                {sidebarContent}
                <div className="absolute bottom-4 left-4 right-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 border-stone-200"
                    onClick={() => {
                      void logoutAdmin();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              </aside>
            </div>
          ) : null}
          <main className="p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
