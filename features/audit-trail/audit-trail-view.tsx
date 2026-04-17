"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { formatDateTime } from "@/lib/utils";
import type { AuditTrailEntry } from "@/lib/types/domain";
import { listAuditTrail } from "@/services/firebase/audit-trail";
import { Search, History, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AuditTrailView() {
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    void listAuditTrail(1000)
      .then((data) => {
        setEntries(data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const moduleOptions = useMemo(() => {
    const modules = entries.map((entry) => entry.module).filter(Boolean);
    return Array.from(new Set(modules)).sort((a, b) => a.localeCompare(b));
  }, [entries]);
  const safeModuleFilter = useMemo(
    () => (moduleFilter === "all" || moduleOptions.includes(moduleFilter) ? moduleFilter : "all"),
    [moduleFilter, moduleOptions],
  );

  const filtered = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return entries.filter((item) => {
      const matchesModule = safeModuleFilter === "all" || item.module === safeModuleFilter;
      const matchesSearch =
        !needle ||
        [item.module, item.action, item.description, item.performedBy]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      return matchesModule && matchesSearch;
    });
  }, [entries, search, safeModuleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginated = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safeCurrentPage, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-3">
             System Surveillance
          </h1>
          <p className="text-sm text-stone-500 font-medium">
            Verifiable logs of all administrative actions and system modifications.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl md:rounded-3xl border-stone-100 bg-white shadow-sm">
        <CardHeader className="bg-white border-b border-stone-100 pb-5 px-6">
           <CardTitle className="text-xl font-bold text-stone-900 tracking-tight">Activity stream</CardTitle>
           <CardDescription className="text-sm font-medium text-stone-500">Real-time telemetry of system-wide alterations.</CardDescription>
        </CardHeader>
        <CardContent className="grid p-0 lg:grid-cols-[240px_1fr]">
              <aside className="space-y-4 border-b border-stone-100 bg-white p-5 lg:border-b-0 lg:border-r">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                <SlidersHorizontal className="h-4 w-4" />
                Audit Sidebar
              </h3>
              <p className="mt-1 text-xs text-stone-500 font-medium">Filter and monitor records.</p>
            </div>
            <div className="space-y-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-stone-900" />
                <Input
                  placeholder="Search logs..."
                  className="h-10 rounded-xl border-stone-100 bg-white pl-10 font-medium transition-all focus-visible:ring-stone-950"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <Select
                value={safeModuleFilter}
                onValueChange={(value) => {
                  setModuleFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 rounded-xl border-stone-100 bg-white font-medium text-stone-600">
                  <SelectValue placeholder="Gateway" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-stone-100">
                  <SelectItem value="all">All Gateways</SelectItem>
                  {moduleOptions.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="hidden lg:block space-y-2">
              <div className="rounded-xl border border-stone-100 bg-stone-50/40 p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total Logs</p>
                <p className="mt-1 text-2xl font-black text-stone-900">{entries.length}</p>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50/40 p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Filtered Results</p>
                <p className="mt-1 text-2xl font-black text-stone-900">{filtered.length}</p>
              </div>
            </div>
          </aside>
          <div>
          <div className="space-y-3 p-4 lg:hidden">
            {loading ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-stone-100 bg-white opacity-40 animate-pulse">
                <History className="mb-2 h-10 w-10 text-stone-300" />
                <p className="text-[10px] font-black uppercase tracking-widest">Retrieving Logs...</p>
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-stone-100 bg-white opacity-30">
                <Search className="mb-2 h-10 w-10 text-stone-300" />
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">No activity matches your query</p>
              </div>
            ) : (
              paginated.map((entry) => (
                <article key={entry.id} className="space-y-3 rounded-xl border border-stone-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="h-5 border-stone-200 bg-white text-[9px] font-black uppercase tracking-widest">
                      {entry.module}
                    </Badge>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      {entry.createdAt ? formatDateTime(entry.createdAt) : "-"}
                    </span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-stone-500">{entry.action}</p>
                  <p className="text-sm font-bold leading-snug text-stone-900">{entry.description}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">{entry.performedBy}</p>
                </article>
              ))
            )}
          </div>
              <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow className="hover:bg-transparent border-stone-100 h-12">
                    <TableHead className="py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-6 md:pl-8 w-[140px]">Gateway</TableHead>
                    <TableHead className="py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 w-[140px]">Event Type</TableHead>
                    <TableHead className="py-0 text-xs font-semibold uppercase tracking-wider text-stone-400">Description</TableHead>
                    <TableHead className="py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 w-[160px]">Actor</TableHead>
                    <TableHead className="text-right py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pr-6 md:pr-8 w-[180px]">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center opacity-40 animate-pulse">
                      <History className="h-12 w-12 mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Retrieving Logs...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center opacity-30">
                      <Search className="h-12 w-12 mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">No activity matches your query</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-stone-50/50 transition-all border-stone-100 group">
                    <TableCell className="pl-6 md:pl-8 py-4">
                       <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider border-stone-100 bg-white h-5 shadow-sm">
                         {entry.module}
                       </Badge>
                    </TableCell>
                    <TableCell>
                       <span className="text-[11px] font-bold uppercase tracking-tight text-stone-400 group-hover:text-stone-900 transition-colors">{entry.action}</span>
                    </TableCell>
                    <TableCell>
                       <p className="text-sm font-bold text-stone-900 tracking-tight leading-snug">{entry.description}</p>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2">
                         <div className="h-6 w-6 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center">
                           <span className="text-[8px] font-bold uppercase text-stone-500">{entry.performedBy.slice(0,1)}</span>
                         </div>
                         <span className="text-xs font-bold text-stone-700">{entry.performedBy}</span>
                       </div>
                    </TableCell>
                    <TableCell className="text-right pr-6 md:pr-8">
                       <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                         {entry.createdAt ? formatDateTime(entry.createdAt) : "-"}
                       </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

              <div className="bg-white border-t border-stone-100 py-3">
            <TablePagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              pageSizeOptions={[15, 25, 50, 100]}
            />
          </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
