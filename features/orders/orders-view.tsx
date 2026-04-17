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
import { completeOrder, listOrderHistory, subscribeToActiveOrders } from "@/services/firebase/orders";
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
  const [historyStatus, setHistoryStatus] = useState<"all" | "completed">("all");
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
      return matchesStatus && matchesSearch;
    });
  }, [historyOrders, historySearch, historyStatus]);

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHistoryOrders.slice(start, start + pageSize);
  }, [filteredHistoryOrders, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredHistoryOrders.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [historySearch, historyStatus, pageSize]);

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
        <TabsList className="bg-stone-100/50 backdrop-blur-sm p-1.5 rounded-2xl border border-stone-200 mb-8 inline-flex">
          <TabsTrigger value="active" className="flex items-center gap-2 px-6 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-stone-900 data-[state=active]:text-white transition-all shadow-sm">
            <Clock className="h-3.5 w-3.5" />
            Active Service
            {activeOrders.length > 0 && (
              <Badge variant="warning" className="ml-2 rounded-full px-1.5 h-4 text-[9px] font-black shadow-sm ring-2 ring-white">
                {activeOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 px-6 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-stone-900 data-[state=active]:text-white transition-all">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Archive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="overflow-hidden rounded-2xl border-stone-200 bg-white shadow-xl shadow-stone-200/40">
            <CardHeader className="bg-stone-50/80 border-b border-stone-100 pb-6">
              <CardTitle className="text-xl font-black text-stone-900 tracking-tight">Active Queue</CardTitle>
              <CardDescription className="text-stone-500 font-medium">Monitoring orders currently being processed in the kitchen.</CardDescription>
            </CardHeader>
            <CardContent className="grid p-0 lg:grid-cols-[260px_1fr]">
              <aside className="space-y-5 border-b border-stone-100 bg-stone-50/60 p-5 lg:border-b-0 lg:border-r">
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
                <div className="space-y-2">
                  <div className="rounded-xl border border-stone-200 bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Active Orders</p>
                    <p className="mt-1 text-2xl font-black text-stone-900">{activeOrders.length}</p>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Filtered Results</p>
                    <p className="mt-1 text-2xl font-black text-stone-900">{filteredActiveOrders.length}</p>
                  </div>
                </div>
              </aside>
              <div>
              <Table>
                <TableHeader className="bg-stone-50/30">
                  <TableRow className="hover:bg-transparent border-stone-100">
                    <TableHead className="h-12 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 pl-8">Order ID</TableHead>
                    <TableHead className="h-12 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Order Items</TableHead>
                    <TableHead className="h-12 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 text-center">Amount Due</TableHead>
                    <TableHead className="h-12 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 text-center">Received At</TableHead>
                    <TableHead className="h-12 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 text-right pr-8">Actions</TableHead>
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
                      <TableRow key={order.id} className="group hover:bg-stone-50/50 transition-all border-stone-100 py-4">
                        <TableCell className="pl-8">
                           <button
                             type="button"
                             onClick={() => setSelectedOrder(order)}
                             className="font-black text-sm uppercase tracking-tighter text-stone-950 underline-offset-4 hover:underline"
                           >
                             {order.orderId}
                           </button>
                        </TableCell>
                        <TableCell className="max-w-[320px]">
                           <div className="flex flex-wrap gap-1">
                             {order.items.map((it, idx) => (
                               <Badge key={idx} variant="outline" className="bg-stone-50 text-[9px] font-bold border-stone-200 px-1.5 h-6">
                                  {it.name} <span className="text-stone-400 ml-1">x{it.qty}</span>
                               </Badge>
                             ))}
                           </div>
                        </TableCell>
                        <TableCell className="text-center">
                           <span className="font-black text-stone-900 text-sm">{formatCurrency(order.totalAmount)}</span>
                        </TableCell>
                        <TableCell className="text-center">
                           <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                             {order.createdAt ? formatDateTime(order.createdAt).split(",")[1] : "-"}
                           </span>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                           <Button 
                             size="sm" 
                             onClick={() => void handleComplete(order.id)} 
                             className="h-9 px-6 font-black text-[10px] uppercase tracking-widest bg-stone-900 text-white rounded-xl shadow-md hover:bg-emerald-600 transition-all transform active:scale-95 group-hover:bg-stone-950"
                           >
                             Finalize
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="overflow-hidden rounded-2xl border-stone-200 bg-white shadow-xl shadow-stone-200/40">
            <CardHeader className="bg-stone-50/80 border-b border-stone-100 pb-6">
              <CardTitle className="text-xl font-black text-stone-900 tracking-tight">Order Logs</CardTitle>
              <CardDescription className="text-stone-500 font-medium text-xs">A comprehensive record of all finalized transactions.</CardDescription>
            </CardHeader>
            <CardContent className="grid p-0 lg:grid-cols-[260px_1fr]">
              <aside className="space-y-5 border-b border-stone-100 bg-stone-50/60 p-5 lg:border-b-0 lg:border-r">
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
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="rounded-xl border border-stone-200 bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Total Logs</p>
                    <p className="mt-1 text-2xl font-black text-stone-900">{historyOrders.length}</p>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Filtered Results</p>
                    <p className="mt-1 text-2xl font-black text-stone-900">{filteredHistoryOrders.length}</p>
                  </div>
                </div>
              </aside>
              <div>
              <Table>
                <TableHeader className="bg-stone-50/30">
                  <TableRow className="hover:bg-transparent border-stone-100">
                    <TableHead className="h-12 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 pl-8">Order Ref</TableHead>
                    <TableHead className="h-12 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 text-center">Net Amount</TableHead>
                    <TableHead className="h-12 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 text-center">Status</TableHead>
                    <TableHead className="h-12 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 text-right pr-8">Completion Time</TableHead>
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
                        <TableCell className="pl-8 py-5">
                           <button
                             type="button"
                             onClick={() => setSelectedOrder(order)}
                             className="font-black text-sm uppercase tracking-tighter text-stone-900 underline-offset-4 hover:underline"
                           >
                             {order.orderId}
                           </button>
                        </TableCell>
                        <TableCell className="text-center font-black text-stone-950 text-sm">{formatCurrency(order.totalAmount)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="success" className="rounded-full text-[8px] font-black uppercase tracking-[0.1em] px-2.5 h-4 shadow-sm">
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                          {order.completedAt ? formatDateTime(order.completedAt) : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              <div className="bg-stone-50/30 border-t border-stone-100 py-2">
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-stone-900">
              Order Details {selectedOrder ? `- ${selectedOrder.orderId}` : ""}
            </DialogTitle>
            <DialogDescription>
              Review complete order information including items, totals, and payment.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder ? (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50/60 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Status</p>
                  <p className="mt-1 text-sm font-semibold text-stone-900">{selectedOrder.status}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Total Items</p>
                  <p className="mt-1 text-sm font-semibold text-stone-900">{selectedOrderTotalItems}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Created At</p>
                  <p className="mt-1 text-sm font-semibold text-stone-900">
                    {selectedOrder.createdAt ? formatDateTime(selectedOrder.createdAt) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Completed At</p>
                  <p className="mt-1 text-sm font-semibold text-stone-900">
                    {selectedOrder.completedAt ? formatDateTime(selectedOrder.completedAt) : "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-white">
                <div className="border-b border-stone-100 px-4 py-3">
                  <p className="text-sm font-bold text-stone-900">Ordered Items</p>
                </div>
                <div className="space-y-2 p-4">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={`${item.productId}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-900">{item.name}</p>
                        <p className="text-xs text-stone-500">
                          {formatCurrency(item.price)} x {item.qty}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-stone-900">{formatCurrency(item.price * item.qty)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-600">Total Amount</span>
                  <span className="font-bold text-stone-900">{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-stone-600">Cash Received</span>
                  <span className="font-bold text-stone-900">{formatCurrency(selectedOrder.cashReceived)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-stone-200 pt-2 text-sm">
                  <span className="text-stone-600">Change</span>
                  <span className="font-bold text-stone-900">{formatCurrency(selectedOrder.change)}</span>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
