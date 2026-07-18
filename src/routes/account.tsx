import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useStoreSettings } from "@/hooks/useStore";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/storefront/StoreHeader";
import { WhatsAppButton } from "@/components/storefront/WhatsAppButton";
import { formatNaira, whatsappUrl } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageOff, Minus, Plus, ShoppingCart, Trash2, User, LogOut, MessageCircle, Star, Gift, Copy } from "lucide-react";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your Account & Cart — PlugMart" },
      { name: "description", content: "View your cart and account details on PlugMart." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { session } = useAuth();
  const { items, total, count, removeItem, setQuantity, clear } = useCart();
  const { data: settings } = useStoreSettings();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const cartWhatsappUrl = whatsappUrl(
    settings?.whatsapp_number,
    `Hi ${settings?.store_name || "PlugMart"}! I'd like to ask about my cart:\n\n` +
      items
        .map(
          (i, n) =>
            `${n + 1}. ${i.title}` +
            `${i.size || i.color ? ` (${[i.size, i.color].filter(Boolean).join(" / ")})` : ""}` +
            ` x${i.quantity} — ${formatNaira(i.price * i.quantity)}`,
        )
        .join("\n") +
      `\n\nTotal: ${formatNaira(total)}`,
  );

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <StoreHeader />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* Account details */}
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <User className="h-4 w-4 text-primary" /> Account details
          </div>
          {session ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{session.user.email}</p>
                <p className="text-xs text-muted-foreground">
                  Member since {new Date(session.user.created_at).toLocaleDateString("en-NG")}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="mr-1.5 h-4 w-4" /> Sign out
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                You are shopping as a guest. No account needed to buy — sign in only if you created one.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          )}
        </Card>

        {/* Rewards & referrals */}
        {session && <RewardsCard />}



        {/* Cart */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShoppingCart className="h-4 w-4 text-primary" /> Your cart ({count})
            </div>
            {items.length > 0 && (
              <button onClick={clear} className="text-xs text-muted-foreground hover:text-destructive">
                Clear all
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="grid place-items-center py-12 text-center">
              <ShoppingCart className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-medium">Your cart is empty</p>
              <Button asChild className="mt-3" size="sm">
                <Link to="/">Start shopping</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={`${item.product_id}|${item.size ?? ""}|${item.color ?? ""}`}
                    className="flex gap-3 rounded-xl border border-border/60 p-3"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-muted-foreground">
                          <ImageOff className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/product/$id"
                        params={{ id: item.product_id }}
                        className="line-clamp-2 text-sm font-medium hover:text-primary"
                      >
                        {item.title}
                      </Link>
                      {(item.size || item.color) && (
                        <p className="text-xs text-muted-foreground">
                          {[item.size, item.color].filter(Boolean).join(" / ")}
                        </p>
                      )}
                      <p className="mt-0.5 text-sm font-semibold text-primary">{formatNaira(item.price)}</p>
                      {settings?.whatsapp_number && (
                        <a
                          href={whatsappUrl(
                            settings.whatsapp_number,
                            `Hi ${settings.store_name || "PlugMart"}! I want to ask about:\n\n${item.title}` +
                              `${item.size || item.color ? ` (${[item.size, item.color].filter(Boolean).join(" / ")})` : ""}` +
                              ` x${item.quantity}\nTotal: ${formatNaira(item.price * item.quantity)}`,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-success hover:underline"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> Ask on WhatsApp
                        </a>
                      )}
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeItem(item)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex items-center gap-1 rounded-lg border border-border">
                        <button
                          className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground"
                          onClick={() => setQuantity(item, item.quantity - 1)}
                          aria-label="Decrease"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground"
                          onClick={() => setQuantity(item, item.quantity + 1)}
                          aria-label="Increase"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-display text-xl font-bold text-primary">{formatNaira(total)}</span>
              </div>
              {settings?.whatsapp_number && (
                <a
                  href={cartWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-semibold text-success-foreground transition-transform hover:scale-[1.01]"
                >
                  <MessageCircle className="h-4 w-4" /> Ask about my cart on WhatsApp
                </a>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Tap a product to complete secure checkout with Paystack.
              </p>
            </>
          )}
        </Card>
      </div>
      <WhatsAppButton />
    </div>
  );
}

function RewardsCard() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["rewards"],
    queryFn: async () => {
      const [{ data: profile }, { data: tx }] = await Promise.all([
        supabase.from("profiles").select("referral_code, points_balance, referred_by").maybeSingle(),
        supabase
          .from("point_transactions")
          .select("id, points, reason, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      return { profile, tx: tx ?? [] };
    },
  });

  const profile = data?.profile;
  const referralLink =
    typeof window !== "undefined" && profile?.referral_code
      ? `${window.location.origin}/?ref=${profile.referral_code}`
      : "";

  async function copyLink() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  }

  async function applyCode() {
    const clean = code.trim().toUpperCase();
    if (clean.length < 3) {
      toast.error("Enter a valid referral code.");
      return;
    }
    setApplying(true);
    try {
      const { data: res, error } = await supabase.rpc("apply_referral", { _code: clean });
      if (error) throw error;
      const messages: Record<string, string> = {
        ok: "Referral applied! Your friend earned points. 🎉",
        already_referred: "You've already used a referral code.",
        invalid_code: "That referral code doesn't exist.",
        self_referral: "You can't refer yourself.",
        not_authenticated: "Please sign in first.",
      };
      const status = (res as string) ?? "error";
      if (status === "ok") {
        toast.success(messages.ok);
        setCode("");
        queryClient.invalidateQueries({ queryKey: ["rewards"] });
      } else {
        toast.error(messages[status] ?? "Could not apply code.");
      }
    } catch {
      toast.error("Could not apply referral code.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Star className="h-4 w-4 text-primary" /> Rewards & referrals
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-5">
          {/* Points balance */}
          <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">Your points</p>
              <p className="font-display text-2xl font-bold text-primary">
                {profile?.points_balance ?? 0}
              </p>
            </div>
            <p className="max-w-[55%] text-right text-xs text-muted-foreground">
              1 point = ₦1 off. Use points at checkout for up to 50% off any order.
            </p>
          </div>

          {/* Referral link */}
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Gift className="h-4 w-4 text-success" /> Invite friends, earn points
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Share your link. You earn <strong>100 points</strong> when a friend signs up and{" "}
              <strong>500 points</strong> when they make their first purchase.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={referralLink} className="text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={copyLink} aria-label="Copy link">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Your code: <span className="font-mono font-semibold">{profile?.referral_code}</span>
            </p>
          </div>

          {/* Apply a code */}
          {!profile?.referred_by && (
            <div>
              <p className="mb-2 text-sm font-medium">Have a referral code?</p>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter code"
                  className="uppercase"
                />
                <Button type="button" onClick={applyCode} disabled={applying}>
                  Apply
                </Button>
              </div>
            </div>
          )}

          {/* History */}
          {data && data.tx.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Points history</p>
              <div className="space-y-1.5">
                {data.tx.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t.reason}</span>
                    <span className={t.points >= 0 ? "font-medium text-success" : "font-medium text-destructive"}>
                      {t.points >= 0 ? "+" : ""}
                      {t.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

