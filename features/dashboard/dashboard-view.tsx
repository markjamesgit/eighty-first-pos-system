"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DASHBOARD_FILTERS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { listIngredients } from "@/services/firebase/ingredients";
import { listIngredientUsageForRange } from "@/services/firebase/orders";
import { getSalesSummaryByFilter } from "@/services/firebase/sales";
import type { SalesSummary } from "@/lib/types/domain";

export function DashboardView() {
  const [filter, setFilter] = useState<"today" | "weekly" | "monthly">("today");
  const [summary, setSummary] = useState<SalesSummary[]>([]);
  const [ingredients, setIngredients] = useState<
    Array<{ id: string; name: string; stockQty: number; lowStockThreshold: number }>
  >([]);
  const [ingredientUsage, setIngredientUsage] = useState<
    Array<{ ingredientName: string; quantityChange: number }>
  >([]);

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
    void getSalesSummaryByFilter(filter).then(setSummary);
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
    const range = getRangeForFilter(filter);
    void listIngredientUsageForRange(range)
      .then((rows) =>
        setIngredientUsage(
          rows.map((row) => ({
            ingredientName: row.ingredientName,
            quantityChange: row.quantityChange,
          })),
        ),
      )
      .catch(() => setIngredientUsage([]));
  }, [filter]);

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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-950">Sales Dashboard</h1>
          <p className="text-sm text-stone-500">
            Lightweight KPI cards backed by pre-aggregated Firestore summaries.
          </p>
        </div>
        <Select value={filter} onValueChange={(value: "today" | "weekly" | "monthly") => setFilter(value)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DASHBOARD_FILTERS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader>
            <CardDescription>Total Sales</CardDescription>
            <CardTitle>{formatCurrency(totals.totalSales)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Orders</CardDescription>
            <CardTitle>{totals.orderCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Top Product</CardDescription>
            <CardTitle>{topProducts[0]?.name ?? "No sales yet"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Low Ingredient Stock</CardDescription>
            <CardTitle>{ingredientStats.lowStockCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Critical Ingredients</CardDescription>
            <CardTitle>{ingredientStats.criticalCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Simple chart based on small pre-aggregated summary docs.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="dateKey" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => `PHP ${value}`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                <Bar dataKey="totalSales" fill="#1c1917" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Sellers</CardTitle>
            <CardDescription>Aggregated from daily summary docs instead of raw order scans.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topProducts.map((product) => (
              <div key={product.name} className="flex items-center justify-between rounded-lg border border-stone-200 p-3">
                <span className="font-medium">{product.name}</span>
                <Badge>{product.qty} sold</Badge>
              </div>
            ))}
            {!topProducts.length ? (
              <p className="text-sm text-stone-500">Complete some orders to populate sales insights.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Used Ingredients</CardTitle>
            <CardDescription>Most consumed ingredients in selected dashboard period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ingredientStats.topUsed.map((ingredient) => (
              <div key={ingredient} className="flex items-center justify-between rounded-lg border border-stone-200 p-3">
                <span className="font-medium">{ingredient}</span>
                <Badge>High usage</Badge>
              </div>
            ))}
            {!ingredientStats.topUsed.length ? (
              <p className="text-sm text-stone-500">No ingredient usage data for selected period.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
