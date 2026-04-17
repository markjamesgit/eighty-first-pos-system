"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Search, Trash2, Plus, Sparkles, Layers, Box, Settings2, SlidersHorizontal, Image as ImageIcon, Upload } from "lucide-react";
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
import { TablePagination } from "@/components/ui/table-pagination";
import {
  createMaintenanceItem,
  deleteMaintenanceItem,
  listMaintenanceItems,
  updateMaintenanceItem,
  type MaintenanceSection,
} from "@/services/firebase/maintenance";
import { uploadProductImage } from "@/services/firebase/storage";
import { addAuditEntrySafe } from "@/services/firebase/audit-trail";
import { formatCurrency, cn } from "@/lib/utils";

type MaintenanceItem = {
  id?: string;
  name: string;
  imageUrl: string;
  description: string;
  price: string;
  isActive: boolean;
};

export function MaintenanceView() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [form, setForm] = useState<MaintenanceItem>({
    name: "",
    imageUrl: "",
    description: "",
    price: "",
    isActive: true,
  });
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const requestedSection = searchParams.get("section");
  const maintenanceSection: MaintenanceSection =
    requestedSection === "variants" ||
      requestedSection === "addons" ||
      requestedSection === "modifiers"
      ? requestedSection
      : "categories";

  const readyToSave = useMemo(() => form.name.trim().length > 0, [form.name]);

  const filteredItems = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return items
      .filter((item) =>
        !needle ? true : [item.name, item.description].join(" ").toLowerCase().includes(needle),
      )
      .filter((item) => {
        if (statusFilter === "all") return true;
        return statusFilter === "active" ? item.isActive : !item.isActive;
      });
  }, [items, search, statusFilter]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const filledDescriptionCount = useMemo(
    () => items.filter((item) => item.description.trim().length > 0).length,
    [items],
  );
  const withAssetCount = useMemo(
    () => items.filter((item) => item.imageUrl.trim().length > 0).length,
    [items],
  );
  const activeCount = useMemo(() => items.filter((item) => item.isActive).length, [items]);

  const sectionConfig = useMemo(() => {
    switch (maintenanceSection) {
      case "categories": return { title: "Categories", icon: <Layers className="h-6 w-6" />, desc: "Top-level menu organization." };
      case "variants": return { title: "Variants", icon: <Box className="h-6 w-6" />, desc: "Sizing and base item variations." };
      case "addons": return { title: "Addons", icon: <Plus className="h-6 w-6" />, desc: "Extra items that add to the price." };
      case "modifiers": return { title: "Modifiers", icon: <Settings2 className="h-6 w-6" />, desc: "Preferences like sweetness or temperature." };
      default: return { title: "Maintenance", icon: <Settings2 className="h-6 w-6" />, desc: "Define system metadata." };
    }
  }, [maintenanceSection]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listMaintenanceItems(maintenanceSection);
      setItems(rows.map(row => ({
        id: row.id,
        name: row.name,
        imageUrl: row.imageUrl ?? "",
        description: row.description ?? "",
        price: String(row.price ?? 0),
        isActive: row.isActive ?? true,
      })));
    } catch {
      toast.error("Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [maintenanceSection]);

  useEffect(() => {
    void fetchList();
    setEditingId(null);
    setForm({ name: "", imageUrl: "", description: "", price: "", isActive: true });
    setCurrentPage(1);
  }, [maintenanceSection, fetchList]);

  async function handleSave() {
    if (!readyToSave) return;
    try {
      const payload = {
        name: form.name,
        imageUrl: form.imageUrl,
        description: form.description,
        price: Number(form.price) || 0,
        isActive: form.isActive,
      };

      if (editingId) {
        await updateMaintenanceItem(maintenanceSection, editingId, payload);
        await addAuditEntrySafe({
          module: "Maintenance",
          action: `update_${maintenanceSection}`,
          description: `Updated ${maintenanceSection} item ${form.name}`,
          performedBy: "admin",
        });
        toast.success("Item updated.");
      } else {
        await createMaintenanceItem(maintenanceSection, payload);
        await addAuditEntrySafe({
          module: "Maintenance",
          action: `create_${maintenanceSection}`,
          description: `Created ${maintenanceSection} item ${form.name}`,
          performedBy: "admin",
        });
        toast.success("Item created.");
      }

      await fetchList();
      setEditingId(null);
      setForm({ name: "", imageUrl: "", description: "", price: "", isActive: true });
      setFormOpen(false);
    } catch {
      toast.error("Save failed.");
    }
  }

  async function handleDelete(item: MaintenanceItem) {
    if (!item.id || !confirm(`Delete ${item.name}?`)) return;
    try {
      await deleteMaintenanceItem(maintenanceSection, item.id);
      toast.success("Item removed.");
      await fetchList();
    } catch {
      toast.error("Deletion failed.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-950">{sectionConfig.title}</h1>
          <p className="text-sm font-medium text-stone-500">{sectionConfig.desc}</p>
        </div>
        <Button
          variant="default"
          className="h-10 rounded-xl px-5 font-bold text-xs text-white bg-stone-900 hover:bg-stone-800 transition-all shadow-sm"
          onClick={() => {
            setEditingId(null);
            setForm({ name: "", imageUrl: "", description: "", price: "", isActive: true });
            setFormOpen(true);
          }}
        >
          Add New Entry
        </Button>
      </div>

      <div>
        <Card className="overflow-hidden rounded-2xl md:rounded-3xl border-stone-100 bg-white shadow-sm">
          <CardHeader className="border-b border-stone-100 bg-white py-6 px-6 md:px-8">
            <CardTitle className="text-xl font-bold tracking-tight text-stone-900">{sectionConfig.title} Registry</CardTitle>
            <CardDescription className="text-sm font-medium text-stone-500">Manage your system metadata and menu organization.</CardDescription>
          </CardHeader>
          <CardContent className="grid p-0 lg:grid-cols-[240px_1fr]">
            <aside className="space-y-4 border-b border-stone-100 bg-white p-5 lg:border-b-0 lg:border-r">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                  <SlidersHorizontal className="h-4 w-4" />
                  Maintenance Sidebar
                </h3>
                <p className="mt-1 text-xs text-stone-500 font-medium">Search and monitor records.</p>
              </div>
              <div className="space-y-3">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-stone-900" />
                  <Input
                    placeholder="Search entries..."
                    className="h-10 rounded-xl border-stone-100 bg-white pl-10 font-medium transition-all focus-visible:ring-stone-950"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value: "all" | "active" | "inactive") => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-stone-100 bg-white font-medium text-stone-600">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-stone-100">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden lg:block space-y-2">
                <div className="rounded-xl border border-stone-100 bg-stone-50/40 p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total Records</p>
                  <p className="mt-1 text-2xl font-black text-stone-900">{items.length}</p>
                </div>
                <div className="rounded-xl border border-stone-100 bg-stone-50/40 p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Active Items</p>
                  <p className="mt-1 text-2xl font-black text-stone-900">{activeCount}</p>
                </div>
              </div>
            </aside>
            <div>
              <div className="space-y-3 p-4 lg:hidden">
                {loading ? (
                  <div className="flex h-40 items-center justify-center rounded-xl border border-stone-100 bg-white text-xs font-bold uppercase tracking-widest text-stone-400 opacity-40">
                    Syncing with Cloud Registry...
                  </div>
                ) : paginatedItems.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-stone-100 bg-white opacity-40">
                    <Sparkles className="mb-2 h-10 w-10 text-stone-300" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">No matching records</p>
                  </div>
                ) : (
                  paginatedItems.map((item) => (
                    <article key={item.id} className="space-y-3 rounded-xl border border-stone-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-stone-300">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold tracking-tight text-stone-950">{item.name}</p>
                            <span
                              className={cn(
                                "mt-1 inline-flex h-5 items-center rounded-full px-2.5 text-[9px] font-bold uppercase tracking-wider",
                                item.isActive ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-stone-50 text-stone-400 border border-stone-100",
                              )}
                            >
                              {item.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {(maintenanceSection === "variants" || maintenanceSection === "addons") ? (
                        <p className="text-sm font-bold text-stone-900">
                          Price adjustment: <span className="text-emerald-600">+{formatCurrency(Number(item.price))}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] font-medium text-stone-500 leading-relaxed">
                          {item.description || "No supplemental details provided."}
                        </p>
                      )}
                      {(maintenanceSection === "variants" || maintenanceSection === "addons") ? (
                        <p className="text-xs font-medium text-stone-500">
                          {item.description || "No supplemental details"}
                        </p>
                      ) : null}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-xl border-stone-100 px-4 font-bold text-xs shadow-sm bg-white"
                          onClick={() => {
                            setEditingId(item.id!);
                            setForm({
                              name: item.name,
                              imageUrl: item.imageUrl,
                              description: item.description,
                              price: item.price,
                              isActive: item.isActive,
                            });
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-stone-300 transition-colors hover:bg-red-50 hover:text-red-500"
                          onClick={() => void handleDelete(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </article>
                  ))
                )}
              </div>
              <div className="hidden overflow-x-auto lg:block">
                <Table>
                  <TableHeader className="bg-white">
                  <TableRow className="hover:bg-transparent border-stone-100 h-12">
                    <TableHead className="py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-6 md:pl-8">Image</TableHead>
                    <TableHead className="py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pl-6 md:pl-8">Entry Name</TableHead>
                    {(maintenanceSection === "variants" || maintenanceSection === "addons") && (
                      <TableHead className="py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 text-center">
                        Description
                      </TableHead>
                    )}
                    <TableHead className="py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 text-center">
                      {maintenanceSection === "variants" || maintenanceSection === "addons"
                        ? "Price adjustment"
                        : "Description"}
                    </TableHead>
                    <TableHead className="py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 text-center">Status</TableHead>
                    <TableHead className="text-right py-0 text-xs font-semibold uppercase tracking-wider text-stone-400 pr-6 md:pr-8">Actions</TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={maintenanceSection === "variants" || maintenanceSection === "addons" ? 6 : 5} className="h-64 text-center text-stone-400 font-medium italic animate-pulse text-xs uppercase tracking-widest opacity-40">Syncing with Cloud Registry...</TableCell></TableRow>
                    ) : paginatedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={maintenanceSection === "variants" || maintenanceSection === "addons" ? 6 : 5} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center opacity-40">
                            <Sparkles className="h-12 w-12 mb-3 text-stone-300" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">No matching records</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedItems.map((item) => (
                        <TableRow key={item.id} className="h-20 border-stone-100 transition-all hover:bg-stone-50/50">
                          <TableCell className="pl-6 md:pl-8">
                            <div className="h-12 w-12 overflow-hidden rounded-xl border border-stone-100 bg-stone-50">
                              {item.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-stone-300">
                                  <ImageIcon className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="pl-6 md:pl-8 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-stone-900 text-sm tracking-tight">{item.name}</span>
                          </div>
                        </TableCell>
                        {(maintenanceSection === "variants" || maintenanceSection === "addons") && (
                          <TableCell className="text-center">
                            <span className="line-clamp-1 text-[11px] font-medium text-stone-500 max-w-[200px] mx-auto">
                              {item.description || "No supplemental details"}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          {(maintenanceSection === "variants" || maintenanceSection === "addons") ? (
                            <span className="font-bold text-stone-900 text-sm">+{formatCurrency(Number(item.price))}</span>
                          ) : (
                            <span className="line-clamp-1 text-[11px] font-medium text-stone-500 max-w-[200px] mx-auto">
                              {item.description || "No supplemental details"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center border-stone-100">
                          <span
                            className={cn(
                              "inline-flex h-5 items-center rounded-full px-2.5 text-[9px] font-bold uppercase tracking-wider",
                              item.isActive ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-stone-50 text-stone-400 border border-stone-100",
                            )}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                          <TableCell className="text-right pr-6 md:pr-8">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl border-stone-100 px-4 font-bold text-xs shadow-sm bg-white"
                                onClick={() => {
                                  setEditingId(item.id!);
                                  setForm({
                                    name: item.name,
                                    imageUrl: item.imageUrl,
                                    description: item.description,
                                    price: item.price,
                                    isActive: item.isActive,
                                  });
                                  setFormOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl text-stone-300 transition-colors hover:bg-red-50 hover:text-red-500"
                                onClick={() => void handleDelete(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
                  totalItems={filteredItems.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  pageSizeOptions={[8, 12, 20, 50]}
                />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingId(null);
            setForm({ name: "", imageUrl: "", description: "", price: "", isActive: true });
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl md:rounded-3xl border-stone-100 p-0 sm:max-w-2xl bg-white shadow-xl">
          <DialogHeader>
            <div className="border-b border-stone-100 bg-white px-6 py-6 md:px-8">
              <DialogTitle className="text-xl font-bold text-stone-900">
                {editingId ? "Edit Entry" : `Add ${sectionConfig.title} Entry`}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-medium text-stone-500">
                Define the properties for this maintenance record.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="grid gap-6 px-6 py-6 md:px-8 md:grid-cols-[1fr_200px]">
            <div className="space-y-5">
              <div className="space-y-4 rounded-xl border border-stone-100 bg-stone-50/30 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Identity Details</p>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-tight">Name</label>
                  <Input
                    placeholder="e.g. Premium Blend"
                    className="h-10 rounded-xl border-stone-100 bg-white shadow-sm focus-visible:ring-stone-950 font-medium"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-tight">Description</label>
                  <Input
                    placeholder="Identification notes..."
                    className="h-10 rounded-xl border-stone-100 bg-white shadow-sm focus-visible:ring-stone-950 font-medium"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-stone-100 bg-stone-50/30 p-5">
                <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">Configuration</p>
                {maintenanceSection !== "modifiers" && maintenanceSection !== "categories" ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-tight">Price Delta</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="h-10 rounded-xl border-stone-100 bg-white shadow-sm focus-visible:ring-stone-950 font-bold"
                      value={form.price}
                      onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                    />
                  </div>
                ) : (
                  <p className="text-xs font-medium text-stone-500 italic">Financial metadata is not applicable for this registry.</p>
                )}
                <div className="mt-4 space-y-2">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-tight">State</label>
                  <Select
                    value={form.isActive ? "active" : "inactive"}
                    onValueChange={(value) =>
                      setForm((p) => ({ ...p, isActive: value === "active" }))
                    }
                  >
                    <SelectTrigger className="h-10 rounded-xl border-stone-100 bg-white shadow-sm font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-stone-100">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="space-y-3 rounded-xl border border-stone-100 bg-stone-50/50 p-5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Visual Asset</label>
                <div className="relative group cursor-pointer">
                  <div className="h-40 w-full rounded-2xl border-2 border-dashed border-stone-200 bg-white flex flex-col items-center justify-center gap-2 hover:border-stone-900 transition-all overflow-hidden relative">
                    {form.imageUrl ? (
                      <img src={form.imageUrl} className="h-full w-full object-cover" alt="" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-stone-300" />
                        <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">Upload</span>
                      </>
                    )}
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                        <div className="h-4 w-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingImage(true);
                        try {
                          const url = await uploadProductImage(file);
                          setForm((p) => ({ ...p, imageUrl: url }));
                        } finally {
                          setUploadingImage(false);
                        }
                      }}
                      disabled={uploadingImage}
                    />
                  </div>
                </div>
                <p className="text-[10px] font-medium text-stone-400 text-center">Tap to upload high-res asset</p>
              </div>
            </aside>

            <div className="flex justify-end gap-2 border-t border-stone-100 p-6 md:p-8 md:col-span-2 bg-stone-50/30">
              <Button
                variant="outline"
                className="h-11 rounded-xl border-stone-100 bg-white px-6 font-bold text-xs shadow-sm hover:bg-stone-50 transition-all"
                onClick={() => setFormOpen(false)}
              >
                Discard
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={!readyToSave || loading}
                className="h-11 rounded-xl bg-stone-900 px-8 text-xs font-bold text-white shadow-sm hover:bg-stone-800 transition-all"
              >
                {editingId ? "Update Record" : "Confirm Entry"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
