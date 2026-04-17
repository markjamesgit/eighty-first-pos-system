"use client";

import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import type { Product, ProductFormValues } from "@/lib/types/domain";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listMaintenanceItems } from "@/services/firebase/maintenance";
import { createProduct, updateProduct } from "@/services/firebase/products";
import { uploadProductImage } from "@/services/firebase/storage";

type ProductFormState = {
  name: string;
  description: string;
  category: string;
  maintenanceLinkIds: string[];
  price: string;
  imageUrl: string;
  isActive: boolean;
};

const initialValues: ProductFormState = {
  name: "",
  description: "",
  category: "",
  maintenanceLinkIds: [],
  price: "",
  imageUrl: "",
  isActive: true,
};

export function ProductDialog({
  product,
  triggerLabel,
  onSaved,
}: {
  product?: Product;
  triggerLabel: string;
  onSaved: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [values, setValues] = useState<ProductFormState>(initialValues);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [variantOptions, setVariantOptions] = useState<{ id: string; name: string }[]>([]);
  const [addonOptions, setAddonOptions] = useState<{ id: string; name: string }[]>([]);
  const [modifierOptions, setModifierOptions] = useState<{ id: string; name: string }[]>([]);

  function uniqueByName(items: Array<{ name: string }>) {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = item.name.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function uniqueById(items: Array<{ id: string; name: string }>) {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (!item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  useEffect(() => {
    if (!open) {
      setUploadingImage(false);
    }

    if (!product) {
      setValues(initialValues);
      return;
    }

    setValues({
      name: product.name,
      description: product.description ?? "",
      category: product.category,
      maintenanceLinkIds: product.maintenanceLinkIds ?? [],
      price: String(product.price),
      imageUrl: product.imageUrl ?? "",
      isActive: product.isActive,
    });
  }, [product, open]);

  useEffect(() => {
    void Promise.all([
      listMaintenanceItems("categories"),
      listMaintenanceItems("variants"),
      listMaintenanceItems("addons"),
      listMaintenanceItems("modifiers"),
    ])
      .then(([categories, variants, addons, modifiers]) => {
        const activeCategories = categories.filter((item) => item.isActive);

        const nextCategories = uniqueByName(activeCategories).map((item) => item.name);
        setCategoryOptions(nextCategories);
        setVariantOptions(uniqueById(variants));
        setAddonOptions(uniqueById(addons));
        setModifierOptions(uniqueById(modifiers));

        if (!product && nextCategories.length && !values.category) {
          setValues((current) => ({ ...current, category: nextCategories[0] ?? "" }));
        }
      })
      .catch(() => {
        setCategoryOptions([]);
        setVariantOptions([]);
        setAddonOptions([]);
        setModifierOptions([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  function parseValues(): ProductFormValues {
    const parsedPrice = Number(values.price || "0");
    const linkIds = values.maintenanceLinkIds.length ? values.maintenanceLinkIds : undefined;

    return {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      category: values.category,
      maintenanceLinkType: undefined,
      maintenanceLinkIds: linkIds,
      price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
      stockQty: 0,
      imageUrl: values.imageUrl.trim(),
      isActive: values.isActive,
    };
  }

  async function handleImageUpload(file?: File) {
    if (!file) {
      return;
    }

    setUploadingImage(true);
    try {
      const imageUrl = await uploadProductImage(file);
      setValues((current) => ({ ...current, imageUrl }));
      toast.success("Image uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload image.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSave() {
    if (!values.name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    if (!values.category.trim()) {
      toast.error("Category is required.");
      return;
    }
    if (!values.price.trim()) {
      toast.error("Price is required.");
      return;
    }

    const parsed = parseValues();
    if (!Number.isFinite(parsed.price)) {
      toast.error("Price must be a valid number.");
      return;
    }
    if (parsed.price < 0) {
      toast.error("Price should be zero or above.");
      return;
    }

    setLoading(true);

    try {
      if (product) {
        await updateProduct(product.id, parsed);
        toast.success("Product updated.");
      } else {
        await createProduct(parsed);
        toast.success("Product added.");
      }

      await onSaved();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save product.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={product ? "outline" : "default"}
          className={product ? "" : "rounded-xl px-5 font-semibold shadow-sm"}
        >
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-stone-200 p-0 sm:max-w-3xl">
        <DialogHeader>
          <div className="border-b border-stone-100 bg-stone-50/70 px-6 py-5">
            <DialogTitle className="text-lg font-bold text-stone-900">
              {product ? "Edit Product" : "Add Product"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-stone-500">
              Manage your menu items with category, pricing, and stock controls.
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="grid gap-6 px-6 pb-6 md:grid-cols-[1fr_220px]">
          <div className="space-y-5">
            <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Basic Details</p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={values.name}
                  onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Flat White"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={values.description}
                  onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
                  placeholder="E.g., A smooth, mild coffee"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={values.category}
                  onValueChange={(value) => setValues((current) => ({ ...current, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input
                  type="text"
                  min="0"
                  step="0.01"
                  value={values.price}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      price: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={values.isActive ? "active" : "inactive"}
                  onValueChange={(value) =>
                    setValues((current) => ({ ...current, isActive: value === "active" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
              <label className="text-sm font-medium">Linked Item Options (Optional)</label>
              <p className="text-xs text-stone-500">
                Select any combination of variants, addons, and modifiers.
              </p>
              {[
                { key: "Variants", items: variantOptions },
                { key: "Addons", items: addonOptions },
                { key: "Modifiers", items: modifierOptions },
              ].map((group) => (
                <div key={group.key} className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500">{group.key}</label>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((option) => {
                      const isSelected = values.maintenanceLinkIds.includes(option.id);
                      return (
                        <Button
                          key={option.id}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setValues((current) => {
                              const newIds = isSelected
                                ? current.maintenanceLinkIds.filter((id) => id !== option.id)
                                : [...current.maintenanceLinkIds, option.id];
                              return { ...current, maintenanceLinkIds: newIds };
                            });
                          }}
                        >
                          {option.name}
                        </Button>
                      );
                    })}
                    {!group.items.length && (
                      <p className="text-xs text-stone-500">No items available. Add them in the Maintenance tab.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
              <label className="text-sm font-medium">Product image (optional)</label>
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                <Upload className="h-4 w-4" />
                Upload image
              </label>
              <Input
                key={values.imageUrl || "empty-image"}
                type="file"
                accept="image/*"
                onChange={(event) => void handleImageUpload(event.target.files?.[0])}
                disabled={uploadingImage}
              />
              {uploadingImage ? <p className="text-xs text-stone-500">Uploading image...</p> : null}
              {values.imageUrl ? (
                <div className="rounded-lg border border-stone-200 bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={values.imageUrl}
                    alt="Product preview"
                    className="h-32 w-full rounded object-cover"
                  />
                </div>
              ) : (
                <p className="text-xs text-stone-500">No image selected yet.</p>
              )}
            </div>
          </aside>
        </div>
        <DialogFooter className="border-t border-stone-100 bg-stone-50/70 px-6 py-4">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || uploadingImage}>
            {loading ? "Saving..." : product ? "Save Changes" : "Add Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
