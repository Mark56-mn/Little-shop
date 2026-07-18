import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const checkoutSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  size: z.string().max(20).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z.string().trim().min(6).max(30),
  customer_address: z.string().trim().min(5).max(500),
  user_id: z.string().uuid().optional().nullable(),
  redeem_points: z.number().int().min(0).max(1000000).optional(),
});

export interface CheckoutResult {
  order_id: string;
  reference: string;
  authorization_url: string | null;
  live: boolean;
  payment_method: string;
  bank_details: {
    bank_name: string | null;
    account_name: string | null;
    account_number: string | null;
    sort_code: string | null;
    instructions: string | null;
  } | null;
}

export const initCheckout = createServerFn({ method: "POST" })
  .inputValidator((data) => checkoutSchema.parse(data))
  .handler(async ({ data }): Promise<CheckoutResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: product, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id, title, selling_price, stock, published")
      .eq("id", data.product_id)
      .maybeSingle();
    if (pErr || !product) throw new Error("Product not found");
    if (!product.published) throw new Error("Product is not available");

    const baseTotal = Number(product.selling_price) * data.quantity;

    let discount = 0;
    let pointsRedeemed = 0;
    if (data.user_id && data.redeem_points && data.redeem_points > 0) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("points_balance")
        .eq("id", data.user_id)
        .maybeSingle();
      const balance = profile?.points_balance ?? 0;
      const maxDiscount = Math.floor(baseTotal * 0.5);
      pointsRedeemed = Math.min(data.redeem_points, balance, maxDiscount);
      discount = Math.max(0, pointsRedeemed);
    }
    const total = Math.max(0, baseTotal - discount);
    const reference = `PM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        product_id: product.id,
        product_title: product.title,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_address: data.customer_address,
        selected_size: data.size ?? null,
        selected_color: data.color ?? null,
        quantity: data.quantity,
        total_amount: total,
        payment_status: "pending",
        paystack_reference: reference,
        user_id: data.user_id ?? null,
        points_redeemed: pointsRedeemed,
        payment_method: "bank_transfer",
      })
      .select("id")
      .single();
    if (oErr || !order) throw new Error("Could not create order");

    const { data: settings } = await supabaseAdmin
      .from("store_settings")
      .select("bank_name, bank_account_name, bank_account_number, bank_sort_code, bank_transfer_instructions")
      .limit(1)
      .maybeSingle();

    const bankDetails = settings
      ? {
          bank_name: settings.bank_name,
          account_name: settings.bank_account_name,
          account_number: settings.bank_account_number,
          sort_code: settings.bank_sort_code,
          instructions: settings.bank_transfer_instructions,
        }
      : null;

    return {
      order_id: order.id,
      reference,
      authorization_url: null,
      live: true,
      payment_method: "bank_transfer",
      bank_details: bankDetails,
    };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ reference: z.string().min(3).max(120) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find the order by reference
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, product_title, total_amount, payment_status, customer_name, payment_method")
      .eq("paystack_reference", data.reference)
      .maybeSingle();
    
    if (orderError || !order) throw new Error("Could not find order");

    // For bank transfers, fetch bank details from settings
    const { data: settings } = await supabaseAdmin
      .from("store_settings")
      .select("bank_name, bank_account_name, bank_account_number, bank_sort_code, bank_transfer_instructions")
      .limit(1)
      .maybeSingle();
    
    const bankDetails = settings
      ? {
          bank_name: settings.bank_name,
          account_name: settings.bank_account_name,
          account_number: settings.bank_account_number,
          sort_code: settings.bank_sort_code,
          instructions: settings.bank_transfer_instructions,
        }
      : null;

    // Bank transfer orders stay pending until admin manually confirms
    return { paid: false, order: { ...order, bank_details: bankDetails } };
  });

export const confirmBankTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ order_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("id", data.order_id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error("Could not update order");

    if (order?.id) {
      const { error: sErr } = await supabaseAdmin.rpc("settle_paid_order", { _order_id: order.id });
      if (sErr) console.error("[settle_paid_order]", sErr);
    }

    return { success: true };
  });

/**
 * Handle signup with referral code - award 5000 bonus to new user
 */
export const handleSignupWithReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      referral_code: z.string().optional(),
      email: z.string().email(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Award 5000 bonus to new user
    const { error: pointsErr } = await supabaseAdmin
      .from("customer_points")
      .upsert({
        user_id: context.userId,
        points_balance: 5000,
        points_earned: 5000,
      }, { onConflict: "user_id" });
    
    if (pointsErr) console.error("Points error:", pointsErr);

    // Also update profile points_balance
    await supabaseAdmin
      .from("profiles")
      .update({ points_balance: 5000 })
      .eq("id", context.userId);

    // Handle referral code if provided
    if (data.referral_code && data.referral_code.trim()) {
      const { data: referral } = await supabaseAdmin
        .from("referrals")
        .select("id, referrer_id")
        .eq("referral_code", data.referral_code.trim())
        .maybeSingle();

      if (referral) {
        // Link this user to the referrer
        await supabaseAdmin
          .from("profiles")
          .update({ referred_by: referral.referrer_id })
          .eq("id", context.userId);

        // Award the referrer 500 points for referring someone
        await supabaseAdmin
          .from("profiles")
          .update({ points_balance: supabaseAdmin.sql`points_balance + 500` })
          .eq("id", referral.referrer_id);
      }
    }

    return { success: true, bonus_points: 5000 };
  });

/**
 * Award points to a user for an activity
 */
export const awardPoints = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({
      user_id: z.string().uuid(),
      points_amount: z.number().int().min(0),
      activity_type: z.string(),
      order_id: z.string().uuid().optional(),
      description: z.string().optional(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: pointsErr } = await supabaseAdmin
      .from("customer_points")
      .upsert(
        {
          user_id: data.user_id,
          points_balance: data.points_amount,
          points_earned: data.points_amount,
        },
        { onConflict: "user_id", ignoreDuplicates: false }
      );
    if (pointsErr) throw new Error("Could not award points");

    await supabaseAdmin
      .from("points_activities")
      .insert({
        user_id: data.user_id,
        activity_type: data.activity_type,
        points_amount: data.points_amount,
        order_id: data.order_id ?? null,
        description: data.description,
      });

    return { success: true };
  });

/**
 * Redeem points as discount
 */
export const redeemPoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      points_to_redeem: z.number().int().min(1),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userPoints } = await supabaseAdmin
      .from("customer_points")
      .select("points_balance")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!userPoints || userPoints.points_balance < data.points_to_redeem) {
      throw new Error("Insufficient points");
    }

    await supabaseAdmin
      .from("customer_points")
      .update({
        points_balance: userPoints.points_balance - data.points_to_redeem,
        points_redeemed: userPoints.points_redeemed + data.points_to_redeem,
      })
      .eq("user_id", context.userId);

    await supabaseAdmin
      .from("points_activities")
      .insert({
        user_id: context.userId,
        activity_type: "redeemed",
        points_amount: -data.points_to_redeem,
        description: "Points redeemed as discount",
      });

    return { success: true, discount: data.points_to_redeem };
  });

/**
 * Generate referral code for a user
 */
export const generateReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin
      .from("store_settings")
      .select("referral_commission_percentage")
      .limit(1)
      .maybeSingle();

    const code = `REF-${context.userId.slice(0, 8).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const { data: referral, error } = await supabaseAdmin
      .from("referrals")
      .insert({
        referrer_id: context.userId,
        referral_code: code,
        commission_percentage: settings?.referral_commission_percentage ?? 10,
      })
      .select("id, referral_code")
      .single();

    if (error) throw new Error("Could not create referral code");
    return { referral_code: referral.referral_code };
  });

