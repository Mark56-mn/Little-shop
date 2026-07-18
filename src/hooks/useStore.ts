import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product, StoreSettings, Collection, ProductColorTag } from "@/lib/store";

export function useStoreSettings() {
  return useQuery({
    queryKey: ["store_settings"],
    queryFn: async (): Promise<StoreSettings | null> => {
      const { data, error } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as unknown as StoreSettings | null;
    },
  });
}

export function usePublishedProducts(collectionId?: string) {
  return useQuery({
    queryKey: ["products", "published", collectionId ?? "all"],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase
        .from("products")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (collectionId) query = query.eq("collection_id", collectionId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as Product | null;
    },
    enabled: !!id,
  });
}

export function useCollections() {
  return useQuery({
    queryKey: ["collections"],
    queryFn: async (): Promise<Collection[]> => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Collection[];
    },
  });
}

export function useProductColorTags(productId: string) {
  return useQuery({
    queryKey: ["product_color_tags", productId],
    queryFn: async (): Promise<ProductColorTag[]> => {
      const { data, error } = await supabase
        .from("product_color_tags")
        .select("*")
        .eq("product_id", productId)
        .order("image_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProductColorTag[];
    },
    enabled: !!productId,
  });
}
