import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getPublicSupabase, signImagePaths } from "./supabase-server";

export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getPublicSupabase();
  const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return null;
  const [logo, banner] = await Promise.all([
    data.logo_url
      ? signImagePaths(supabase, "branding", [data.logo_url]).then((r) => r[0])
      : Promise.resolve(""),
    data.banner_url
      ? signImagePaths(supabase, "branding", [data.banner_url]).then((r) => r[0])
      : Promise.resolve(""),
  ]);
  return { ...data, logo_signed_url: logo, banner_signed_url: banner };
});

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getPublicSupabase();
  const { data } = await supabase.from("categories").select("*").order("sort_order");
  return data ?? [];
});

async function attachSignedImages(
  client: ReturnType<typeof getPublicSupabase>,
  products: Array<{ image_urls: string[] | null }>,
) {
  return Promise.all(
    products.map(async (p) => ({
      ...p,
      signed_image_urls: await signImagePaths(client, "product-images", p.image_urls),
    })),
  );
}

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((input: { trending?: boolean; categorySlug?: string; limit?: number } = {}) =>
    z
      .object({
        trending: z.boolean().optional(),
        categorySlug: z.string().optional(),
        limit: z.number().int().positive().max(100).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();
    let q = supabase
      .from("products")
      .select("*, categories(slug, name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (data.trending) q = q.eq("is_trending", true);
    if (data.limit) q = q.limit(data.limit);
    const { data: rows } = await q;
    let filtered = rows ?? [];
    if (data.categorySlug) {
      filtered = filtered.filter((r: any) => r.categories?.slug === data.categorySlug);
    }
    return attachSignedImages(supabase, filtered as any) as any;
  });

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();
    const { data: row } = await supabase
      .from("products")
      .select("*, categories(slug, name)")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return null;
    const signed_image_urls = await signImagePaths(supabase, "product-images", row.image_urls);
    return { ...row, signed_image_urls };
  });

export const getProductVariants = createServerFn({ method: "GET" })
  .inputValidator((input: { productId: string }) => z.object({ productId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();
    const { data: variants } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", data.productId)
      .order("sort_order", { ascending: true });
    if (!variants) return [];
    return Promise.all(
      variants.map(async (v) => ({
        ...v,
        signed_image_urls: await signImagePaths(supabase, "product-images", v.image_urls || []),
      })),
    );
  });
