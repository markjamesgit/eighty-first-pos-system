"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { OrderRecord } from "@/lib/types/domain";
import { listIngredientUsageForRange, listOrderHistoryForRange } from "@/services/firebase/orders";
import {
  FileDown,
  Search,
  BarChart3,
  FlaskConical,
  TrendingUp,
  Calendar as CalendarIcon,
  SlidersHorizontal,
} from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";

function toCsv(rows: string[][]) {
  return rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function ReportsView() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ingredientUsage, setIngredientUsage] = useState<
    Array<{
      id: string;
      ingredientName: string;
      quantityChange: number;
      unit: string;
      referenceOrderId: string;
      createdAt?: Date;
    }>
  >([]);

  const [salesPage, setSalesPage] = useState(1);
  const [usagePage, setUsagePage] = useState(1);
  const [salesPageSize, setSalesPageSize] = useState(10);
  const [usagePageSize, setUsagePageSize] = useState(10);
  const [salesSearch, setSalesSearch] = useState("");
  const [usageSearch, setUsageSearch] = useState("");

  const totalSales = useMemo(() => orders.reduce((sum, o) => sum + o.totalAmount, 0), [orders]);
  const filteredSales = useMemo(() => {
    const query = salesSearch.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) => order.orderId.toLowerCase().includes(query));
  }, [orders, salesSearch]);
  const filteredUsage = useMemo(() => {
    const query = usageSearch.trim().toLowerCase();
    if (!query) return ingredientUsage;
    return ingredientUsage.filter(
      (item) =>
        item.ingredientName.toLowerCase().includes(query) ||
        item.referenceOrderId.toLowerCase().includes(query),
    );
  }, [ingredientUsage, usageSearch]);
  const filteredSalesAmount = useMemo(
    () => filteredSales.reduce((sum, order) => sum + order.totalAmount, 0),
    [filteredSales],
  );
  const filteredUsageQuantity = useMemo(
    () => filteredUsage.reduce((sum, item) => sum + Math.abs(item.quantityChange), 0),
    [filteredUsage],
  );

  const paginatedSales = useMemo(() => {
    const start = (salesPage - 1) * salesPageSize;
    return filteredSales.slice(start, start + salesPageSize);
  }, [filteredSales, salesPage, salesPageSize]);

  const salesTotalPages = Math.max(1, Math.ceil(filteredSales.length / salesPageSize));

  const paginatedUsage = useMemo(() => {
    const start = (usagePage - 1) * usagePageSize;
    return filteredUsage.slice(start, start + usagePageSize);
  }, [filteredUsage, usagePage, usagePageSize]);

  const usageTotalPages = Math.max(1, Math.ceil(filteredUsage.length / usagePageSize));

  useEffect(() => {
    if (salesPage > salesTotalPages) setSalesPage(salesTotalPages);
    if (usagePage > usageTotalPages) setUsagePage(usageTotalPages);
  }, [salesPage, usagePage, salesTotalPages, usageTotalPages]);

  async function handleGenerate() {
    setLoading(true);
    try {
      const rows = await listOrderHistoryForRange({
        startDate: startDate ? new Date(`${startDate}T00:00:00`) : undefined,
        endDate: endDate ? new Date(`${endDate}T23:59:59`) : undefined,
      });
      const ingredientRows = await listIngredientUsageForRange({
        startDate: startDate ? new Date(`${startDate}T00:00:00`) : undefined,
        endDate: endDate ? new Date(`${endDate}T23:59:59`) : undefined,
      });
      setOrders(rows);
      setIngredientUsage(
        ingredientRows.map((row) => ({
          id: row.id,
          ingredientName: row.ingredientName,
          quantityChange: row.quantityChange,
          unit: row.unit,
          referenceOrderId: row.referenceOrderId,
          createdAt: row.createdAt,
        })),
      );
      setSalesPage(1);
      setUsagePage(1);
      toast.success(`Generated reports for ${rows.length} transactions.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to generate report.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadSales() {
    if (!orders.length) return toast.error("No data available.");
    const csv = toCsv([
      ["Order ID", "Date", "Items", "Total", "Status"],
      ...orders.map((o) => [
        o.orderId,
        o.createdAt ? formatDateTime(o.createdAt) : "-",
        o.items.map((i) => `${i.name} x${i.qty}`).join("; "),
        String(o.totalAmount),
        o.status,
      ]),
    ]);
    download(csv, `sales-report-${startDate || 'all'}-to-${endDate || 'now'}.csv`);
  }

  function handleDownloadIngredients() {
    if (!ingredientUsage.length) return toast.error("No usage data available.");
    const csv = toCsv([
      ["Date", "Ingredient", "Change", "Unit", "Order"],
      ...ingredientUsage.map((u) => [
        u.createdAt ? formatDateTime(u.createdAt) : "-",
        u.ingredientName,
        String(u.quantityChange),
        u.unit,
        u.referenceOrderId,
      ]),
    ]);
    download(csv, `ingredient-usage-${startDate || 'all'}-to-${endDate || 'now'}.csv`);
  }

  function download(csv: string, filename: string) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Business Intelligence</h1>
          <p className="text-sm text-stone-500 font-medium">Analyze sales performance and material consumption.</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <Button variant="outline" size="sm" onClick={handleDownloadSales} className="h-10 flex-1 min-w-[140px] px-5 rounded-xl font-bold text-xs border-stone-100 hover:bg-stone-50 transition-all sm:flex-none shadow-sm">
              <FileDown className="h-4 w-4 mr-2" />
              Sales CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadIngredients} className="h-10 flex-1 min-w-[140px] px-5 rounded-xl font-bold text-xs border-stone-100 hover:bg-stone-50 transition-all sm:flex-none shadow-sm">
              <FileDown className="h-4 w-4 mr-2" />
              Usage CSV
            </Button>
        </div>
      </div>

      <Card className="border-stone-100 shadow-sm rounded-2xl md:rounded-3xl bg-white overflow-hidden">
        <CardHeader className="bg-white border-b border-stone-100 py-6 px-8">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-stone-500">Parameter Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center gap-2 mb-1">
                <CalendarIcon className="h-3 w-3 text-stone-400" />
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Starting Date</label>
              </div>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-12 rounded-xl border-stone-200 font-medium focus:ring-stone-900" />
            </div>
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center gap-2 mb-1">
                <CalendarIcon className="h-3 w-3 text-stone-400" />
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Ending Date</label>
              </div>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-12 rounded-xl border-stone-200 font-medium focus:ring-stone-900" />
            </div>
            <Button onClick={() => void handleGenerate()} disabled={loading} className="h-12 w-full gap-2 rounded-xl bg-stone-900 px-6 text-xs font-bold text-white shadow-sm transition-all hover:bg-stone-800 md:w-auto md:px-10">
              <Search className="h-4 w-4" />
              {loading ? "Processing..." : "Generate Analysis"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="mb-6 inline-flex w-full flex-wrap gap-1 rounded-2xl bg-stone-100/50 p-1 md:w-auto">
          <TabsTrigger value="sales" className="flex items-center gap-2 px-6 h-10 rounded-xl font-bold text-xs data-[state=active]:bg-stone-900 data-[state=active]:text-white transition-all shadow-sm">
            <TrendingUp className="h-4 w-4" />
            Revenue Stream
          </TabsTrigger>
          <TabsTrigger value="ingredients" className="flex items-center gap-2 px-6 h-10 rounded-xl font-bold text-xs data-[state=active]:bg-stone-900 data-[state=active]:text-white transition-all">
            <FlaskConical className="h-4 w-4" />
            Consumption
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="sales" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="overflow-hidden rounded-2xl md:rounded-3xl border-stone-100 bg-white shadow-sm">
            <CardHeader className="bg-white border-b border-stone-100 py-6 md:py-8 px-6 md:px-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <CardTitle className="text-xl font-bold text-stone-900 tracking-tight">Sales Summary</CardTitle>
                  <CardDescription className="text-stone-500 font-medium text-sm">Consolidated transaction list for the chosen parameters.</CardDescription>
                </div>
                <div className="bg-stone-900 px-6 py-4 rounded-2xl shadow-sm text-center md:text-right border border-stone-800">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Period Revenue</p>
                  <p className="text-2xl font-black text-white">{formatCurrency(totalSales)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid p-0 lg:grid-cols-[240px_1fr]">
              <aside className="space-y-4 border-b border-stone-100 bg-white p-5 lg:border-b-0 lg:border-r">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                    <SlidersHorizontal className="h-4 w-4" />
                    Reports Sidebar
                  </h3>
                  <p className="mt-1 text-xs text-stone-500">Filter and inspect revenue stream entries.</p>
                </div>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-stone-900" />
                  <Input
                    className="h-10 rounded-xl border-stone-200 bg-white pl-10 font-medium transition-all focus-visible:ring-stone-950"
                    placeholder="Search order ID..."
                    value={salesSearch}
                    onChange={(e) => {
                      setSalesSearch(e.target.value);
                      setSalesPage(1);
                    }}
                  />
                </div>
                <div className="hidden lg:block space-y-2">
                  <div className="rounded-xl border border-stone-100 bg-stone-50/40 p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total Orders</p>
                    <p className="mt-1 text-2xl font-black text-stone-900">{orders.length}</p>
                  </div>
                  <div className="rounded-xl border border-stone-100 bg-stone-50/40 p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Filtered Results</p>
                    <p className="mt-1 text-2xl font-black text-stone-900">{filteredSales.length}</p>
                  </div>
                </div>
              </aside>
              <div>
              <div className="space-y-3 p-4 lg:hidden">
                {filteredSales.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-stone-100 bg-white opacity-40">
                    <BarChart3 className="mb-2 h-10 w-10 text-stone-300" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Parameters</p>
                  </div>
                ) : (
                  paginatedSales.map((order) => (
                    <article key={order.id} className="space-y-3 rounded-xl border border-stone-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-black uppercase tracking-tighter text-stone-950">{order.orderId}</p>
                        <Badge variant="outline" className="h-5 border-stone-200 bg-stone-50 px-2.5 text-[8px] font-black uppercase tracking-widest">
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                        {order.createdAt ? formatDateTime(order.createdAt) : "-"}
                      </p>
                      <p className="text-sm font-black text-stone-950">{formatCurrency(order.totalAmount)}</p>
                    </article>
                  ))
                )}
              </div>
              <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow className="hover:bg-transparent border-stone-100 h-12">
                    <TableHead className="py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-6 md:pl-8">Order ID</TableHead>
                    <TableHead className="py-0 text-xs font-semibold uppercase tracking-wider text-stone-400">DateTime</TableHead>
                    <TableHead className="py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 text-center">Amount</TableHead>
                    <TableHead className="text-right py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pr-6 md:pr-8">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-64 text-center">
                         <div className="flex flex-col items-center justify-center opacity-40">
                            <BarChart3 className="h-12 w-12 mb-3 text-stone-300" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Parameters</p>
                         </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSales.map((order) => (
                      <TableRow key={order.id} className="hover:bg-stone-50/50 group transition-all border-stone-100 h-20">
                        <TableCell className="pl-6 md:pl-8 py-4">
                           <span className="font-bold text-sm tracking-tight text-stone-950 uppercase">{order.orderId}</span>
                        </TableCell>
                        <TableCell className="text-stone-500 text-[11px] font-medium">{order.createdAt ? formatDateTime(order.createdAt) : "-"}</TableCell>
                        <TableCell className="text-center">
                           <span className="font-bold text-stone-950 text-sm">{formatCurrency(order.totalAmount)}</span>
                        </TableCell>
                        <TableCell className="text-right pr-6 md:pr-8">
                           <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider border-stone-200 bg-stone-50 px-2.5 h-6 shadow-sm">{order.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
              <div className="bg-white border-t border-stone-100 py-3">
                 <TablePagination
                    currentPage={salesPage}
                    totalPages={salesTotalPages}
                    totalItems={filteredSales.length}
                    pageSize={salesPageSize}
                    onPageChange={setSalesPage}
                    onPageSizeChange={setSalesPageSize}
                    pageSizeOptions={[10, 20, 30, 50]}
                 />
              </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ingredients" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="overflow-hidden rounded-2xl md:rounded-3xl border-stone-100 bg-white shadow-sm">
            <CardHeader className="bg-white border-b border-stone-100 py-6 md:py-8 px-6 md:px-8">
              <CardTitle className="text-xl font-bold text-stone-900 tracking-tight">Ingredient Flux</CardTitle>
              <CardDescription className="text-stone-500 font-medium text-sm">Atomic breakdown of material consumption logs.</CardDescription>
            </CardHeader>
            <CardContent className="grid p-0 lg:grid-cols-[240px_1fr]">
              <aside className="space-y-4 border-b border-stone-100 bg-white p-5 lg:border-b-0 lg:border-r">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                    <SlidersHorizontal className="h-4 w-4" />
                    Reports Sidebar
                  </h3>
                  <p className="mt-1 text-xs text-stone-500">Search ingredient usage and order context.</p>
                </div>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-stone-900" />
                  <Input
                    className="h-10 rounded-xl border-stone-200 bg-white pl-10 font-medium transition-all focus-visible:ring-stone-950"
                    placeholder="Search ingredient or order..."
                    value={usageSearch}
                    onChange={(e) => {
                      setUsageSearch(e.target.value);
                      setUsagePage(1);
                    }}
                  />
                </div>
                <div className="hidden lg:block space-y-2">
                  <div className="rounded-xl border border-stone-100 bg-stone-50/40 p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Usage Logs</p>
                    <p className="mt-1 text-2xl font-black text-stone-900">{ingredientUsage.length}</p>
                  </div>
                  <div className="rounded-xl border border-stone-100 bg-stone-50/40 p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Filtered Results</p>
                    <p className="mt-1 text-2xl font-black text-stone-900">{filteredUsage.length}</p>
                  </div>
                </div>
              </aside>
              <div>
              <div className="space-y-3 p-4 lg:hidden">
                {filteredUsage.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-stone-100 bg-white opacity-40">
                    <FlaskConical className="mb-2 h-10 w-10 text-stone-300" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No Depletion Recorded</p>
                  </div>
                ) : (
                  paginatedUsage.map((item) => (
                    <article key={item.id} className="space-y-3 rounded-xl border border-stone-100 bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                        {item.createdAt ? formatDateTime(item.createdAt) : "-"}
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-stone-900">{item.ingredientName}</p>
                        <p className="text-base font-black tracking-tighter text-red-600">
                          {item.quantityChange} <span className="ml-1 text-[10px] text-stone-400">{item.unit}</span>
                        </p>
                      </div>
                      <p className="truncate text-[10px] font-black uppercase tracking-tighter text-stone-300">
                        #{item.referenceOrderId.slice(0, 12)}
                      </p>
                    </article>
                  ))
                )}
              </div>
              <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow className="hover:bg-transparent border-stone-100 h-12">
                    <TableHead className="py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-6 md:pl-8">DateTime</TableHead>
                    <TableHead className="py-0 text-xs font-semibold uppercase tracking-wider text-stone-400">Ingredient</TableHead>
                    <TableHead className="py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 text-center">Change</TableHead>
                    <TableHead className="text-right py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pr-6 md:pr-8">Order context</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-64 text-center">
                         <div className="flex flex-col items-center justify-center opacity-40">
                            <FlaskConical className="h-12 w-12 mb-3 text-stone-300" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No Depletion Recorded</p>
                         </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsage.map((item) => (
                      <TableRow key={item.id} className="hover:bg-stone-50/50 group border-stone-100 transition-all">
                        <TableCell className="pl-6 md:pl-8 py-4 text-stone-500 font-medium text-[11px]">{item.createdAt ? formatDateTime(item.createdAt) : "-"}</TableCell>
                        <TableCell>
                           <span className="font-bold text-stone-900 text-sm">{item.ingredientName}</span>
                        </TableCell>
                        <TableCell className="text-center font-bold text-red-600 text-sm">
                          {item.quantityChange} <span className="text-[10px] text-stone-400 ml-0.5">{item.unit}</span>
                        </TableCell>
                        <TableCell className="text-right pr-6 md:pr-8">
                           <span className="text-[11px] font-semibold text-stone-300 uppercase tracking-tighter truncate max-w-[120px] inline-block">#{item.referenceOrderId.slice(0,12)}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
              <div className="bg-white border-t border-stone-100 py-3">
                 <TablePagination
                    currentPage={usagePage}
                    totalPages={usageTotalPages}
                    totalItems={filteredUsage.length}
                    pageSize={usagePageSize}
                    onPageChange={setUsagePage}
                    onPageSizeChange={setUsagePageSize}
                    pageSizeOptions={[10, 20, 30, 50]}
                 />
              </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