/**
 * Process referral commission when referred user makes a purchase
 */
export const processReferralCommission = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({
      order_id: z.string().uuid(),
      referred_user_id: z.string().uuid(),
      order_amount: z.number().min(0),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find referral for this user
    const { data: referral } = await supabaseAdmin
      .from("referrals")
      .select("id, referrer_id, commission_percentage")
      .eq("referred_user_id", data.referred_user_id)
      .maybeSingle();

    if (!referral) return { success: true, commission: 0 };

    const commission = (data.order_amount * referral.commission_percentage) / 100;

    // Record commission
    await supabaseAdmin
      .from("referral_commissions")
      .insert({
        referral_id: referral.id,
        order_id: data.order_id,
        commission_amount: commission,
        percentage: referral.commission_percentage,
      });

    // Update referrer's commission balance
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("referral_commission_balance")
      .eq("id", referral.referrer_id)
      .maybeSingle();

    await supabaseAdmin
      .from("profiles")
      .update({
        referral_commission_balance: (profile?.referral_commission_balance ?? 0) + commission,
      })
      .eq("id", referral.referrer_id);

    return { success: true, commission };
  });

/**
 * Request payout of referral earnings
 */
export const requestPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      amount: z.number().min(100),
      payout_method: z.enum(["bank_transfer", "wallet"]),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("can_request_payout, referral_commission_balance, payout_account_number, payout_account_name, payout_bank_name")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile?.can_request_payout) {
      throw new Error("You are not authorized to request payouts");
    }

    if (!profile.referral_commission_balance || profile.referral_commission_balance < data.amount) {
      throw new Error("Insufficient commission balance");
    }

    if (data.payout_method === "bank_transfer" && (!profile.payout_account_number || !profile.payout_account_name)) {
      throw new Error("Please provide bank details");
    }

    const { error } = await supabaseAdmin
      .from("payout_requests")
      .insert({
        user_id: context.userId,
        amount: data.amount,
        payout_method: data.payout_method,
        account_details: {
          account_number: profile.payout_account_number,
          account_name: profile.payout_account_name,
          bank_name: profile.payout_bank_name,
        },
      });

    if (error) throw new Error("Could not create payout request");

    // Deduct from balance
    await supabaseAdmin
      .from("profiles")
      .update({
        referral_commission_balance: profile.referral_commission_balance - data.amount,
      })
      .eq("id", context.userId);

    return { success: true };
  });

