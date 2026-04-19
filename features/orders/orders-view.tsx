"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { OrderRecord } from "@/lib/types/domain";
import { completeOrder, cancelOrder, listOrderHistory, subscribeToActiveOrders } from "@/services/firebase/orders";
import { TablePagination } from "@/components/ui/table-pagination";
import { ClipboardCheck, Clock, Search, SlidersHorizontal } from "lucide-react";

export function OrdersView() {
  const [activeOrders, setActiveOrders] = useState<OrderRecord[]>([]);
  const [historyOrders, setHistoryOrders] = useState<OrderRecord[]>([]);
  const initialHistoryLoaded = useRef(false);
  const loadingHistory = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeSearch, setActiveSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState<"all" | "completed" | "cancelled">("all");
  const [historyDate, setHistoryDate] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToActiveOrders(setActiveOrders, 50);
    return unsubscribe;
  }, []);

  const loadHistory = useCallback(async () => {
    if (loadingHistory.current) return;
    loadingHistory.current = true;
    try {
      // Fetch a larger batch for client-side pagination in this modernized version
      const result = await listOrderHistory(undefined, 100);
      setHistoryOrders(result.orders);
    } finally {
      loadingHistory.current = false;
    }
  }, []);

  useEffect(() => {
    if (initialHistoryLoaded.current) return;
    initialHistoryLoaded.current = true;
    void loadHistory();
  }, [loadHistory]);

  const filteredActiveOrders = useMemo(() => {
    const query = activeSearch.trim().toLowerCase();
    if (!query) return activeOrders;
    return activeOrders.filter((order) => {
      if (order.orderId.toLowerCase().includes(query)) return true;
      return order.items.some((item) => item.name.toLowerCase().includes(query));
    });
  }, [activeOrders, activeSearch]);

  const filteredHistoryOrders = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    return historyOrders.filter((order) => {
      const matchesStatus = historyStatus === "all" || order.status.toLowerCase() === historyStatus;
      const matchesSearch =
        !query ||
        order.orderId.toLowerCase().includes(query) ||
        order.items.some((item) => item.name.toLowerCase().includes(query));

      let orderDateStr = "";
      if (order.createdAt) {
        const d = new Date(order.createdAt);
        orderDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      const matchesDate = !historyDate || orderDateStr === historyDate;

      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [historyOrders, historySearch, historyStatus, historyDate]);

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHistoryOrders.slice(start, start + pageSize);
  }, [filteredHistoryOrders, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredHistoryOrders.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [historySearch, historyStatus, historyDate, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handleComplete(orderId: string) {
    try {
      await completeOrder(orderId);
      toast.success("Order marked as completed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to complete order.");
    }
  }

  async function handleCancel(orderId: string) {
    if (!window.confirm("Are you sure you want to completely cancel this order? This cannot be undone.")) return;
    try {
      await cancelOrder(orderId);
      toast.success("Order cancelled successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to cancel order.");
    }
  }

  const selectedOrderTotalItems = selectedOrder
    ? selectedOrder.items.reduce((sum, item) => sum + item.qty, 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-950">Orders Management</h1>
          <p className="text-sm text-stone-500 font-medium">Track operational workflow and historical data.</p>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-6 inline-flex w-full flex-wrap gap-1 rounded-2xl bg-stone-100/50 p-1 md:w-auto">
          <TabsTrigger value="active" className="flex items-center gap-2 px-6 h-10 rounded-xl font-bold text-xs data-[state=active]:bg-stone-900 data-[state=active]:text-white transition-all shadow-sm">
            <Clock className="h-4 w-4" />
            Active Service
            {activeOrders.length > 0 && (
              <Badge variant="warning" className="ml-2 rounded-full px-1.5 h-4 text-[10px] font-bold shadow-sm ring-2 ring-white">
                {activeOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 px-6 h-10 rounded-xl font-bold text-xs data-[state=active]:bg-stone-900 data-[state=active]:text-white transition-all">
            <ClipboardCheck className="h-4 w-4" />
            Archive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="overflow-hidden rounded-2xl md:rounded-3xl border-stone-100 bg-white shadow-sm">
            <CardHeader className="bg-white border-b border-stone-100 pb-5 px-6">
              <CardTitle className="text-xl font-bold text-stone-900 tracking-tight">Active Queue</CardTitle>
              <CardDescription className="text-stone-500 font-medium text-sm">Monitoring orders currently being processed in the kitchen.</CardDescription>
            </CardHeader>
            <CardContent className="grid p-0 lg:grid-cols-[240px_1fr]">
              <aside className="space-y-4 border-b border-stone-100 bg-white p-5 lg:border-b-0 lg:border-r">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                    <SlidersHorizontal className="h-4 w-4" />
                    Orders Sidebar
                  </h3>
                  <p className="mt-1 text-xs text-stone-500">Filter and monitor active service queue.</p>
                </div>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-stone-900" />
                  <Input
                    className="h-10 rounded-xl border-stone-200 bg-white pl-10 font-medium transition-all focus-visible:ring-stone-950"
                    placeholder="Search order or item..."
                    value={activeSearch}
                    onChange={(e) => setActiveSearch(e.target.value)}
                  />
                </div>
                <div className="hidden lg:block space-y-2">
                  <div className="rounded-xl border border-stone-100 bg-stone-50/30 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Active Orders</p>
                    <p className="mt-1 text-2xl font-black text-stone-900">{activeOrders.length}</p>
                  </div>
                  <div className="rounded-xl border border-stone-100 bg-stone-50/30 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Filtered Results</p>
                    <p className="mt-1 text-2xl font-black text-stone-900">{filteredActiveOrders.length}</p>
                  </div>
                </div>
              </aside>
              <div>
                <div className="space-y-3 p-4 lg:hidden">
                  {filteredActiveOrders.length === 0 ? (
                    <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-stone-100 bg-white opacity-40">
                      <Clock className="mb-2 h-10 w-10 text-stone-300" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Kitchen Clear</p>
                      <p className="mt-1 text-[10px] font-medium">Ready for next orders.</p>
                    </div>
                  ) : (
                    filteredActiveOrders.map((order) => (
                      <article key={order.id} className="space-y-3 rounded-xl border border-stone-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="text-left text-sm font-black uppercase tracking-tighter text-stone-900 underline underline-offset-4 decoration-stone-300 hover:decoration-stone-900 transition-colors"
                          >
                            {order.orderId}
                          </button>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                            {order.createdAt ? formatDateTime(order.createdAt).split(",")[1] : "-"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {order.items.map((it, idx) => (
                            <Badge key={idx} variant="outline" className="h-6 border-stone-200 bg-stone-50 px-1.5 text-[9px] font-bold">
                              {it.name} <span className="ml-1 text-stone-400">x{it.qty}</span>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-stone-900">{formatCurrency(order.totalAmount)}</span>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleCancel(order.id)}
                                className="h-9 rounded-xl border-rose-100 bg-white px-3 text-[10px] font-black uppercase tracking-widest text-rose-600 shadow-sm transition-all hover:bg-rose-50 hover:text-rose-700"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => void handleComplete(order.id)}
                                className="h-9 rounded-xl bg-stone-900 px-4 text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-all hover:bg-emerald-600"
                              >
                                Finalize
                              </Button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
                <div className="hidden overflow-x-auto lg:block">
                  <Table>
                    <TableHeader className="bg-white">
                      <TableRow className="hover:bg-transparent border-stone-100 h-12">
                        <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-6 md:pl-8">Order ID</TableHead>
                        <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4">Customer</TableHead>
                        <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4">Order Items</TableHead>
                        <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4">Amount Due</TableHead>
                        <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4">Received At</TableHead>
                        <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4 pr-6 md:pr-8">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredActiveOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center opacity-40">
                              <Clock className="h-12 w-12 mb-3" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Kitchen Clear</p>
                              <p className="text-[10px] font-medium mt-1">Ready for next orders.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredActiveOrders.map((order) => (
                          <TableRow key={order.id} className="group hover:bg-stone-50/50 transition-all border-stone-100">
                            <TableCell className="pl-6 md:pl-8 py-4">
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(order)}
                                className="font-black text-sm uppercase tracking-tight text-stone-900 underline underline-offset-4 decoration-stone-300 hover:decoration-stone-900 transition-colors"
                              >
                                {order.orderId}
                              </button>
                            </TableCell>
                            <TableCell className="pl-4">
                              <span className="font-bold text-sm text-stone-900">{order.customerName || "—"}</span>
                            </TableCell>
                            <TableCell className="max-w-[320px] pl-4">
                              <div className="flex flex-wrap gap-1">
                                {order.items.map((it, idx) => (
                                  <Badge key={idx} variant="outline" className="bg-stone-50 text-[9px] font-bold border-stone-200 px-1.5 h-6">
                                    {it.name} <span className="text-stone-400 ml-1">x{it.qty}</span>
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="pl-4">
                              <span className="font-black text-stone-900 text-sm">{formatCurrency(order.totalAmount)}</span>
                            </TableCell>
                            <TableCell className="pl-4">
                              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                {order.createdAt ? formatDateTime(order.createdAt).split(",")[1] : "-"}
                              </span>
                            </TableCell>
                            <TableCell className="pl-4 pr-6 md:pr-8 w-44">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleCancel(order.id)}
                                  className="h-9 px-3 font-bold text-xs bg-white text-rose-600 border-rose-100 hover:bg-rose-50 hover:text-rose-700 transition-all active:scale-95 shadow-sm rounded-xl"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => void handleComplete(order.id)}
                                  className="h-9 px-4 font-bold text-xs bg-stone-900 text-white rounded-xl shadow-sm hover:bg-emerald-600 transition-all active:scale-95"
                                >
                                  Finalize
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="overflow-hidden rounded-2xl md:rounded-3xl border-stone-100 bg-white shadow-sm">
            <CardHeader className="bg-white border-b border-stone-100 pb-5 px-6">
              <CardTitle className="text-xl font-bold text-stone-900 tracking-tight">Order Logs</CardTitle>
              <CardDescription className="text-stone-500 font-medium text-sm">A comprehensive record of all finalized transactions.</CardDescription>
            </CardHeader>
            <CardContent className="grid p-0 lg:grid-cols-[240px_1fr]">
              <aside className="space-y-4 border-b border-stone-100 bg-white p-5 lg:border-b-0 lg:border-r">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                    <SlidersHorizontal className="h-4 w-4" />
                    Orders Sidebar
                  </h3>
                  <p className="mt-1 text-xs text-stone-500">Find historical transactions quickly.</p>
                </div>
                <div className="space-y-3">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-stone-900" />
                    <Input
                      className="h-10 rounded-xl border-stone-200 bg-white pl-10 font-medium transition-all focus-visible:ring-stone-950"
                      placeholder="Search order or item..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                    />
                  </div>
                  <Select
                    value={historyStatus}
                    onValueChange={(value: "all" | "completed") => setHistoryStatus(value)}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white font-semibold text-stone-600">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-stone-200">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="space-y-1">
                    <Input
                      type="date"
                      className="h-10 rounded-xl border-stone-200 bg-white font-medium text-stone-600 focus-visible:ring-stone-950 px-3 cursor-pointer"
                      value={historyDate}
                      onChange={(e) => setHistoryDate(e.target.value)}
                    />
                    {historyDate && (
                      <button onClick={() => setHistoryDate("")} className="text-[10px] text-stone-400 hover:text-stone-900 font-bold uppercase tracking-widest pl-1 transition-colors">
                        Clear Date Filter
                      </button>
                    )}
                  </div>
                </div>
                <div className="hidden lg:block space-y-2">
                  <div className="rounded-xl border border-stone-100 bg-stone-50/30 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total Logs</p>
                    <p className="mt-1 text-2xl font-black text-stone-900">{historyOrders.length}</p>
                  </div>
                  <div className="rounded-xl border border-stone-100 bg-stone-50/30 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Filtered Results</p>
                    <p className="mt-1 text-2xl font-black text-stone-900">{filteredHistoryOrders.length}</p>
                  </div>
                </div>
              </aside>
              <div>
                <div className="space-y-3 p-4 lg:hidden">
                  {filteredHistoryOrders.length === 0 ? (
                    <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-stone-100 bg-white opacity-40">
                      <ClipboardCheck className="mb-2 h-10 w-10 text-stone-300" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">History Empty</p>
                    </div>
                  ) : (
                    paginatedHistory.map((order) => (
                      <article key={order.id} className="space-y-3 rounded-xl border border-stone-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="text-left text-sm font-black uppercase tracking-tighter text-stone-900 underline underline-offset-4 decoration-stone-300 hover:decoration-stone-900 transition-colors"
                          >
                            {order.orderId}
                          </button>
                          <Badge variant={order.status === "completed" ? "success" : "destructive"} className="h-5 rounded-full px-2.5 text-[8px] font-black uppercase tracking-[0.1em] shadow-sm">
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-black text-stone-950">{formatCurrency(order.totalAmount)}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                          {order.completedAt ? formatDateTime(order.completedAt) : "-"}
                        </p>
                      </article>
                    ))
                  )}
                </div>
                <div className="hidden overflow-x-auto lg:block">
                  <Table>
                    <TableHeader className="bg-white">
                      <TableRow className="hover:bg-transparent border-stone-100 h-12">
                        <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-6 md:pl-8">Order Ref</TableHead>
                        <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4">Customer</TableHead>
                        <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4">Net Amount</TableHead>
                        <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-4">Status</TableHead>
                        <TableHead className="text-left py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pr-6 md:pr-8 pl-4">Completion Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistoryOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center opacity-40">
                              <ClipboardCheck className="h-12 w-12 mb-3" />
                              <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">History Empty</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedHistory.map((order) => (
                          <TableRow key={order.id} className="hover:bg-stone-50/50 transition-all border-stone-100">
                            <TableCell className="pl-6 md:pl-8 py-5">
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(order)}
                                className="font-black text-sm uppercase tracking-tighter text-stone-900 underline underline-offset-4 decoration-stone-300 hover:decoration-stone-900 transition-colors"
                              >
                                {order.orderId}
                              </button>
                            </TableCell>
                            <TableCell className="pl-4 font-bold text-stone-900 text-sm">{order.customerName || "—"}</TableCell>
                            <TableCell className="pl-4 font-black text-stone-950 text-sm">{formatCurrency(order.totalAmount)}</TableCell>
                            <TableCell className="pl-4">
                              <Badge variant={order.status === "completed" ? "success" : "destructive"} className="rounded-full text-[8px] font-black uppercase tracking-[0.1em] px-2.5 h-4 shadow-sm">
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="pl-4 pr-6 md:pr-8 text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                              {order.completedAt ? formatDateTime(order.completedAt) : "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="bg-white border-t border-stone-100 py-3">
                  <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredHistoryOrders.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                    pageSizeOptions={[10, 20, 30, 50]}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md rounded-2xl border-stone-100 sm:p-8 p-6 shadow-2xl bg-[#fafafa] flex flex-col font-mono text-stone-900 custom-scrollbar">
          <DialogTitle className="sr-only">Receipt for {selectedOrder?.orderId}</DialogTitle>
          <div className="mx-auto w-full max-w-sm">
            {selectedOrder ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-stone-900 text-white rounded-full flex items-center justify-center mb-4">
                  <ClipboardCheck className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-widest mb-1 text-center">Receipt</h2>
                <p className="text-xs text-stone-500 mb-6 text-center">{selectedOrder.orderId}</p>

                <div className="w-full border-b-[2px] border-dashed border-stone-300 mb-6"></div>

                <div className="w-full space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Date</span>
                    <span className="text-right">{selectedOrder.createdAt ? formatDateTime(selectedOrder.createdAt) : "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Customer</span>
                    <span className="text-right font-bold">{selectedOrder.customerName || "Walk-in"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Status</span>
                    <span className="text-right uppercase font-bold">{selectedOrder.status}</span>
                  </div>
                </div>

                <div className="w-full border-b border-dashed border-stone-300 my-6"></div>

                <div className="w-full space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between text-stone-400 uppercase tracking-widest text-[10px] font-bold mb-1">
                    <span>Qty x Item</span>
                    <span>Amount</span>
                  </div>
                  {selectedOrder.items.map((item, index) => (
                    <div key={`${item.productId}-${index}`} className="flex items-start justify-between gap-2 overflow-hidden w-full">
                      <div className="pr-2 flex-1 min-w-0 break-words overflow-hidden">
                        <p className="font-bold leading-tight break-words text-wrap">{item.qty} x {item.name}</p>
                        <p className="text-[10px] sm:text-xs text-stone-500 mt-0.5 break-words whitespace-normal leading-tight">@{formatCurrency(item.price)} ea {item.addonsPrice ? `(+${formatCurrency(item.addonsPrice)} addons)` : ''}</p>
                      </div>
                      <p className="font-bold shrink-0 text-right pt-[1px]">{formatCurrency((item.price * item.qty) + (item.addonsPrice || 0))}</p>
                    </div>
                  ))}
                </div>

                <div className="w-full border-b-[2px] border-dashed border-stone-300 my-6"></div>

                <div className="w-full space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Total Items</span>
                    <span>{selectedOrderTotalItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Net Amount</span>
                    <span className="font-black text-base">{formatCurrency(selectedOrder.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Cash Received</span>
                    <span>{formatCurrency(selectedOrder.cashReceived)}</span>
                  </div>
                  <div className="flex justify-between font-black text-lg mt-2 pt-2 border-t border-stone-200">
                    <span>CHANGE</span>
                    <span>{formatCurrency(selectedOrder.change)}</span>
                  </div>
                </div>

                <div className="mt-8 mb-2 flex flex-col items-center opacity-40">
                  <div className="h-10 w-48 bg-[repeating-linear-gradient(90deg,#1c1917_0,#1c1917_3px,transparent_3px,transparent_6px,#1c1917_6px,#1c1917_8px,transparent_8px,transparent_12px)]"></div>
                  <p className="text-[10px] uppercase tracking-widest mt-2 font-bold">Thank you</p>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
