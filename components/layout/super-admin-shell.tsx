"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  BarChart,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Building2,
  Activity
} from "lucide-react";
import { logoutAdmin } from "@/services/firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addAuditEntrySafe } from "@/services/firebase/audit-trail";

const navigation = [
  { href: "/super-admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/super-admin/clients", label: "Tenants", icon: Building2 },
  { href: "/super-admin/analytics", label: "Analytics", icon: BarChart },
  { href: "/super-admin/audit-trail", label: "Audit Trail", icon: Activity },
];

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className={cn(
        "mb-8 flex items-center gap-3 px-2 transition-all duration-300",
        isCollapsed && "px-0 justify-center"
      )}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white shadow-lg shadow-stone-200">
          <ShieldCheck className="h-6 w-6" />
        </div>
        {!isCollapsed && (
          <div className="animate-in fade-in slide-in-from-left-2 duration-300">
            <h1 className="text-sm font-bold tracking-tight text-stone-900 leading-none">SuperAdmin</h1>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-stone-400">Platform Control</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 pr-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className={cn(
                "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active 
                  ? "bg-stone-900 text-white shadow-md shadow-stone-100" 
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-900",
                isCollapsed && "justify-center px-2"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-white" : "text-stone-400 group-hover:text-stone-900")} />
                {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>}
              </div>
              {!isCollapsed && active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4 pt-4 border-t border-stone-100">
        <div className={cn(
          "flex items-center gap-3 px-2",
          isCollapsed && "px-0 justify-center"
        )}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 border border-stone-200">
            <span className="text-[11px] font-bold text-stone-600">
              {user?.email?.charAt(0).toUpperCase() || "S"}
            </span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 animate-in fade-in slide-in-from-left-2 duration-300">
              <p className="truncate text-[11px] font-bold text-stone-900">{user?.email}</p>
              <p className="truncate text-[9px] font-bold uppercase tracking-widest text-emerald-500">Super Admin</p>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start gap-3 rounded-xl border-stone-200 py-5 text-stone-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all",
            isCollapsed && "justify-center px-0 h-10 py-0"
          )}
          onClick={() => {
            if (user?.email) {
              void addAuditEntrySafe({
                module: "Authentication",
                action: "logout",
                description: `Super Admin ${user.email} signed out`,
                performedBy: user.email,
                clientId: "system"
              }).finally(() => {
                void logoutAdmin();
              });
            } else {
              void logoutAdmin();
            }
          }}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span>Sign out</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 relative overflow-hidden">
      {/* Premium Background Accents */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-stone-200/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/30 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className={cn(
          "sticky top-0 hidden h-screen flex-col border-r border-stone-200 bg-white/80 p-6 backdrop-blur-xl transition-all duration-300 lg:flex",
          isCollapsed ? "w-20" : "w-64"
        )}>
          {/* Toggle Sidebar Button */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-12 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 hover:text-stone-900 shadow-sm transition-all"
          >
            {isCollapsed ? <Menu className="h-3 w-3" /> : <X className="h-3 w-3" />}
          </button>
          {sidebarContent}
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-stone-200 bg-white/80 px-4 py-3 backdrop-blur-lg lg:hidden">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-stone-600"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-stone-900">SuperAdmin</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </div>
          </header>

          {/* Mobile Sidebar Overlay */}
          {mobileNavOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div 
                className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm"
                onClick={() => setMobileNavOpen(false)}
              />
              <aside className="absolute left-0 top-0 h-full w-72 bg-white p-6 shadow-2xl animate-in slide-in-from-left duration-300">
                <div className="flex justify-end mb-4">
                  <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                {/* Always show full sidebar for mobile overlay */}
                {sidebarContent}
              </aside>
            </div>
          )}

          <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

