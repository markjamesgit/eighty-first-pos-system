"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  MoreVertical,
  UserPlus,
  CheckCircle2,
  Building2,
  Eye,
  EyeOff,
  LoaderCircle,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Settings2
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablePagination } from "@/components/ui/table-pagination";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ClientRecord = {
  id: string;
  name: string;
  status: "active" | "inactive";
  createdBy: string;
  createdAt: { seconds: number; nanoseconds: number } | string;
  lastActiveAt?: { seconds: number; nanoseconds: number } | null;
};


export default function SuperAdminClientsPage() {
  const { user, loading: authLoading } = useAuth();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  // User Search State
  const [userQuery, setUserQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ uid: string; email: string }[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form States
  const [assignMode, setAssignMode] = useState<"search" | "create">("search");
  const [showPassword, setShowPassword] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [adminUid, setAdminUid] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("adminpos123");
  const [selectedClientId, setSelectedClientId] = useState("");

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

  async function loadClients() {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/super-admin/clients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setClients(data.clients ?? []);
    } catch (error) {
      toast.error("Failed to load clients");
    }
  }

  useEffect(() => {
    if (!authLoading) void loadClients();
  }, [authLoading, user]);

  async function onCreateClient() {
    if (!newClientName.trim() || newClientName.length < 3) {
      toast.error("Client name must be at least 3 characters");
      return;
    }
    setBusy(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch("/api/super-admin/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newClientName }),
      });
      if (response.ok) {
        toast.success("Client created successfully");
        setNewClientName("");
        setIsCreateOpen(false);
        await loadClients();
      } else {
        const data = await response.json();
        toast.error(data.error || "Creation failed");
      }
    } catch (error) {
      toast.error("Creation failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSetStatus(clientId: string, status: "active" | "inactive") {
    if (!confirm(`Are you sure you want to ${status === "active" ? "activate" : "suspend"} this environment?`)) return;
    
    setBusy(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/super-admin/clients", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clientId, status }),
      });
      if (res.ok) {
        toast.success(`Client ${status === "active" ? "enabled" : "disabled"}`);
        await loadClients();
      } else {
        const data = await res.json();
        toast.error(data.error || "Update failed");
      }
    } catch (error) {
      toast.error("Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAssignAdmin() {
    if (assignMode === "search" && (!adminUid || !selectedClientId)) {
      toast.error("Please select a user and a target tenant");
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
      if (!selectedClientId) {
        toast.error("Target tenant is required");
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
            clientId: selectedClientId 
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
            clientId: selectedClientId 
          }),
        });
      }

      if (response.ok) {
        toast.success(assignMode === "create" ? "User created and assigned!" : "Admin assigned successfully");
        setAdminUid("");
        setAdminEmail("");
        setAdminPassword("adminpos123");
        setUserQuery("");
        setIsAssignOpen(false);
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

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredClients.length / pageSize);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tighter">Tenants</h1>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-widest mt-1">Manage and monitor client environments.</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl border-stone-200 bg-white">
                <UserPlus className="mr-2 h-4 w-4" />
                Assign Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-stone-200 sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Client Admin</DialogTitle>
                <DialogDescription>Link an administrator to this environment.</DialogDescription>
              </DialogHeader>

              {/* Mode Toggle */}
              <div className="flex p-1 bg-stone-100 rounded-xl mb-2">
                <button 
                  onClick={() => setAssignMode("search")}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    assignMode === "search" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                  )}
                >
                  Search Existing
                </button>
                <button 
                  onClick={() => setAssignMode("create")}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    assignMode === "create" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                  )}
                >
                  Create New Account
                </button>
              </div>

              <div className="space-y-6 py-4">
                {assignMode === "search" ? (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-stone-700">Find User by Email</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                      <Input 
                        value={userQuery} 
                        onChange={e => setUserQuery(e.target.value)} 
                        placeholder="Type email to search..." 
                        className="pl-10 rounded-xl" 
                      />
                    </div>
                    
                    {/* Search Results */}
                    <div className="space-y-2">
                      {searchingUsers && <p className="text-[10px] text-stone-400 animate-pulse font-bold uppercase tracking-widest pl-1">Searching database...</p>}
                      {!searchingUsers && userQuery.length >= 2 && searchResults.length === 0 && (
                        <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest pl-1">No users found</p>
                      )}
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
                            <span className="text-xs font-bold">{u.email}</span>
                            <span className="text-[9px] opacity-60 font-mono mt-0.5">{u.uid}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-stone-700">Email Address</label>
                      <Input 
                        value={adminEmail} 
                        onChange={e => setAdminEmail(e.target.value)} 
                        placeholder="admin@client.com" 
                        className="rounded-xl" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-stone-700">Temporary Password</label>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"}
                          value={adminPassword} 
                          onChange={e => setAdminPassword(e.target.value)} 
                          placeholder="At least 6 characters" 
                          className="rounded-xl pr-10" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {(adminUid || (assignMode === "create" && adminEmail && adminPassword)) && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 animate-in zoom-in-95 duration-200">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">
                      {assignMode === "create" ? "New User Provisioning" : "Target User Selected"}
                    </p>
                    <p className="text-xs font-medium text-emerald-900">{adminEmail}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">Target Tenant</label>
                  <Select onValueChange={setSelectedClientId} value={selectedClientId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select destination client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={onAssignAdmin} 
                  disabled={busy || !selectedClientId || (assignMode === "search" ? !adminUid : (!adminEmail || !adminPassword))} 
                  className="bg-stone-900 rounded-xl px-6 w-full font-bold h-11"
                >
                  {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {assignMode === "create" ? "Create & Assign User" : "Confirm Assignment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-stone-900 font-bold">
                <Plus className="mr-2 h-4 w-4" />
                New Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-stone-200">
              <DialogHeader>
                <DialogTitle>Create New Tenant</DialogTitle>
                <DialogDescription>Initialize a new environment for a client.</DialogDescription>
              </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Client Name</label>
                    <Input 
                      value={newClientName} 
                      onChange={e => setNewClientName(e.target.value)} 
                      placeholder="e.g. Sixty-Third Coffee" 
                      className="rounded-xl h-12 text-sm border-stone-200" 
                      required
                    />
                    {newClientName.length > 0 && newClientName.length < 3 && (
                      <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Minimum 3 characters
                      </p>
                    )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={onCreateClient} disabled={busy || newClientName.length < 3} className="bg-stone-900 rounded-xl px-6 font-bold h-11">
                  {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Provision Tenant
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-100 bg-white p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Search by name or ID..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-11 rounded-xl border-stone-200 bg-stone-50/30 focus:bg-white transition-all h-10"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Filter By</label>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-10 w-[140px] rounded-xl border-stone-200 bg-white text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-stone-200">
                <SelectItem value="all">All Environments</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Suspended Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-stone-100 bg-stone-50/50">
                <TableHead className="text-left py-4 text-[10px] font-black text-stone-400 uppercase tracking-[0.15em] pl-8">Store / Environment</TableHead>
                <TableHead className="text-center py-4 text-[10px] font-black text-stone-400 uppercase tracking-[0.15em]">Health Status</TableHead>
                <TableHead className="text-center py-4 text-[10px] font-black text-stone-400 uppercase tracking-[0.15em]">System Reference</TableHead>
                <TableHead className="text-right py-4 text-[10px] font-black text-stone-400 uppercase tracking-[0.15em] pr-8">Operations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.map((client) => {
                const isOnline = client.lastActiveAt 
                  ? (Date.now() / 1000 - client.lastActiveAt.seconds) < 300 // 5 minutes
                  : false;

                return (
                  <TableRow key={client.id} className="group transition-colors hover:bg-stone-50/50 border-stone-50">
                    <TableCell className="py-5 pl-8">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600 border border-stone-200 group-hover:bg-white transition-colors">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-stone-900 tracking-tight truncate">{client.name}</span>
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5 truncate">Production Environment</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1.5">
                        <Badge variant={client.status === "active" ? "success" : "secondary"} className="rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-widest shadow-sm">
                          {client.status === "active" ? "Operational" : "Suspended"}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <div className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-stone-300")} />
                          <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">
                            {isOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <code className="text-[10px] font-mono font-bold bg-stone-50 border border-stone-100 px-2 py-0.5 rounded-lg text-stone-500 shadow-sm">
                        {client.id.slice(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8 rounded-lg transition-all",
                            client.status === "active" ? "text-stone-400 hover:text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"
                          )}
                          onClick={() => onSetStatus(client.id, client.status === "active" ? "inactive" : "active")}
                          title={client.status === "active" ? "Suspend Tenant" : "Activate Tenant"}
                        >
                          {client.status === "active" ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                        </Button>
                        <Link href={`/super-admin/clients/${client.id}`}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all"
                            title="Manage Tenant"
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="lg:hidden p-4 space-y-4">
          {paginatedClients.map((client) => {
            const isOnline = client.lastActiveAt 
              ? (Date.now() / 1000 - client.lastActiveAt.seconds) < 300 
              : false;

            return (
              <div key={client.id} className="rounded-2xl border border-stone-100 bg-stone-50/30 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-stone-600 border border-stone-200 shadow-sm">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-stone-900 tracking-tight truncate">{client.name}</span>
                      <code className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-widest">{client.id.slice(0, 8)}...</code>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={client.status === "active" ? "success" : "secondary"} className="rounded-lg px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">
                      {client.status === "active" ? "Live" : "Stopped"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <div className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-emerald-500" : "bg-stone-300")} />
                      <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">{isOnline ? "Online" : "Offline"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 h-10 rounded-xl text-[10px] font-bold gap-2",
                      client.status === "active" ? "border-rose-100 text-rose-600 bg-rose-50/50" : "border-emerald-100 text-emerald-600 bg-emerald-50/50"
                    )}
                    onClick={() => onSetStatus(client.id, client.status === "active" ? "inactive" : "active")}
                  >
                    {client.status === "active" ? (
                      <><PauseCircle className="h-3.5 w-3.5" /> Suspend Tenant</>
                    ) : (
                      <><PlayCircle className="h-3.5 w-3.5" /> Activate Tenant</>
                    )}
                  </Button>
                  <Link href={`/super-admin/clients/${client.id}`} className="flex-1">
                    <Button variant="outline" className="w-full h-10 rounded-xl text-[10px] font-bold gap-2 border-stone-200 bg-white shadow-sm">
                      <Settings2 className="h-3.5 w-3.5" />
                      Manage
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {paginatedClients.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center opacity-30">
            <Building2 className="h-12 w-12 mb-3 text-stone-300" />
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">No Tenants Found</p>
          </div>
        )}



        <div className="border-t border-stone-100 bg-white">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredClients.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            pageSizeOptions={[10, 25, 50]}
          />
        </div>
      </div>

      <div className="rounded-3xl border-2 border-stone-900/5 bg-stone-100/50 p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-sm">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-stone-900 flex items-center justify-center shrink-0">
              <Plus className="h-4 w-4 text-white" />
            </div>
            <h4 className="text-base font-bold text-stone-900 tracking-tight">System Rescue Operations</h4>
          </div>
          <p className="text-sm text-stone-600 font-medium leading-relaxed">
            If root administrative permissions are compromised or lost, use the bootstrap operation to forcefully restore superuser status to your primary account.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-2xl border-stone-900 bg-stone-900 text-white hover:bg-stone-800 h-14 px-10 text-sm font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-95"
          onClick={() => {
            toast.promise(
              fetch("/api/super-admin/bootstrap", { method: "POST" }),
              {
                loading: 'RESTORE IN PROGRESS...',
                success: 'SYSTEM RESTORED! PLEASE RE-LOGIN.',
                error: 'RESTORE FAILED.'
              }
            );
          }}
        >
          Re-bootstrap System
        </Button>
      </div>
    </div>
  );
}


