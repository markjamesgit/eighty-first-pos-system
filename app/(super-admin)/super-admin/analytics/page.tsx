"use client";

import { useEffect, useState } from "react";
import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Download,
  Calendar,
  Activity
} from "lucide-react";

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { addAuditEntrySafe } from "@/services/firebase/audit-trail";


type AnalyticsData = {
  growthData: any[];
  sectorData: any[];
  topUsage: any[];
};

export default function SuperAdminAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("last_6_months");

  async function fetchAnalytics() {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/super-admin/analytics?range=${dateRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json();
      if (response.ok) setData(json);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  function exportAnalyticsToCSV() {
    if (!data?.topUsage) return;
    
    const headers = ["Tenant ID", "Transactions", "Products", "Firestore Reads", "Firestore Writes", "Storage (MB)"];
    const rows = data.topUsage.map((t: any) => [
      t.id,
      t.transactions,
      t.products,
      t.firestore.reads,
      t.firestore.writes,
      (t.storage.bytes / (1024 * 1024)).toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `platform_analytics_${dateRange}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Analytics data exported.");
  }

  useEffect(() => {
    if (!authLoading) void fetchAnalytics();
  }, [authLoading, user, dateRange]);

  if (loading || authLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
      </div>
    );
  }

  const COLORS = ["#1c1917", "#a8a29e", "#e7e5e4"];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tighter">Platform Analytics</h1>
          <p className="text-[10px] text-stone-500 font-black uppercase tracking-[0.2em] mt-1 opacity-60">Cross-tenant performance and resource consumption.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px] rounded-xl border-stone-200 bg-white h-10 text-xs font-bold">
              <Calendar className="mr-2 h-3.5 w-3.5 text-stone-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-stone-200">
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="last_6_months">Last 6 Months</SelectItem>
              <SelectItem value="year_to_date">Year to Date</SelectItem>
            </SelectContent>
          </Select>
          
          <button 
            className="flex h-10 items-center gap-2 rounded-xl bg-stone-900 px-4 text-xs font-bold text-white hover:bg-stone-800 transition-all shadow-lg shadow-stone-200 w-full md:w-auto justify-center"
            onClick={exportAnalyticsToCSV}
          >
            <Download className="h-4 w-4" />
            Export Data
          </button>
        </div>
      </header>

      {/* System Health Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Image Storage" 
          value={data?.platformUsage?.storageUsed || "0 GB"} 
          trend="Current Usage" 
          status="normal"
          advice="Usage is within safe limits. No action needed."
        />
        <MetricCard 
          title="Information Viewed" 
          value={data?.platformUsage?.totalReads?.toLocaleString() || "0"} 
          trend="High Traffic" 
          status="warning"
          advice="Unusually high viewing activity. Monitor for potential data scraping."
        />
        <MetricCard 
          title="System Updates" 
          value={data?.platformUsage?.totalWrites?.toLocaleString() || "0"} 
          trend="Critical Load" 
          status="critical"
          advice="System updates reaching threshold. Consider upgrading the database plan."
        />
        <MetricCard 
          title="Internet Traffic" 
          value={data?.platformUsage?.bandwidth || "0 GB"} 
          trend="Data Flow" 
          status="normal"
          advice="Internet traffic consumption is healthy."
        />
      </div>


      <div className="grid gap-6 lg:grid-cols-3">
        {/* Growth Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-white p-4 md:p-6 shadow-sm">
          <div className="mb-8">
            <h3 className="text-sm font-bold text-stone-900">Business Activity Growth</h3>
            <p className="text-[10px] text-stone-500 font-black uppercase tracking-widest mt-1">Activity levels across all stores over time.</p>
          </div>
          <div className="h-[300px] md:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.growthData || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1c1917" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#1c1917" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: "#78716c" }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: "#78716c" }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#1c1917" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tenant Distribution */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="mb-8 text-sm font-bold text-stone-900">Store Status</h3>
          <div className="flex flex-col items-center justify-center">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.sectorData || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {(data?.sectorData || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 w-full space-y-4">
              {(data?.sectorData || []).map((s: any, i: number) => (
                <div key={s.name || i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full ring-4 ring-stone-50" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{s.name} Tenants</span>

                  </div>
                  <span className="text-xs font-black text-stone-900">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Resource Usage Ranking */}
      <section className="rounded-3xl border border-stone-200 bg-white p-4 md:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Tenant Resource Usage</h3>
            <p className="text-[10px] text-stone-500 font-black uppercase tracking-widest mt-1">Detailed activity and storage per tenant.</p>
          </div>
          <TrendingUp className="h-5 w-5 text-stone-200" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(data?.topUsage || []).map((tenant: any, i: number) => (
            <div key={tenant.id || i} className="group rounded-2xl border border-stone-100 p-5 hover:border-stone-900 hover:bg-stone-50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                  <p className="text-sm font-bold text-stone-900 truncate tracking-tight">
                    {tenant.name}
                  </p>
                  <Badge variant={tenant.status === "active" ? "success" : "secondary"} className="text-[8px] h-4 w-fit px-1 font-black uppercase tracking-widest mt-1">
                    {tenant.status === "active" ? "Live" : "Suspended"}
                  </Badge>
                </div>
                <Badge className="bg-stone-900 text-white text-[8px] font-black rounded-lg">
                  RANK # {i + 1}
                </Badge>
              </div>

              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Pages Viewed</p>
                  <p className="text-sm font-black text-stone-900">{tenant.firestore.reads.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Data Saved</p>
                  <p className="text-sm font-black text-stone-900">{tenant.firestore.writes.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Stored Images</p>
                  <p className="text-sm font-black text-stone-900">{tenant.storage.images} Items</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">File Space</p>
                  <p className="text-sm font-black text-stone-900">{(tenant.storage.bytes / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
              </div>

              
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-stone-100">
                <div className="flex gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-1 w-4 rounded-full bg-stone-200" />
                  ))}
                </div>
                <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Resource Load High</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


function MetricCard({ title, value, trend, status = "normal", advice }: { 
  title: string; 
  value: string; 
  trend: string; 
  status?: "normal" | "warning" | "critical";
  advice?: string;
}) {
  return (
    <div className={cn(
      "rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300",
      status === "warning" ? "border-amber-200 bg-amber-50/30" : 
      status === "critical" ? "border-rose-200 bg-rose-50/30" : 
      "border-stone-200"
    )}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">{title}</p>
        <div className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest",
          status === "normal" ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
          status === "warning" ? "bg-amber-100 border-amber-200 text-amber-700" :
          "bg-rose-100 border-rose-200 text-rose-700"
        )}>
          {status === "normal" ? <ArrowUpRight className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
          {trend}
        </div>
      </div>
      <h4 className="text-4xl font-black text-stone-900 tracking-tighter">{value}</h4>
      {advice && (
        <div className="mt-4 p-3 rounded-xl bg-white/50 border border-current/10">
          <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Recommended Action</p>
          <p className="text-[11px] font-medium text-stone-800 leading-tight">{advice}</p>
        </div>
      )}
    </div>
  );
}


