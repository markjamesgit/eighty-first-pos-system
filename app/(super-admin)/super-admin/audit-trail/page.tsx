"use client";

import { useEffect, useState } from "react";
import { 
  Activity, 
  Search, 
  Filter, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  Building2,
  Calendar,
  RefreshCw,
  MoreHorizontal,
  Download
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TablePagination } from "@/components/ui/table-pagination";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  clientId: string;
  userId: string;
  timestamp: any;
  metadata?: any;
  module?: string;
  description?: string;
  performedBy?: string;
};

export default function SuperAdminAuditTrailPage() {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  async function loadLogs() {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const url = moduleFilter === "all" 
        ? "/api/super-admin/audit-logs?limit=200" 
        : `/api/super-admin/audit-logs?limit=200&module=${moduleFilter}`;
        
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setLogs(data.logs ?? []);
      }
    } catch (error) {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) void loadLogs();
  }, [authLoading, user, moduleFilter]);

  const filteredLogs = logs.filter(log => {
    const searchStr = search.toLowerCase();
    return (log.action?.toLowerCase().includes(searchStr) ||
            log.module?.toLowerCase().includes(searchStr) ||
            log.description?.toLowerCase().includes(searchStr) ||
            log.performedBy?.toLowerCase().includes(searchStr) ||
            log.clientId?.toLowerCase().includes(searchStr));
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const modules = [
    "Authentication", 
    "Dashboard", 
    "Tenants", 
    "Analytics"
  ];

  function exportToCSV() {
    if (logs.length === 0) {
      toast.error("No logs to export.");
      return;
    }

    const headers = ["ID", "Action", "Module", "Description", "Operator", "Timestamp"];
    const rows = filteredLogs.map(log => [
      log.id,
      log.action,
      log.module || "SYSTEM",
      log.description || "",
      log.performedBy || "System",
      log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : ""
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_trail_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Audit trail exported successfully.");
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tighter">Super Admin Audit</h1>
          <p className="text-[10px] text-stone-500 font-black uppercase tracking-[0.2em] mt-1 opacity-60">Log of administrative and platform-level operations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={exportToCSV}
            className="rounded-xl bg-stone-900 h-10 px-4 text-xs font-bold text-white hover:bg-stone-800 shadow-lg shadow-stone-200 transition-all w-full md:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Archive
          </Button>
        </div>
      </header>



      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-100 bg-stone-50/50 p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input 
              placeholder="Search activity..." 
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-10 rounded-xl border-stone-200 bg-white" 
            />
          </div>
          <div className="flex items-center gap-3">
             <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Filter Module</label>
             <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-10 w-[180px] rounded-xl border-stone-200 bg-white text-xs font-bold">
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-stone-200">
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
             </Select>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-stone-100 bg-stone-50/50">
                <TableHead className="py-4 text-[10px] font-black text-stone-400 uppercase tracking-[0.15em] pl-6">Operation / Description</TableHead>
                <TableHead className="py-4 text-[10px] font-black text-stone-400 uppercase tracking-[0.15em] text-center">Module</TableHead>
                <TableHead className="py-4 text-[10px] font-black text-stone-400 uppercase tracking-[0.15em] text-center">Operator</TableHead>
                <TableHead className="py-4 text-[10px] font-black text-stone-400 uppercase tracking-[0.15em] text-center">Timestamp</TableHead>
                <TableHead className="py-4 text-[10px] font-black text-stone-400 uppercase tracking-[0.15em] text-right pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map((log) => (
                <TableRow key={log.id} className="group transition-colors hover:bg-stone-50/50 border-stone-50">
                  <TableCell className="py-5 pl-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600 border border-stone-200 group-hover:bg-white transition-colors">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-stone-900 capitalize tracking-tight">{log.action?.replace("_", " ")}</span>
                        <span className="text-[10px] text-stone-500 font-medium truncate opacity-70">{log.description || "System operation performed"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border-stone-200 text-stone-500 bg-white">
                        {log.module || "SYSTEM"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-[10px] font-black text-stone-600 group-hover:bg-white transition-colors">
                        {(log.performedBy || "S").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-stone-600 tracking-tight">{log.performedBy || "System"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-stone-400 whitespace-nowrap tracking-tight">
                      <Clock className="h-3.5 w-3.5 text-stone-200" />
                      {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "N/A"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-stone-300 hover:text-stone-900 hover:bg-stone-100 transition-all">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-stone-500">
                    {loading ? "Loading logs..." : "No matching events found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="lg:hidden p-4 space-y-4 bg-stone-50/50">
          {paginatedLogs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-900 text-white shadow-md">
                    <Activity className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-stone-900 capitalize tracking-tight">{log.action?.replace("_", " ")}</span>
                </div>
                <Badge variant="outline" className="text-[8px] font-black border-stone-200">
                  {log.module || "SYSTEM"}
                </Badge>
              </div>
              <p className="text-[11px] text-stone-500 font-medium leading-snug pl-1">
                {log.description}
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-stone-100 flex items-center justify-center text-[8px] font-black text-stone-500">
                    {(log.performedBy || "S").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[10px] font-bold text-stone-600">{log.performedBy || "System"}</span>
                </div>
                <span className="text-[10px] font-bold text-stone-400">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}</span>
              </div>
            </div>
          ))}
          {paginatedLogs.length === 0 && (
            <div className="py-20 text-center">
               <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">No activity recorded</p>
            </div>
          )}
        </div>

        <div className="border-t border-stone-100 bg-white">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredLogs.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        </div>
      </div>

      <footer className="flex items-center justify-between text-[11px] text-stone-400 font-medium">
        <p>Showing {paginatedLogs.length} of {filteredLogs.length} logs</p>
        <p>ID: pos-saas-2be27</p>
      </footer>
    </div>
  );
}