/**
 * For multi-item cart checkout from the cart page.
 * This creates an order with multiple order_items records.
 */
export const createMultiItemOrder = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({
      items: z.array(
        z.object({
          product_id: z.string().uuid(),
          quantity: z.number().int().min(1),
          size: z.string().optional().nullable(),
          color: z.string().optional().nullable(),
          price: z.number().min(0),
        })
      ).min(1),
      customer_name: z.string().trim().min(2).max(120),
      customer_phone: z.string().trim().min(6).max(30),
      customer_address: z.string().trim().min(5).max(500),
      user_id: z.string().uuid().optional().nullable(),
      redeem_points: z.number().int().min(0).optional(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Validate all products exist and are published
    for (const item of data.items) {
      const { data: product, error } = await supabaseAdmin
        .from("products")
        .select("id, published")
        .eq("id", item.product_id)
        .maybeSingle();
      if (error || !product || !product.published) {
        throw new Error(`Product ${item.product_id} not available`);
      }
    }

    const subtotal = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let pointsRedeemed = 0;
    let discount = 0;

    if (data.user_id && data.redeem_points && data.redeem_points > 0) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("points_balance")
        .eq("id", data.user_id)
        .maybeSingle();
      const balance = profile?.points_balance ?? 0;
      const maxDiscount = Math.floor(subtotal * 0.5);
      pointsRedeemed = Math.min(data.redeem_points, balance, maxDiscount);
      discount = Math.max(0, pointsRedeemed);
    }

    const total = Math.max(0, subtotal - discount);
    const reference = `PM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // Create order
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        product_title: `${data.items.length} items`,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_address: data.customer_address,
        quantity: data.items.reduce((sum, i) => sum + i.quantity, 0),
        total_amount: total,
        payment_status: "pending",
        paystack_reference: reference,
        user_id: data.user_id ?? null,
        points_redeemed: pointsRedeemed,
        payment_method: "bank_transfer",
      })
      .select("id")
      .single();
    if (oErr || !order) throw new Error("Could not create order");

    // Fetch product names for order items
    const productIds = data.items.map(i => i.product_id);
    const { data: products, error: productsErr } = await supabaseAdmin
      .from("products")
      .select("id, title")
      .in("id", productIds);
    if (productsErr) throw new Error("Could not fetch product details");

    const productMap = new Map(products?.map((p: any) => [p.id, p.title]) || []);

    // Add order items
    const orderItems = data.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_title: productMap.get(item.product_id) || "Unknown Product",
      selected_size: item.size ?? null,
      selected_color: item.color ?? null,
      quantity: item.quantity,
      unit_price: item.price,
    }));

    const { error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);
    if (itemsErr) throw new Error("Could not create order items");

    const { data: settings } = await supabaseAdmin
      .from("store_settings")
      .select("bank_name, bank_account_name, bank_account_number, bank_sort_code, bank_transfer_instructions")
      .limit(1)
      .maybeSingle();

    const bankDetails = settings
      ? {
          bank_name: settings.bank_name,
          account_name: settings.bank_account_name,
          account_number: settings.bank_account_number,
          sort_code: settings.bank_sort_code,
          instructions: settings.bank_transfer_instructions,
        }
      : null;

    return {
      order_id: order.id,
      reference,
      authorization_url: null,
      live: true,
      payment_method: "bank_transfer",
      bank_details: bankDetails,
    };
  });
