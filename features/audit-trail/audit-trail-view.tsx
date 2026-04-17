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

      <Card className="border-stone-200 shadow-xl shadow-stone-200/40 overflow-hidden rounded-2xl bg-white">
        <CardHeader className="bg-stone-50/80 backdrop-blur-md pb-6 border-b border-stone-100">
           <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-stone-400">Activity stream</CardTitle>
           <CardDescription className="text-[11px] font-medium text-stone-500">Real-time telemetry of system-wide alterations.</CardDescription>
        </CardHeader>
        <CardContent className="grid p-0 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-5 border-b border-stone-100 bg-stone-50/60 p-5 lg:border-b-0 lg:border-r">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                <SlidersHorizontal className="h-4 w-4" />
                Audit Sidebar
              </h3>
              <p className="mt-1 text-xs text-stone-500">Filter and monitor system-wide audit records.</p>
            </div>
            <div className="space-y-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-stone-900" />
                <Input
                  placeholder="Search forensic logs..."
                  className="h-10 rounded-xl border-stone-200 bg-white pl-10 font-medium transition-all focus-visible:ring-stone-900"
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
                <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white font-semibold text-stone-600">
                  <SelectValue placeholder="Gateway" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-stone-200">
                  <SelectItem value="all">All Gateways</SelectItem>
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
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Total Logs</p>
                <p className="mt-1 text-2xl font-black text-stone-900">{entries.length}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Filtered Results</p>
                <p className="mt-1 text-2xl font-black text-stone-900">{filtered.length}</p>
              </div>
            </div>
          </aside>
          <div>
          <Table>
            <TableHeader className="bg-stone-50/30">
              <TableRow className="hover:bg-transparent border-stone-100 h-14">
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 pl-8 w-[140px]">Gateway</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 w-[140px]">Event Type</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Description</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 w-[160px]">Actor</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 pr-8 w-[180px]">Timestamp</TableHead>
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
                    <TableCell className="pl-8">
                       <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-stone-200 bg-white h-5">
                         {entry.module}
                       </Badge>
                    </TableCell>
                    <TableCell>
                       <span className="text-[10px] font-black uppercase tracking-tighter text-stone-400 group-hover:text-stone-950 transition-colors">{entry.action}</span>
                    </TableCell>
                    <TableCell>
                       <p className="text-sm font-bold text-stone-900 tracking-tight leading-snug">{entry.description}</p>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2">
                         <div className="h-6 w-6 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
                           <span className="text-[8px] font-black uppercase text-stone-400">{entry.performedBy.slice(0,1)}</span>
                         </div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{entry.performedBy}</span>
                       </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                       <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.1em]">
                         {entry.createdAt ? formatDateTime(entry.createdAt) : "-"}
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
