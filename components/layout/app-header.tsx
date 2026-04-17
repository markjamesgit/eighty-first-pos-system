"use client";

import { useEffect, useState } from "react";
import { BellRing, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { subscribeToAlerts, markAlertsAsRead, type SystemAlert } from "@/services/firebase/alerts";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

export function AppHeader() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [alertsOpen, setAlertsOpen] = useState(false);

  useEffect(() => {
    return subscribeToAlerts(setAlerts, 5);
  }, []);

  const unreadAlertIds = alerts.filter(a => !a.isRead).map(a => a.id);
  const unreadCount = unreadAlertIds.length;

  const handleOpenChange = (open: boolean) => {
    setAlertsOpen(open);
    if (open && unreadAlertIds.length > 0) {
      void markAlertsAsRead(unreadAlertIds);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-stone-200 bg-white/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        {/* Placeholder for breadcrumbs or page title if needed */}
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu open={alertsOpen} onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative flex items-center gap-2 rounded-full px-3">
              <div className="relative">
                <BellRing className="h-4 w-4 text-stone-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="hidden text-xs font-semibold text-stone-600 lg:inline-block">Alerts</span>
              <ChevronDown className="h-3 w-3 text-stone-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[320px] rounded-xl border-stone-200 p-0 shadow-xl">
            <div className="flex items-center justify-between p-4">
              <DropdownMenuLabel className="p-0 text-sm font-bold">Recent Notifications</DropdownMenuLabel>
            </div>
            <DropdownMenuSeparator className="m-0" />
            <div className="max-h-[300px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
                  <BellRing className="mb-2 h-8 w-8 text-stone-200" />
                  <p className="text-xs font-medium">No active alerts</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <DropdownMenuItem key={alert.id} className="flex flex-col items-start gap-1 border-b border-stone-50 p-4 last:border-0 hover:bg-stone-50 focus:bg-stone-50">
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-2">
                        {!alert.isRead && <span className="h-2 w-2 rounded-full bg-red-500" />}
                        <Badge 
                          variant={
                            alert.level === "critical"
                              ? "destructive"
                              : alert.level === "warning"
                                ? "warning"
                                : alert.level === "good"
                                  ? "good"
                                  : "informational"
                          }
                          className="rounded-sm px-1.5 py-0 text-[9px] font-black uppercase tracking-widest"
                        >
                          {alert.level}
                        </Badge>
                      </div>
                      <span className="text-[10px] font-medium text-stone-400">
                        {formatDateTime(alert.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold leading-tight text-stone-900">{alert.message}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{alert.module}</p>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <DropdownMenuSeparator className="m-0" />
            <Link href="/alerts" className="block w-full text-center text-[11px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 py-3 transition-colors">
              View All Alerts
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
