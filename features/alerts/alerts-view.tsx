"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import type { AlertRecord, AlertLevel } from "@/lib/types/domain";
import { queueAlertEmailSafe, syncAlertRecordsSafe, subscribeToAlerts, type SystemAlert } from "@/services/firebase/alerts";
import { listIngredients } from "@/services/firebase/ingredients";
import { useAuthStore } from "@/store/auth-store";
import { useProductsStore } from "@/store/products-store";
import { BellRing, Search, SlidersHorizontal } from "lucide-react";
import { formatDateTime, cn } from "@/lib/utils";

export function AlertsView() {
  const user = useAuthStore((state) => state.user);
  const fetchProducts = useProductsStore((state) => state.fetchProducts);
  
  const [ingredients, setIngredients] = useState<
    Array<{ id: string; name: string; stockQty: number; lowStockThreshold: number }>
  >([]);
  const [realtimeAlerts, setRealtimeAlerts] = useState<SystemAlert[]>([]);
  const emailedCriticalIdsRef = useRef<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | SystemAlert["level"]>("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    void fetchProducts();
    void listIngredients()
      .then((rows) =>
        setIngredients(
          rows.map((row) => ({
            id: row.id,
            name: row.name,
            stockQty: row.stockQty,
            lowStockThreshold: row.lowStockThreshold,
          })),
        ),
      )
      .catch(() => setIngredients([]));
      
    // Subscribe to system alerts
    return subscribeToAlerts(setRealtimeAlerts, 200);
  }, [fetchProducts]);

  const logicAlerts = useMemo<AlertRecord[]>(() => {
    const lowStockIngredients = ingredients.filter(
      (item) => item.stockQty <= item.lowStockThreshold,
    );
    const criticalIngredients = lowStockIngredients.filter((item) => item.stockQty <= 0);
    const recipient = user?.email ?? "";

    if (!recipient) return [];

    return [
      {
        id: "ingredient_warning",
        level: "warning" as AlertLevel,
        module: "Inventory",
        message: `${lowStockIngredients.length} items reaching threshold.`,
        recipientEmail: recipient,
      },
      {
        id: "ingredient_critical",
        level: "critical" as AlertLevel,
        module: "Inventory",
        message: `${criticalIngredients.length} items completely out of stock.`,
        recipientEmail: recipient,
      },
    ].filter(a => a.message.split(" ")[0] !== "0");
  }, [ingredients, user?.email]);

  useEffect(() => {
    if (!logicAlerts.length || !user?.email) return;
    void syncAlertRecordsSafe(logicAlerts);
  }, [logicAlerts, user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    const newCriticalAlerts = realtimeAlerts.filter(
      (alert) => alert.level === "critical" && !emailedCriticalIdsRef.current.has(alert.id),
    );
    if (!newCriticalAlerts.length) return;

    void Promise.all(
      newCriticalAlerts.map(async (alert) => {
        const subject = `Critical Alert: ${alert.module}`;
        const message = `[${alert.module}] ${alert.message}\nObserved at: ${formatDateTime(alert.createdAt)}`;
        await queueAlertEmailSafe({
          recipientEmail: user.email,
          subject,
          message,
        });
        emailedCriticalIdsRef.current.add(alert.id);
      }),
    )
      .then(() => {
        toast.success("Critical alerts are automatically emailed.");
      })
      .catch(() => {
        toast.error("Failed to queue automated alert email.");
      });
  }, [realtimeAlerts, user?.email]);

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

  const criticalCount = useMemo(
    () => realtimeAlerts.filter((alert) => alert.level === "critical").length,
    [realtimeAlerts],
  );
  const warningCount = useMemo(
    () => realtimeAlerts.filter((alert) => alert.level === "warning").length,
    [realtimeAlerts],
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
              <Badge variant="outline" className="bg-white px-4 h-8 rounded-full font-black text-[10px] text-stone-400 border-stone-200 shadow-sm">{user?.email}</Badge>
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
            </div>
            <div className="space-y-2">
              <div className="rounded-xl border border-stone-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Total Alerts</p>
                <p className="mt-1 text-2xl font-black text-stone-900">{realtimeAlerts.length}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Critical</p>
                <p className="mt-1 text-2xl font-black text-red-600">{criticalCount}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Warnings</p>
                <p className="mt-1 text-2xl font-black text-amber-600">{warningCount}</p>
              </div>
            </div>
          </aside>
          <div>
          <Table>
            <TableHeader className="bg-stone-50/30">
              <TableRow className="hover:bg-transparent border-stone-100 h-14">
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 pl-8">Severity</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Component</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Message Payload</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 pr-8">Time Observed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center opacity-40">
                        <BellRing className="h-12 w-12 mb-3 text-stone-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sky is Clear</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAlerts.map((alert) => (
                  <TableRow key={alert.id} className={cn("group hover:bg-stone-50/50 transition-all border-stone-100 h-20", alert.level ==='critical' && "bg-red-50/10 hover:bg-red-50/20")}>
                    <TableCell className="pl-8">
                      <Badge 
                        variant={alert.level === "critical" ? "destructive" : alert.level === "warning" ? "warning" : "default"}
                        className="rounded-full text-[8px] font-black uppercase tracking-widest px-3 h-5 shadow-sm ring-2 ring-white"
                      >
                        {alert.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 group-hover:text-stone-900 transition-colors">
                          {alert.module}
                        </span>
                    </TableCell>
                    <TableCell>
                        <p className="font-bold text-stone-900 text-sm tracking-tight leading-snug">
                            {alert.message}
                        </p>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                          {formatDateTime(alert.createdAt)}
                        </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          <div className="bg-stone-50/30 border-t border-stone-100 py-3">
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
