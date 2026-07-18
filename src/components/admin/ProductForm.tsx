import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadProductImage } from "@/lib/upload";
import { importProduct } from "@/lib/import-product.functions";
import {
  ALL_SIZES,
  ALL_COLORS,
  computeSellingPrice,
  formatNaira,
  generateColorCode,
  type Product,
  type ProductColorTag,
} from "@/lib/store";
import { useStoreSettings, useCollections, useProductColorTags } from "@/hooks/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Link2, Upload, X, Sparkles, Tag, Truck } from "lucide-react";

type FormState = {
  title: string;
  description: string;
  images: string[];
  cost_price: number;
  shipping_fee: number;
  selling_price: number;
  stock: number;
  sizes: string[];
  colors: string[];
  source: string;
  source_url: string | null;
  published: boolean;
  collection_id: string | null;
  shipping_origin: string | null;
  shipping_min_days: number | null;
  shipping_max_days: number | null;
  shipping_cost_min: number;
  shipping_cost_max: number;
};

type ColorTagDraft = {
  id?: string;
  image_index: number;
  color_name: string;
  color_code: string;
};

export function ProductForm({ existing }: { existing?: Product }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings } = useStoreSettings();
  const { data: collections } = useCollections();
  const { data: existingTags } = useProductColorTags(existing?.id ?? "");
  const runImport = useServerFn(importProduct);

  const multiplier = settings?.profit_multiplier ?? 1.8;
  const defShip = settings?.default_shipping_fee ?? 0;

  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoPrice, setAutoPrice] = useState(!existing);
  const [customSize, setCustomSize] = useState("");
  const [customColor, setCustomColor] = useState("");
  const [colorTags, setColorTags] = useState<ColorTagDraft[]>([]);
  const [tagImageIndex, setTagImageIndex] = useState(0);
  const [tagColorName, setTagColorName] = useState("");

  const [f, setF] = useState<FormState>({
    title: existing?.title ?? "",
    description: existing?.description ?? "",
    images: existing?.images ?? [],
    cost_price: existing?.cost_price ?? 0,
    shipping_fee: existing?.shipping_fee ?? defShip,
    selling_price: existing?.selling_price ?? 0,
    stock: existing?.stock ?? 0,
    sizes: existing?.sizes ?? [],
    colors: existing?.colors ?? [],
    source: existing?.source ?? "manual",
    source_url: existing?.source_url ?? null,
    published: existing?.published ?? true,
    collection_id: existing?.collection_id ?? null,
    shipping_origin: existing?.shipping_origin ?? null,
    shipping_min_days: existing?.shipping_min_days ?? null,
    shipping_max_days: existing?.shipping_max_days ?? null,
    shipping_cost_min: existing?.shipping_cost_min ?? 0,
    shipping_cost_max: existing?.shipping_cost_max ?? 0,
  });

  useEffect(() => {
    if (existingTags?.length) {
      setColorTags(
        existingTags.map((t: ProductColorTag) => ({
          id: t.id,
          image_index: t.image_index,
          color_name: t.color_name,
          color_code: t.color_code,
        })),
      );
    }
  }, [existingTags]);

  async function handleImport() {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const result = await runImport({ data: { url: importUrl.trim() } });
      setF((p) => ({
        ...p,
        title: result.title,
        description: result.description,
        images: result.images.length ? result.images : p.images,
        cost_price: result.cost_price,
        sizes: result.sizes,
        colors: result.colors,
        source: "aliexpress",
        source_url: result.source_url,
        shipping_origin: result.shipping_origin,
        shipping_min_days: result.shipping_min_days,
        shipping_max_days: result.shipping_max_days,
        shipping_cost_min: result.shipping_cost_min,
        shipping_cost_max: result.shipping_cost_max,
      }));
      if (result.live) {
        toast.success("Product imported from AliExpress");
      } else {
        toast.info("Stub import — add your RapidAPI key for real data");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setF((p) => ({ ...p, images: [...p.images, url] }));
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    setF((p) => ({ ...p, images: p.images.filter((_, i) => i !== idx) }));
    setColorTags((tags) => tags.filter((t) => t.image_index !== idx).map((t) => ({
      ...t,
      image_index: t.image_index > idx ? t.image_index - 1 : t.image_index,
    })));
  }

  function toggleSize(size: string) {
    setF((p) => ({
      ...p,
      sizes: p.sizes.includes(size) ? p.sizes.filter((s) => s !== size) : [...p.sizes, size],
    }));
  }

  function toggleColor(color: string) {
    setF((p) => ({
      ...p,
      colors: p.colors.includes(color) ? p.colors.filter((c) => c !== color) : [...p.colors, color],
    }));
  }

  function addCustomSize() {
    const s = customSize.trim();
    if (!s) return;
    setF((p) => ({ ...p, sizes: p.sizes.includes(s) ? p.sizes : [...p.sizes, s] }));
    setCustomSize("");
  }

  function addCustomColor() {
    const c = customColor.trim();
    if (!c) return;
    setF((p) => ({ ...p, colors: p.colors.includes(c) ? p.colors : [...p.colors, c] }));
    setCustomColor("");
  }

  function addColorTag() {
    if (!tagColorName.trim() || f.images.length === 0) return;
    const code = generateColorCode(tagColorName);
    setColorTags((tags) => [
      ...tags,
      { image_index: tagImageIndex, color_name: tagColorName.trim(), color_code: code },
    ]);
    setTagColorName("");
  }

  function removeColorTag(idx: number) {
    setColorTags((tags) => tags.filter((_, i) => i !== idx));
  }

  function recalcPrice() {
    if (autoPrice) {
      setF((p) => ({
        ...p,
        selling_price: computeSellingPrice(p.cost_price, p.shipping_fee, multiplier),
      }));
    }
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        title: f.title,
        description: f.description || null,
        images: f.images,
        cost_price: Number(f.cost_price),
        shipping_fee: Number(f.shipping_fee),
        selling_price: autoPrice
          ? computeSellingPrice(f.cost_price, f.shipping_fee, multiplier)
          : Number(f.selling_price),
        stock: Number(f.stock),
        sizes: f.sizes,
        colors: f.colors,
        source: f.source,
        source_url: f.source_url,
        published: f.published,
        collection_id: f.collection_id,
        shipping_origin: f.shipping_origin || null,
        shipping_min_days: f.shipping_min_days ? Number(f.shipping_min_days) : null,
        shipping_max_days: f.shipping_max_days ? Number(f.shipping_max_days) : null,
        shipping_cost_min: Number(f.shipping_cost_min),
        shipping_cost_max: Number(f.shipping_cost_max),
      };

      let productId = existing?.id;

      if (existing) {
        const { error } = await supabase.from("products").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        productId = data.id;
      }

      if (productId) {
        await supabase.from("product_color_tags").delete().eq("product_id", productId);
        if (colorTags.length > 0) {
          const { error: tagErr } = await supabase.from("product_color_tags").insert(
            colorTags.map((t) => ({
              product_id: productId,
              image_index: t.image_index,
              color_name: t.color_name,
              color_code: t.color_code,
            })),
          );
          if (tagErr) console.error("[color tags]", tagErr);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product_color_tags"] });
      toast.success(existing ? "Product updated" : "Product created");
      navigate({ to: "/admin/products" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Link2 className="h-4 w-4" /> Import from AliExpress
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Paste AliExpress product URL"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleImport())}
          />
          <Button onClick={handleImport} disabled={importing} variant="secondary">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Import
          </Button>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="text-sm font-semibold">Product details</div>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" rows={3} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <div>
          <Label>Collection</Label>
          <Select
            value={f.collection_id ?? "none"}
            onValueChange={(v) => setF({ ...f, collection_id: v === "none" ? null : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a collection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No collection</SelectItem>
              {collections?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="text-sm font-semibold">Images</div>
        <div className="flex flex-wrap gap-3">
          {f.images.map((img, idx) => (
            <div key={idx} className="relative">
              <img src={img} alt="" className="h-20 w-20 rounded-lg border border-border object-cover" />
              <button
                onClick={() => removeImage(idx)}
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground"
              >
                <X className="h-3 w-3" />
              </button>
              {colorTags.filter((t) => t.image_index === idx).map((tag, ti) => (
                <span
                  key={ti}
                  className="absolute bottom-0 left-0 right-0 truncate rounded-b-lg bg-primary/90 px-1 py-0.5 text-[10px] font-medium text-primary-foreground"
                  title={`${tag.color_name} (${tag.color_code})`}
                >
                  {tag.color_name} · {tag.color_code}
                </span>
              ))}
            </div>
          ))}
          <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-lg border border-dashed border-border hover:border-primary">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
            <input type="file" accept="image/*" hidden onChange={(e) => handleUpload(e.target.files?.[0])} />
          </label>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Tag className="h-4 w-4" /> Color Tags
        </div>
        <p className="text-xs text-muted-foreground">
          {`Tag specific images with a color name. A short code is auto-generated (e.g. "Red" -> "RD"). Customers can pick a product by color.`}
        </p>
        {f.images.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Select value={String(tagImageIndex)} onValueChange={(v) => setTagImageIndex(Number(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {f.images.map((_, idx) => (
                    <SelectItem key={idx} value={String(idx)}>Image {idx + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Color name (e.g. Red)"
                value={tagColorName}
                onChange={(e) => setTagColorName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColorTag())}
                className="flex-1"
              />
              <Button onClick={addColorTag} variant="secondary" size="sm">Add tag</Button>
            </div>
            {colorTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {colorTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"
                  >
                    <span className="font-medium">{tag.color_name}</span>
                    <span className="text-muted-foreground">({tag.color_code})</span>
                    <span className="text-muted-foreground">· img {tag.image_index + 1}</span>
                    <button onClick={() => removeColorTag(idx)} className="ml-0.5 text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Add images first to tag them with colors.</p>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <div className="text-sm font-semibold">Pricing</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="cost">Cost price (₦)</Label>
            <Input id="cost" type="number" min={0} value={f.cost_price}
              onChange={(e) => { setF({ ...f, cost_price: Number(e.target.value) }); setTimeout(recalcPrice, 0); }} />
          </div>
          <div>
            <Label htmlFor="ship">Shipping fee (₦)</Label>
            <Input id="ship" type="number" min={0} value={f.shipping_fee}
              onChange={(e) => { setF({ ...f, shipping_fee: Number(e.target.value) }); setTimeout(recalcPrice, 0); }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={autoPrice} onCheckedChange={(v) => { setAutoPrice(v); if (v) recalcPrice(); }} />
          <Label>Auto-calculate selling price</Label>
        </div>
        <div>
          <Label htmlFor="sell">Selling price (₦)</Label>
          <Input id="sell" type="number" min={0} value={f.selling_price} disabled={autoPrice}
            onChange={(e) => setF({ ...f, selling_price: Number(e.target.value) })} />
          {autoPrice && (
            <p className="mt-1 text-xs text-muted-foreground">
              = (cost + shipping) × {multiplier} = {formatNaira(computeSellingPrice(f.cost_price, f.shipping_fee, multiplier))}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="stock">Stock</Label>
          <Input id="stock" type="number" min={0} value={f.stock}
            onChange={(e) => setF({ ...f, stock: Number(e.target.value) })} />
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Truck className="h-4 w-4" /> Shipping Information
        </div>
        <div>
          <Label htmlFor="ship-origin">Shipping origin</Label>
          <Input id="ship-origin" placeholder="e.g. China, Lagos" value={f.shipping_origin ?? ""}
            onChange={(e) => setF({ ...f, shipping_origin: e.target.value || null })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ship-min">Min delivery days</Label>
            <Input id="ship-min" type="number" min={0} value={f.shipping_min_days ?? ""}
              onChange={(e) => setF({ ...f, shipping_min_days: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div>
            <Label htmlFor="ship-max">Max delivery days</Label>
            <Input id="ship-max" type="number" min={0} value={f.shipping_max_days ?? ""}
              onChange={(e) => setF({ ...f, shipping_max_days: e.target.value ? Number(e.target.value) : null })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ship-cost-min">Min shipping cost (₦)</Label>
            <Input id="ship-cost-min" type="number" min={0} value={f.shipping_cost_min}
              onChange={(e) => setF({ ...f, shipping_cost_min: Number(e.target.value) })} />
          </div>
          <div>
            <Label htmlFor="ship-cost-max">Max shipping cost (₦)</Label>
            <Input id="ship-cost-max" type="number" min={0} value={f.shipping_cost_max}
              onChange={(e) => setF({ ...f, shipping_cost_max: Number(e.target.value) })} />
          </div>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="text-sm font-semibold">Variants</div>
        <div>
          <Label>Sizes</Label>
          <div className="mt-1 flex flex-wrap gap-2">
            {ALL_SIZES.map((s) => (
              <label key={s} className="flex items-center gap-1.5 text-sm">
                <Checkbox checked={f.sizes.includes(s)} onCheckedChange={() => toggleSize(s)} />
                {s}
              </label>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input placeholder="Custom size" value={customSize} onChange={(e) => setCustomSize(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSize())} className="max-w-40" />
            <Button onClick={addCustomSize} variant="outline" size="sm">Add</Button>
          </div>
          {f.sizes.filter((s) => !ALL_SIZES.includes(s as any)).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {f.sizes.filter((s) => !ALL_SIZES.includes(s as any)).map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                  {s}
                  <button onClick={() => toggleSize(s)} className="text-destructive"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div>
          <Label>Colors</Label>
          <div className="mt-1 flex flex-wrap gap-2">
            {ALL_COLORS.map((c) => (
              <label key={c} className="flex items-center gap-1.5 text-sm">
                <Checkbox checked={f.colors.includes(c)} onCheckedChange={() => toggleColor(c)} />
                {c}
              </label>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input placeholder="Custom color" value={customColor} onChange={(e) => setCustomColor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomColor())} className="max-w-40" />
            <Button onClick={addCustomColor} variant="outline" size="sm">Add</Button>
          </div>
          {f.colors.filter((c) => !ALL_COLORS.includes(c as any)).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {f.colors.filter((c) => !ALL_COLORS.includes(c as any)).map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                  {c}
                  <button onClick={() => toggleColor(c)} className="text-destructive"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Switch checked={f.published} onCheckedChange={(v) => setF({ ...f, published: v })} />
          <Label>Published (visible to customers)</Label>
        </div>
      </Card>

      <Button onClick={save} disabled={saving} size="lg">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : existing ? "Save changes" : "Create product"}
      </Button>
    </div>
  );
}
