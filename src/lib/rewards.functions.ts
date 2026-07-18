import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface RewardsSummary {
  referral_code: string;
  points_balance: number;
  referred_by: string | null;
  transactions: {
    id: string;
    points: number;
    reason: string;
    created_at: string;
  }[];
}

/** Load the signed-in customer's points balance, referral code and history. */
export const getMyRewards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RewardsSummary> => {
    const { supabase, userId } = context;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("referral_code, points_balance, referred_by")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error("Could not load rewards");

    const { data: tx } = await supabase
      .from("point_transactions")
      .select("id, points, reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    return {
      referral_code: profile?.referral_code ?? "",
      points_balance: profile?.points_balance ?? 0,
      referred_by: profile?.referred_by ?? null,
      transactions: tx ?? [],
    };
  });

/** Apply a friend's referral code to the current account (once). */
export const applyReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ code: z.string().trim().min(3).max(20) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ status: string }> => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("apply_referral", {
      _code: data.code.toUpperCase(),
    });
    if (error) throw new Error("Could not apply referral code");
    return { status: (result as string) ?? "error" };
  });
