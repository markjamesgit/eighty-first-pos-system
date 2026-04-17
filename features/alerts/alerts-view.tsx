"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TablePagination } from "@/components/ui/table-pagination";
import type { AlertRecord, AlertLevel } from "@/lib/types/domain";
import { wipeAllAlerts, markAlertsAsRead, subscribeToAlerts, type SystemAlert } from "@/services/firebase/alerts";
import { useAuthStore } from "@/store/auth-store";
import { useProductsStore } from "@/store/products-store";
import { BellRing, Search, SlidersHorizontal, CheckCheck, Trash2 } from "lucide-react";
import { formatDateTime, cn } from "@/lib/utils";

export function AlertsView() {
  const user = useAuthStore((state) => state.user);
  const fetchProducts = useProductsStore((state) => state.fetchProducts);
  
  const [realtimeAlerts, setRealtimeAlerts] = useState<SystemAlert[]>([]);
  const alertMountTimeRef = useRef<number | null>(null);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | SystemAlert["level"]>("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    alertMountTimeRef.current = Date.now();
    void fetchProducts();
    
    // Subscribe to system alerts
    const unsubAlerts = subscribeToAlerts(setRealtimeAlerts, 200);

    return () => {
      unsubAlerts();
    };
  }, [fetchProducts]);

  const filteredAlerts = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return realtimeAlerts.filter((alert) => {
      const matchesLevel = levelFilter === "all" || alert.level === levelFilter;
      const matchesModule = moduleFilter === "all" || alert.module === moduleFilter;
      const matchesSearch =
        !needle ||
        [alert.level, alert.module, alert.message].join(" ").toLowerCase().includes(needle);
      return matchesLevel && matchesModule && matchesSearch;
    });
  }, [realtimeAlerts, levelFilter, moduleFilter, search]);
  const levelOptions = useMemo(() => {
    const levels = realtimeAlerts.map((alert) => alert.level).filter(Boolean);
    return Array.from(new Set(levels)).sort((a, b) => a.localeCompare(b));
  }, [realtimeAlerts]);
  const moduleOptions = useMemo(() => {
    const modules = realtimeAlerts.map((alert) => alert.module).filter(Boolean);
    return Array.from(new Set(modules)).sort((a, b) => a.localeCompare(b));
  }, [realtimeAlerts]);
  const safeLevelFilter = useMemo(
    () => (levelFilter === "all" || levelOptions.includes(levelFilter) ? levelFilter : "all"),
    [levelFilter, levelOptions],
  );
  const safeModuleFilter = useMemo(
    () => (moduleFilter === "all" || moduleOptions.includes(moduleFilter) ? moduleFilter : "all"),
    [moduleFilter, moduleOptions],
  );

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedAlerts = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredAlerts.slice(start, start + pageSize);
  }, [filteredAlerts, safeCurrentPage, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-3">
             Incident Control
          </h1>
          <p className="text-sm text-stone-500 font-medium">Monitoring stock levels, system health, and operations.</p>
        </div>
      </div>

      <Card className="overflow-hidden rounded-3xl border-none bg-white shadow-xl shadow-stone-200/40 ring-1 ring-stone-100">
        <CardHeader className={cn("bg-stone-50/80 backdrop-blur-md pb-8 border-stone-100 transition-colors border-b", realtimeAlerts.some(a => a.level === "critical") ? "bg-red-50/10" : "bg-stone-50/80")}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                  <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-stone-400">Alert Registry</CardTitle>
                  <CardDescription className="text-xs font-medium text-stone-500">Real-time consolidated telemetry stream.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-white px-4 h-8 rounded-full font-black text-[10px] text-stone-400 border-stone-200 shadow-sm">{user?.email || "No user"}</Badge>
            </div>
        </CardHeader>
        <CardContent className="grid p-0 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-5 border-b border-stone-100 bg-stone-50/60 p-5 lg:border-b-0 lg:border-r">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                <SlidersHorizontal className="h-4 w-4" />
                Alerts Sidebar
              </h3>
              <p className="mt-1 text-xs text-stone-500">Filter and monitor incident telemetry in real time.</p>
            </div>
            <div className="space-y-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-stone-900" />
                <Input
                  placeholder="Search alerts..."
                  className="h-10 rounded-xl border-stone-200 bg-white pl-10 font-medium transition-all focus-visible:ring-stone-900"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <Select
                value={safeLevelFilter}
                onValueChange={(value) => {
                  setLevelFilter(value as "all" | SystemAlert["level"]);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white font-semibold text-stone-600">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-stone-200">
                  <SelectItem value="all">All Severity</SelectItem>
                  {levelOptions.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={safeModuleFilter}
                onValueChange={(value) => {
                  setModuleFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white font-semibold text-stone-600">
                  <SelectValue placeholder="Component" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-stone-200">
                  <SelectItem value="all">All Components</SelectItem>
                  {moduleOptions.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filteredAlerts.some((a) => !a.isRead) ? (
                <Button
                  onClick={() =>
                    void markAlertsAsRead(filteredAlerts.filter((a) => !a.isRead).map((a) => a.id))
                  }
                  className="w-full gap-2 rounded-xl bg-stone-950 font-bold text-white shadow hover:bg-stone-800"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark All as Read
                </Button>
              ) : null}
              {filteredAlerts.length > 0 ? (
                <Button
                  variant="outline"
                  className="w-full gap-2 rounded-xl border-stone-200 text-red-600 hover:bg-red-50 hover:text-red-700 shadow-sm transition-all"
                  onClick={() => {
                    void wipeAllAlerts().then(() => toast.success("All alert data wiped successfully."));
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All Alerts
                </Button>
              ) : null}
            </div>
          </aside>
          <div>
          <div className="flex flex-col p-4 w-full h-full bg-stone-50/30">
            <div className="space-y-4">
              {filteredAlerts.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-stone-100 bg-white opacity-60 shadow-sm">
                  <div className="bg-stone-50 p-4 rounded-full mb-3">
                     <BellRing className="h-8 w-8 text-stone-300" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">System is Stable</p>
                  <p className="text-xs font-medium text-stone-500 mt-1">No alerts to display at this moment.</p>
                </div>
              ) : (
                paginatedAlerts.map((alert) => (
                  <article
                    key={alert.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-center sm:justify-between",
                      alert.level === "critical"
                        ? "border-red-200/60 bg-red-50/30 hover:bg-red-50/50"
                        : alert.level === "warning"
                          ? "border-amber-200/50 hover:bg-amber-50/20"
                          : "border-stone-100 hover:bg-stone-50/50"
                    )}
                  >
                    <div className="flex flex-grow flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex shrink-0 items-center gap-3">
                        {!alert.isRead && (
                          <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-4 ring-red-50" />
                        )}
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
                          className="h-7 items-center justify-center rounded-full px-4 text-[10px] font-black uppercase tracking-widest shadow-sm ring-2 ring-white"
                        >
                          {alert.level}
                        </Badge>
                      </div>

                      <div className="flex flex-col justify-center sm:pl-2">
                        <div className="flex items-center gap-2 mb-0.5">
                           <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                             {alert.module}
                           </span>
                           <span className="hidden sm:inline text-stone-300">&bull;</span>
                           <span className="text-[10px] sm:hidden font-bold tracking-wider text-stone-400 uppercase">
                              {formatDateTime(alert.createdAt)}
                           </span>
                        </div>
                        <p className={cn("text-sm font-bold leading-relaxed tracking-tight", alert.level === "critical" ? "text-red-950" : "text-stone-900")}>
                          {alert.message}
                        </p>
                      </div>
                    </div>

                    <div className="hidden shrink-0 items-center justify-end text-right sm:flex sm:min-w-[140px] gap-4">
                      {!alert.isRead ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Acknowledge Alert"
                          onClick={() => void markAlertsAsRead([alert.id])}
                          className="h-8 w-8 rounded-full border border-stone-200 text-stone-400 hover:bg-stone-900 hover:text-white transition-all shadow-sm"
                        >
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-stone-500">Recorded at</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mt-0.5">
                          {formatDateTime(alert.createdAt)}
                        </span>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
          
          <div className="bg-stone-50/30 border-t border-stone-100 py-3 rounded-b-3xl">
            <TablePagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={filteredAlerts.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 20, 30, 50]}
            />
          </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
