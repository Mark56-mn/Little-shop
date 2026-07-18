import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useCart } from "@/hooks/useCart";
import { useStoreSettings } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { formatNaira } from "@/lib/store";
import { createMultiItemOrder } from "@/lib/payments.functions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { StoreHeader } from "@/components/storefront/StoreHeader";
import { WhatsAppButton } from "@/components/storefront/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronLeft, Trash2, Minus, Plus, Loader2, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const navigate = useNavigate();
  const { items, removeItem, setQuantity, clear } = useCart();
  const { data: settings } = useStoreSettings();
  const { session } = useAuth();
  const runCheckout = useServerFn(createMultiItemOrder);

  const [buying, setBuying] = useState(false);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [redeemPoints, setRedeemPoints] = useState(0);

  const { data: pointsBalance = 0 } = useQuery({
    queryKey: ["my-points", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("points_balance").maybeSingle();
      return data?.points_balance ?? 0;
    },
  });

  async function handleCheckout() {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim()) {
      toast.error("Please fill in all details");
      return;
    }

    setBuying(true);
    try {
      const result = await runCheckout({
        data: {
          items: items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            price: item.price,
          })),
          customer_name: customer.name.trim(),
          customer_phone: customer.phone.trim(),
          customer_address: customer.address.trim(),
          user_id: session?.user.id ?? null,
          redeem_points: redeemPoints || undefined,
        },
      });

      clear();
      navigate({
        to: "/checkout/success",
        search: { ref: result.order_id },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBuying(false);
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Math.max(0, subtotal - (redeemPoints || 0));
  const maxRedeem = session ? Math.min(pointsBalance, Math.floor(subtotal * 0.5)) : 0;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-muted-foreground">Add some products to get started.</p>
          <Button asChild className="mt-6">
            <Link to="/">Continue Shopping</Link>
          </Button>
        </div>
        <WhatsAppButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to shop
        </Link>

        <h1 className="mt-4 text-2xl font-bold">Shopping Cart</h1>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => (
              <Card key={`${item.product_id}-${item.size}-${item.color}`} className="p-4">
                <div className="flex gap-4">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{item.title}</h3>
                    {(item.size || item.color) && (
                      <p className="text-xs text-muted-foreground">
                        {item.size && `Size: ${item.size}`}
                        {item.size && item.color && " · "}
                        {item.color && `Color: ${item.color}`}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-semibold">{formatNaira(item.price)}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() =>
                        removeItem({
                          product_id: item.product_id,
                          size: item.size,
                          color: item.color,
                        })
                      }
                      className="text-destructive hover:bg-destructive/10 rounded p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-1 border border-border rounded">
                      <button
                        onClick={() =>
                          setQuantity(
                            {
                              product_id: item.product_id,
                              size: item.size,
                              color: item.color,
                            },
                            item.quantity - 1
                          )
                        }
                        className="p-1 hover:bg-secondary"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() =>
                          setQuantity(
                            {
                              product_id: item.product_id,
                              size: item.size,
                              color: item.color,
                            },
                            item.quantity + 1
                          )
                        }
                        className="p-1 hover:bg-secondary"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Summary & Checkout */}
          <div>
            <Card className="sticky top-20 space-y-4 p-4">
              <div>
                <div className="text-sm font-semibold">Order Summary</div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatNaira(subtotal)}</span>
                  </div>
                  {redeemPoints > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="text-muted-foreground">Points redeemed</span>
                      <span>-{formatNaira(redeemPoints)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatNaira(total)}</span>
                  </div>
                </div>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full" disabled={buying}>
                    {buying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Checkout
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Complete your order</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="cname">Full name</Label>
                      <Input
                        id="cname"
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cphone">Phone number</Label>
                      <Input
                        id="cphone"
                        placeholder="08012345678"
                        value={customer.phone}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="caddr">Delivery address</Label>
                      <Textarea
                        id="caddr"
                        rows={2}
                        value={customer.address}
                        onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                      />
                    </div>
                    {session && maxRedeem > 0 && (
                      <div>
                        <Label htmlFor="pts">Redeem points (max {maxRedeem})</Label>
                        <Input
                          id="pts"
                          type="number"
                          min={0}
                          max={maxRedeem}
                          value={redeemPoints}
                          onChange={(e) => setRedeemPoints(Number(e.target.value))}
                        />
                      </div>
                    )}
                    <div className="rounded-lg bg-secondary/50 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-bold">{formatNaira(total)}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Payment via bank transfer</p>
                    </div>
                    <Button onClick={handleCheckout} disabled={buying} className="w-full">
                      {buying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Place order
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" className="w-full" onClick={() => clear()}>
                Clear cart
              </Button>
            </Card>
          </div>
        </div>
      </div>
      <WhatsAppButton />
    </div>
  );
}
