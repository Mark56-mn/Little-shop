import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPublicSupabase, signImagePaths } from "./supabase-server";

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50).default(1),
        guestName: z.string().trim().min(1).max(120).optional(),
        guestPhone: z.string().trim().min(7).max(30).optional(),
        guestEmail: z.string().trim().email().max(255).optional(),
        userId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id, price_naira, is_active, stock")
      .eq("id", data.productId)
      .maybeSingle();
    if (pErr || !product || !product.is_active) throw new Error("Product not available");

    const base = product.price_naira * data.quantity;
    // Append a unique 2-digit suffix in naira (1-99) to differentiate payments by amount.
    const unique = base + Math.floor(Math.random() * 99) + 1;

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: data.userId ?? null,
        product_id: data.productId,
        quantity: data.quantity,
        base_amount: base,
        unique_amount: unique,
        guest_name: data.guestName ?? null,
        guest_phone: data.guestPhone ?? null,
        guest_email: data.guestEmail ?? null,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: order.id };
  });

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("orders")
      .select("*, products(title, image_urls)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    const pub = getPublicSupabase();
    return Promise.all(
      (data ?? []).map(async (o: any) => ({
        ...o,
        product_image: (await signImagePaths(pub, "product-images", o.products?.image_urls))[0] ?? "",
      })),
    );
  });

// Keep in sync with the webhook's `norm()` so saved names match incoming
// Moniepoint payloads after both sides apply the same transform.
export function normalizeSenderName(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[^\p{L}\s'.\-]/gu, "") // letters, spaces, apostrophe, period, hyphen only
    .replace(/\s+/g, " ")
    .trim();
}

export const setOrderSenderName = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        senderName: z
          .string()
          .max(120)
          .transform((s) => normalizeSenderName(s))
          .refine((s) => s.length >= 3, "Sender name is too short")
          .refine((s) => s.split(" ").length >= 2, "Enter your full name (first and last)"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("set_order_sender_name", {
      _id: data.id,
      _sender_name: data.senderName,
    });
    if (error) throw error;
    return { ok: true, senderName: data.senderName };
  });

export const getOrderById = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getPublicSupabase();
    const { data: row } = await supabase.rpc("get_order_public", { _id: data.id });
    const order = Array.isArray(row) ? row[0] : row;
    if (!order) return null;
    const { data: product } = await supabase
      .from("products")
      .select("title, image_urls, price_naira")
      .eq("id", order.product_id)
      .maybeSingle();
    const signed = await signImagePaths(supabase, "product-images", product?.image_urls);
    return { ...order, product: product ? { ...product, signed_image_urls: signed } : null };
  });
