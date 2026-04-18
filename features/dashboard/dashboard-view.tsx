"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DASHBOARD_FILTERS } from "@/lib/constants";
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
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { listIngredients } from "@/services/firebase/ingredients";
import { listIngredientUsageForRange } from "@/services/firebase/orders";
import { getSalesSummaryByDateRange, getSalesSummaryByFilter } from "@/services/firebase/sales";
import { subscribeToAdminConfig, type AdminSystemConfig, DEFAULT_CONFIG } from "@/services/firebase/admin-config";
import type { SalesSummary } from "@/lib/types/domain";

export function DashboardView() {
  const [filter, setFilter] = useState<"today" | "weekly" | "monthly" | "custom">("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [summary, setSummary] = useState<SalesSummary[]>([]);
  const [ingredients, setIngredients] = useState<
    Array<{ id: string; name: string; stockQty: number; lowStockThreshold: number }>
  >([]);
  const [ingredientUsage, setIngredientUsage] = useState<
    Array<{ ingredientName: string; quantityChange: number }>
  >([]);
  const [sysConfig, setSysConfig] = useState<AdminSystemConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    return subscribeToAdminConfig(setSysConfig);
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  function getRangeForFilter(rangeFilter: "today" | "weekly" | "monthly") {
    const now = new Date();
    const endDate = new Date(now);
    const startDate = new Date(now);
    if (rangeFilter === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (rangeFilter === "weekly") {
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate };
  }

  useEffect(() => {
    const range = getRangeForFilter(filter === "custom" ? "today" : filter);
    const startDate =
      filter === "custom" && customStartDate ? new Date(`${customStartDate}T00:00:00`) : range.startDate;
    const endDate =
      filter === "custom" && customEndDate ? new Date(`${customEndDate}T23:59:59`) : range.endDate;

    if (filter === "custom") {
      if (!customStartDate || !customEndDate) {
        setSummary([]);
        setIngredientUsage([]);
        return;
      }
      if (startDate > endDate) {
        toast.error("Custom range start date cannot be later than end date.");
        setSummary([]);
        setIngredientUsage([]);
        return;
      }
    }

    const salesPromise =
      filter === "custom"
        ? getSalesSummaryByDateRange(startDate, endDate)
        : getSalesSummaryByFilter(filter);
    void salesPromise.then(setSummary).catch(() => setSummary([]));

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
    void listIngredientUsageForRange({ startDate, endDate })
      .then((rows) =>
        setIngredientUsage(
          rows.map((row) => ({
            ingredientName: row.ingredientName,
            quantityChange: row.quantityChange,
          })),
        ),
      )
      .catch(() => setIngredientUsage([]));
  }, [filter, customStartDate, customEndDate]);

  const totals = useMemo(() => {
    return summary.reduce(
      (acc, item) => ({
        totalSales: acc.totalSales + item.totalSales,
        orderCount: acc.orderCount + item.orderCount,
      }),
      { totalSales: 0, orderCount: 0 },
    );
  }, [summary]);

  const topProducts = useMemo(() => {
    const counts = new Map<string, { name: string; qty: number }>();
    summary.forEach((item) => {
      item.topProducts.forEach((product) => {
        const existing = counts.get(product.productId);
        if (existing) {
          existing.qty += product.qty;
        } else {
          counts.set(product.productId, { name: product.name, qty: product.qty });
        }
      });
    });
    return Array.from(counts.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [summary]);

  const ingredientStats = useMemo(() => {
    const lowStockCount = ingredients.filter(
      (item) => item.stockQty <= item.lowStockThreshold,
    ).length;
    const criticalCount = ingredients.filter((item) => item.stockQty <= 0).length;
    const usageCounts = new Map<string, number>();

    ingredientUsage.forEach((item) => {
      if (item.quantityChange >= 0) {
        return;
      }
      const existing = usageCounts.get(item.ingredientName) ?? 0;
      usageCounts.set(item.ingredientName, existing + Math.abs(item.quantityChange));
    });

    const topUsed = Array.from(usageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    return { lowStockCount, criticalCount, topUsed };
  }, [ingredientUsage, ingredients]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-stone-200 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-800 text-white shadow-lg">
        <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">Control Center</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">{greeting}, {sysConfig.adminName || "Admin"}</h1>
            <p className="mt-2 text-sm text-stone-300">
              Real-time business pulse with sales, top products, and inventory signals.
            </p>
          </div>
          <div className="w-full md:w-[220px]">
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-stone-300">Date Filter</label>
            <Select
              value={filter}
              onValueChange={(value: "today" | "weekly" | "monthly" | "custom") => setFilter(value)}
            >
              <SelectTrigger className="w-full border-stone-700 bg-stone-900/60 text-stone-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DASHBOARD_FILTERS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {filter === "custom" && (
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Start date</label>
            <Input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} className="bg-white" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">End date</label>
            <Input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} className="bg-white" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Card className="col-span-2 sm:col-span-1 border-stone-100 shadow-sm rounded-2xl">
          <CardHeader className="gap-1 p-4 sm:p-5">
            <CardDescription className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-stone-500">Total Sales</CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-black text-stone-900">{formatCurrency(totals.totalSales)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-stone-100 shadow-sm rounded-2xl">
          <CardHeader className="gap-1 p-4 sm:p-5">
            <CardDescription className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-stone-500">Orders</CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-black text-stone-900">{totals.orderCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-stone-100 shadow-sm rounded-2xl">
          <CardHeader className="gap-1 p-4 sm:p-5">
            <CardDescription className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-stone-500">Top Product</CardDescription>
            <CardTitle className="text-sm sm:text-lg font-bold text-stone-900 truncate">{topProducts[0]?.name ?? "No sales yet"}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-stone-100 shadow-sm rounded-2xl">
          <CardHeader className="gap-1 p-4 sm:p-5">
            <CardDescription className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-stone-500">Low Stock</CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-black text-amber-600">{ingredientStats.lowStockCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-stone-100 shadow-sm rounded-2xl">
          <CardHeader className="gap-1 p-4 sm:p-5">
            <CardDescription className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-stone-500">Critical Stock</CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-black text-red-600">{ingredientStats.criticalCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.5fr_1fr]">
        <Card className="flex flex-col border-stone-100 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="px-5 pt-5 pb-2 sm:p-6 sm:pb-3">
            <CardTitle className="text-base font-bold text-stone-900">Revenue Flow</CardTitle>
            <CardDescription className="text-xs">Sales performance across timeframe.</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] sm:h-[350px] lg:h-full lg:min-h-[400px] p-3 sm:p-6 sm:pt-0 pb-3 flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="dateKey" 
                  tickLine={false} 
                  axisLine={false} 
                  fontSize={10} 
                  tickMargin={12}
                  stroke="#a8a29e" 
                  tickFormatter={(val: string) => {
                    if (!val) return "";
                    const parts = val.split("-");
                    if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
                    return val;
                  }}
                />
                <YAxis 
                  tickFormatter={(value) => `₱${value}`} 
                  tickLine={false} 
                  axisLine={false} 
                  fontSize={10} 
                  tickMargin={12}
                  stroke="#a8a29e"
                />
                <Tooltip 
                  cursor={{ fill: '#fafaf9' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #f5f5f4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', padding: '8px 12px' }}
                  formatter={(value) => [`₱${Number(value).toFixed(2)}`, "Revenue"]} 
                  labelStyle={{ fontWeight: "600", color: "#44403c", marginBottom: "4px", fontSize: "11px" }}
                  itemStyle={{ fontSize: "12px", fontWeight: "600", color: "#1c1917" }}
                />
                <Bar 
                  dataKey="totalSales" 
                  fill="#292524" 
                  radius={[4, 4, 0, 0]} 
                  barSize={24}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 sm:gap-6">
          <Card className="flex-1 border-stone-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-1 pt-5 px-5 sm:p-6 sm:pb-2">
              <CardTitle className="text-sm sm:text-base font-bold text-stone-900">Top Sellers</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 sm:px-6 flex flex-col gap-1">
              {topProducts.map((product) => (
                <div key={product.name} className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0">
                  <span className="font-semibold text-stone-800 text-sm">{product.name}</span>
                  <span className="text-xs font-medium text-stone-500">{product.qty} sold</span>
                </div>
              ))}
              {!topProducts.length ? (
                <div className="flex py-8 items-center justify-center">
                  <p className="text-xs text-stone-400">No recent sales data</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="flex-1 border-stone-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-1 pt-5 px-5 sm:p-6 sm:pb-2">
              <CardTitle className="text-sm sm:text-base font-bold text-stone-900">Top Ingredients</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 sm:px-6 flex flex-col gap-1">
              {ingredientStats.topUsed.map((ingredient) => (
                <div key={ingredient} className="flex items-center justify-between py-2 sm:py-2.5 border-b border-stone-100 last:border-0">
                  <span className="font-semibold text-stone-800 text-xs sm:text-sm">{ingredient}</span>
                  <span className="text-[10px] sm:text-xs font-medium text-stone-500">High usage</span>
                </div>
              ))}
              {!ingredientStats.topUsed.length ? (
                <div className="flex py-6 sm:py-8 items-center justify-center">
                  <p className="text-xs text-stone-400">No recent usage data</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
