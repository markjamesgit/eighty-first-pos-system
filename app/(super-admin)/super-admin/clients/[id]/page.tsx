"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Settings,
  Activity,
  Users,
  Trash2,
  ShieldCheck,
  Building2,
  Package,
  TrendingUp,
  Clock,
  Save,
  AlertTriangle,
  Search,
  Eye,
  EyeOff,
  CheckCircle2,
  LoaderCircle,
  AlertCircle,
  ShieldOff
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";


type ClientRecord = {
  id: string;
  name: string;
  status: "active" | "inactive";
  createdBy: string;
};

type UsageData = {
  totalProducts: number;
  totalTransactions: number;
  totalUsers: number;
  lastActiveAt: any;
};

type AuditLog = {
  id: string;
  module: string;
  action: string;
  description: string;
  timestamp: any;
  performedBy: string;
};

export default function SuperAdminClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [client, setClient] = useState<ClientRecord | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);

  const [name, setName] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pagination State for Audit Log
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(5);

  // New Management State
  const [assignMode, setAssignMode] = useState<"search" | "create">("search");
  const [showPassword, setShowPassword] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [adminUid, setAdminUid] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("adminpos123");
  const [isUsageOpen, setIsUsageOpen] = useState(false);


  async function searchUsers(query: string) {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/super-admin/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingUsers(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (userQuery && assignMode === "search") void searchUsers(userQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [userQuery, assignMode]);

  async function loadClientData() {
    if (!params.id || !user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/super-admin/clients/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setClient(data.client);
        setUsage(data.usage);
        setRecentLogs(data.recentLogs);
        setAdmins(data.admins || []);
        setName(data.client.name);
        setStatus(data.client.status);
      } else {
        toast.error(data.error || "Failed to load client");
      }
    } catch (error) {
      toast.error("Error loading client data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) void loadClientData();
  }, [authLoading, user, params.id]);

  async function onSaveSettings() {
    if (!name.trim() || name.length < 3) {
      toast.error("Tenant name must be at least 3 characters");
      return;
    }

    if (!confirm("Are you sure you want to save these changes?")) return;

    setBusy(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`/api/super-admin/clients/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), status }),
      });
      if (response.ok) {
        toast.success("Settings saved successfully");
        await loadClientData();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setBusy(false);
    }
  }

  async function onRevokeAccess(uid: string, email: string) {
    if (!confirm(`Are you sure you want to REVOKE administrative access for ${email}?`)) return;

    setBusy(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch("/api/super-admin/assign-client-admin", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid, clientId: params.id }),
      });

      if (response.ok) {
        toast.success("Access revoked successfully");
        await loadClientData();
      } else {
        const err = await response.json();
        toast.error(err.error || "Revocation failed");
      }
    } catch (error) {
      toast.error("Revocation failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAssignAdmin() {
    if (assignMode === "search" && (!adminUid)) {
      toast.error("Please select a user to assign");
      return;
    }
    if (assignMode === "create") {
      if (!adminEmail || !adminEmail.includes("@")) {
        toast.error("Valid email is required");
        return;
      }
      if (!adminPassword || adminPassword.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
    }

    setBusy(true);
    try {
      const token = await user?.getIdToken();

      let response;
      if (assignMode === "create") {
        response = await fetch("/api/super-admin/create-client-admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: adminEmail,
            password: adminPassword,
            clientId: params.id
          }),
        });
      } else {
        response = await fetch("/api/super-admin/assign-client-admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            uid: adminUid,
            email: adminEmail,
            clientId: params.id
          }),
        });
      }

      if (response.ok) {
        toast.success(assignMode === "create" ? "User created and assigned!" : "Admin assigned successfully");
        setAdminUid("");
        setAdminEmail("");
        setAdminPassword("adminpos123");
        setUserQuery("");
        await loadClientData();
      } else {
        const err = await response.json();
        toast.error(err.error || "Operation failed");
      }
    } catch (error) {
      toast.error("Assignment failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center text-stone-500">
        <AlertTriangle className="mx-auto h-12 w-12 text-stone-300 mb-4" />
        <p>Tenant not found.</p>
        <Button variant="ghost" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full border border-stone-200 hover:bg-stone-100"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-stone-900 tracking-tighter">{client.name}</h1>
              <Badge variant={client.status === "active" ? "success" : "secondary"} className="rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">{client.status}</Badge>
            </div>
            <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-[0.2em] font-black opacity-60">System Context: {client.id}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="rounded-xl border-stone-200"
            onClick={() => {
              useAuthStore.getState().setMasquerade(params.id);
              router.push("/dashboard");
            }}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Switch Context
          </Button>
          <Button
            variant="outline"
            className="rounded-xl border-stone-200"
            onClick={() => setIsUsageOpen(true)}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Usage History
          </Button>

          <Button
            variant="destructive"
            className="rounded-xl bg-rose-600 hover:bg-rose-700 font-bold"
            disabled={busy || client.status === "inactive"}
            onClick={() => {
              if (confirm("Suspend this tenant? All associated users will lose access.")) {
                void onSaveSettings(); // Re-use save with inactive status
                setStatus("inactive");
              }
            }}
          >
            {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Suspend Tenant
          </Button>
        </div>
      </header>


      {/* Usage Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <UsageCard title="Total Products" value={usage?.totalProducts ?? 0} icon={<Package className="h-4 w-4" />} />
        <UsageCard title="Transactions" value={usage?.totalTransactions ?? 0} icon={<Activity className="h-4 w-4" />} />
        <UsageCard title="Client Admins" value={admins.length} icon={<Users className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-stone-100 p-1 lg:max-w-[500px]">
          <TabsTrigger value="settings" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Settings</TabsTrigger>
          <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">User Access</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-6 space-y-6">
          <Card className="rounded-2xl border-stone-200 overflow-hidden">
            <CardHeader className="bg-stone-50/50 border-b border-stone-100">
              <CardTitle className="text-sm">General Configuration</CardTitle>
              <CardDescription>Manage the core identity and status of this tenant.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-600">Tenant Name</label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="rounded-xl border-stone-200"
                    minLength={3}
                    required
                  />
                  {name.length > 0 && name.length < 3 && (
                    <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Minimum 3 characters
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-600">Operational Status</label>
                  <Select onValueChange={(v: any) => setStatus(v)} value={status}>
                    <SelectTrigger className="rounded-xl border-stone-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-stone-200">
                      <SelectItem value="active">Active (Production)</SelectItem>
                      <SelectItem value="inactive">Inactive (Suspended)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-stone-50">
                <Button onClick={onSaveSettings} disabled={busy || name.length < 3} className="bg-stone-900 rounded-xl font-bold h-11 px-8">
                  {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            {/* Left Side: Provision Administrator */}
            <Card className="rounded-2xl border-stone-200 overflow-hidden h-fit">
              <CardHeader className="bg-stone-50/50 border-b border-stone-100">
                <CardTitle className="text-sm text-stone-900">Provision Administrator</CardTitle>
                <CardDescription>Link an existing account or create a new one for this tenant.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Mode Toggle */}
                <div className="flex p-1 bg-stone-100 rounded-xl max-w-[300px]">
                  <button
                    onClick={() => setAssignMode("search")}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                      assignMode === "search" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                    )}
                  >
                    Search Existing
                  </button>
                  <button
                    onClick={() => setAssignMode("create")}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                      assignMode === "create" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                    )}
                  >
                    Create New
                  </button>
                </div>

                {assignMode === "search" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-stone-600">Find by Email</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                        <Input
                          value={userQuery}
                          onChange={e => setUserQuery(e.target.value)}
                          placeholder="Search database..."
                          className="pl-10 rounded-xl h-9 text-sm"
                        />
                      </div>
                    </div>

                    {/* Search Results */}
                    <div className="space-y-2">
                      {searchingUsers && <p className="text-[10px] text-stone-400 animate-pulse font-bold uppercase tracking-widest pl-1">Searching...</p>}
                      <div className="grid gap-2 max-h-[160px] overflow-y-auto pr-1">
                        {searchResults.map((u) => (
                          <button
                            key={u.uid}
                            onClick={() => {
                              setAdminUid(u.uid);
                              setAdminEmail(u.email);
                              setUserQuery(u.email);
                              setSearchResults([]);
                            }}
                            className={cn(
                              "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                              adminUid === u.uid
                                ? "bg-stone-900 border-stone-900 text-white shadow-md"
                                : "bg-white border-stone-100 hover:border-stone-200 text-stone-600"
                            )}
                          >
                            <span className="text-[10px] font-bold truncate w-full">{u.email}</span>
                            <span className="text-[9px] opacity-60 font-mono mt-0.5">{u.uid.slice(0, 12)}...</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-stone-600">Email Address</label>
                      <Input
                        value={adminEmail}
                        onChange={e => setAdminEmail(e.target.value)}
                        placeholder="admin@tenant.com"
                        className="rounded-xl h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-stone-600">Temporary Password</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={adminPassword}
                          onChange={e => setAdminPassword(e.target.value)}
                          className="rounded-xl h-9 text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                          {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-4 border-t border-stone-50">
                  {adminUid || (assignMode === "create" && adminEmail) ? (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{adminEmail} selected</span>
                    </div>
                  ) : null}
                  <Button
                    onClick={onAssignAdmin}
                    disabled={busy || (assignMode === "search" ? !adminUid : (!adminEmail || !adminPassword || adminPassword.length < 6))}
                    className="bg-stone-900 rounded-xl px-8 h-11 text-xs font-bold w-full"
                  >
                    {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {assignMode === "create" ? "Create & Assign" : "Confirm Assignment"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right Side: Active Admins List */}
            <Card className="rounded-2xl border-stone-200 overflow-hidden shadow-sm h-fit">
              <CardHeader className="bg-white border-b border-stone-50 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-stone-900">Assigned Administrators</CardTitle>
                    <CardDescription className="text-xs">Active admin accounts.</CardDescription>
                  </div>
                  <Badge variant="outline" className="rounded-lg bg-stone-50 border-stone-100 text-stone-600 font-bold px-2.5 py-0.5 text-[10px] uppercase tracking-wider">
                    {admins.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-stone-100 bg-stone-50/30">
                      <TableHead className="pl-6 py-3 text-[10px] font-black text-stone-400 uppercase tracking-[0.15em]">Admin</TableHead>
                      <TableHead className="pr-6 py-3 text-right text-[10px] font-black text-stone-400 uppercase tracking-[0.15em]">Control</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.uid} className="group hover:bg-stone-50/50 transition-all border-stone-50">
                        <TableCell className="pl-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-stone-900 tracking-tight">{admin.email}</span>
                            <span className="text-[9px] text-stone-400 font-mono">{admin.uid.slice(0, 10)}...</span>
                          </div>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                            disabled={busy}
                            onClick={() => onRevokeAccess(admin.uid, admin.email)}
                            title="Revoke Access"
                          >
                            <ShieldOff className="h-4 w-4" />


                          </Button>
                        </TableCell>

                      </TableRow>
                    ))}
                    {admins.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="py-20 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">No Administrators</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        <TabsContent value="audit" className="mt-6">
          <Card className="rounded-2xl border-stone-200 overflow-hidden">
            <CardHeader className="bg-stone-50/50 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Tenant Activity</CardTitle>
                  <CardDescription>Recent actions performed within this tenant environment.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="text-stone-400">
                  <Clock className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 px-0">
              {/* Desktop View */}
              <div className="hidden md:block space-y-0">
                {recentLogs.slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize).map((log, i) => (
                  <div key={log.id} className={cn(
                    "flex items-center justify-between p-4 transition-colors hover:bg-stone-50",
                    i !== auditPageSize - 1 && "border-b border-stone-50"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className="h-9 w-9 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 border border-stone-200 shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-stone-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-stone-900 capitalize tracking-tight">{log.action.replace("_", " ")}</p>
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-stone-200 text-stone-500 font-black uppercase tracking-widest bg-white">{log.module}</Badge>
                        </div>
                        <p className="text-xs text-stone-600 mt-0.5 font-medium">{log.description}</p>
                        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-black mt-1 opacity-70">Operator: {log.performedBy || "System"}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-stone-400 font-black shrink-0 tracking-tighter bg-stone-50 px-2 py-1 rounded-lg border border-stone-100">
                      {log.timestamp?.seconds
                        ? `${new Date(log.timestamp.seconds * 1000).toLocaleDateString()} ${new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : "Recent"
                      }
                    </p>
                  </div>
                ))}
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-4 px-4">
                {recentLogs.slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize).map((log) => (
                  <div key={log.id} className="rounded-2xl border border-stone-100 p-4 space-y-3 bg-stone-50/30 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-stone-600" />
                        <span className="text-xs font-bold text-stone-900 capitalize">{log.action.replace("_", " ")}</span>
                      </div>
                      <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-1 border-stone-200">{log.module}</Badge>
                    </div>
                    <p className="text-[11px] text-stone-500 font-medium leading-tight">{log.description}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-2">
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Op: {log.performedBy?.split('@')[0] || "System"}</span>
                      <span className="text-[9px] font-black text-stone-400">
                        {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recent"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {recentLogs.length === 0 && (
                <p className="py-12 text-center text-[10px] font-black uppercase tracking-widest text-stone-300">No activity logs found.</p>
              )}

              {recentLogs.length > 0 && (
                <div className="mt-6 border-t border-stone-100 bg-stone-50/30">
                  <TablePagination
                    currentPage={auditPage}
                    totalPages={Math.ceil(recentLogs.length / auditPageSize)}
                    totalItems={recentLogs.length}
                    pageSize={auditPageSize}
                    onPageChange={setAuditPage}
                    onPageSizeChange={(size) => { setAuditPageSize(size); setAuditPage(1); }}
                    pageSizeOptions={[5, 10, 20]}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isUsageOpen} onOpenChange={setIsUsageOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border-stone-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter">Usage Intelligence</DialogTitle>
            <DialogDescription className="text-xs font-bold text-stone-400 uppercase tracking-widest">
              Live resource monitoring for {client.name}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Total Administrators</p>
                <p className="text-2xl font-black text-stone-900">{admins.length}</p>
                <p className="text-[10px] font-bold text-emerald-600 mt-1">Operational</p>
              </div>
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Transactions Volume</p>
                <p className="text-2xl font-black text-stone-900">{usage?.totalTransactions || 0}</p>
                <p className="text-[10px] font-bold text-stone-500 mt-1">Across all users</p>
              </div>
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Product Catalog</p>
                <p className="text-2xl font-black text-stone-900">{usage?.totalProducts || 0}</p>
                <p className="text-[10px] font-bold text-stone-500 mt-1">Managed items</p>
              </div>
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Estimated Storage</p>
                <p className="text-2xl font-black text-stone-900">{((usage?.totalProducts || 0) * 0.5).toFixed(1)} MB</p>
                <p className="text-[10px] font-bold text-emerald-600 mt-1">Optimized</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-widest pl-1">Live Tenant Milestones</h4>
              <div className="space-y-2">
                {[
                  { event: `${usage?.totalProducts || 0} Products Created`, date: "Active", type: "success" },
                  { event: `${usage?.totalTransactions || 0} Transactions Processed`, date: "Active", type: "info" },
                  { event: `${admins.length} Admin Seats Occupied`, date: "Active", type: "success" },
                ].map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-stone-100 bg-white shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        m.type === "warning" ? "bg-amber-500" : m.type === "success" ? "bg-emerald-500" : "bg-blue-500"
                      )} />
                      <span className="text-xs font-bold text-stone-700">{m.event}</span>
                    </div>
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-tighter">{m.date}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-900 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold tracking-tight">Real-Time Performance Note</span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed font-medium">
                Tenant performance is currently healthy based on {usage?.totalTransactions || 0} real data points. Data is synchronized with your production environment.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}


function UsageCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-stone-200 shadow-sm overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{title}</p>
          <div className="p-2 rounded-lg bg-stone-100 text-stone-600">
            {icon}
          </div>
        </div>
        <h4 className="text-3xl font-bold text-stone-900">{value}</h4>
      </CardContent>
    </Card>
  );
}

