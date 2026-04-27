"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Users, 
  Building2, 
  TrendingUp, 
  CheckCircle2,
  Eye,
  EyeOff,
  Activity,
  ArrowUpRight,
  Clock,
  ShieldCheck
} from "lucide-react";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type DashboardStats = {
  totalClients: number;
  activeClients: number;
  totalRevenue: number;
};

type TopClient = {
  clientId: string;
  totalTransactions: number;
  totalProducts: number;
  lastActiveAt: { seconds: number; nanoseconds: number } | string;
};

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  timestamp: { seconds: number; nanoseconds: number };
  userId: string;
};

export default function SuperAdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [searchResults, setSearchResults] = useState<{ uid: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchDashboardData() {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/super-admin/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setStats(data.stats);
        setTopClients(data.topClients);
        setRecentLogs(data.recentLogs);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      void fetchDashboardData();
    }
  }, [authLoading, user]);

  if (loading || authLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
      </div>
    );
  }

  const chartData = topClients.map((c, i) => ({
    name: `Client ${i + 1}`,
    transactions: c.totalTransactions,
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Super Admin Overview</h1>
          <p className="text-sm text-stone-500">Global platform performance and tenant health.</p>
        </div>
      </header>



      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard 
          title="Total Tenants" 
          value={stats?.totalClients ?? 0} 
          icon={<Building2 className="h-5 w-5" />}
          trend="+2 this week"
          color="stone"
        />
        <StatCard 
          title="Active Clients" 
          value={stats?.activeClients ?? 0} 
          icon={<Users className="h-5 w-5" />}
          trend="98% uptime"
          color="emerald"
        />
        <StatCard 
          title="Platform Activity" 
          value={topClients.reduce((sum, c) => sum + c.totalTransactions, 0)} 
          icon={<TrendingUp className="h-5 w-5" />}
          trend="Across all tenants"
          color="blue"
        />
      </div>
      <div className="grid gap-6">
        {/* Usage Chart */}

        <div className="rounded-2xl border border-stone-200 bg-white p-4 md:p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-900">Store Activity Overview</h3>
            <Link href="/super-admin/analytics" className="text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors">
              View Detailed Report →
            </Link>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: "#78716c" }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: "#78716c" }} 
                />
                <Tooltip 
                  cursor={{ fill: "#fafaf9" }}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                />
                <Bar dataKey="transactions" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#1c1917" : "#57534e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}


function StatCard({ title, value, icon, trend, color }: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  trend: string;
  color: "stone" | "emerald" | "blue";
}) {
  const isDark = color === "stone";

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-6 shadow-sm border transition-all hover:shadow-md",
      isDark ? "bg-stone-900 border-stone-800 text-white" : "bg-white border-stone-200 text-stone-900"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "p-2.5 rounded-xl border",
          isDark ? "bg-white/5 border-white/10 text-white" : "bg-stone-50 border-stone-100 text-stone-600"
        )}>
          {icon}
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest",
          isDark ? "bg-white/10 border-white/10 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-700"
        )}>
          <TrendingUp className="h-3 w-3" />
          Live
        </div>
      </div>
      <div className="space-y-1">
        <p className={cn(
          "text-[10px] font-black uppercase tracking-[0.15em]",
          isDark ? "text-stone-400" : "text-stone-500"
        )}>
          {title}
        </p>
        <h4 className="text-4xl font-black tracking-tighter">{value}</h4>
      </div>
      <div className={cn(
        "mt-6 flex items-center justify-between border-t pt-4",
        isDark ? "border-white/5" : "border-stone-50"
      )}>
        <span className={cn(
          "text-[10px] font-bold tracking-tight",
          isDark ? "text-stone-500" : "text-stone-400"
        )}>
          {trend}
        </span>
        <ArrowUpRight className={cn("h-3.5 w-3.5", isDark ? "text-stone-700" : "text-stone-200")} />
      </div>
    </div>
  );
}

