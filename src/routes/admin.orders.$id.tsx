import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSettings } from "@/hooks/useStore";
import { formatNaira, whatsappUrl } from "@/lib/store";
import { confirmBankTransfer } from "@/lib/payments.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Loader2, CheckCircle2, Building2, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/admin/orders/$id")({
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { data: settings } = useStoreSettings();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const runConfirm = useServerFn(confirmBankTransfer);

  useEffect(() => {
    supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          toast.error("Could not load order");
        } else {
          setOrder(data);
        }
        setLoading(false);
      });
  }, [id]);

  async function confirmPayment() {
    setConfirming(true);
    try {
      await runConfirm({ data: { order_id: id } });
      setOrder((o: any) => ({ ...o, payment_status: "paid" }));
      toast.success("Payment confirmed — order marked as paid");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not confirm");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="grid place-items-center py-12 text-center">
        <p className="text-muted-foreground">Order not found</p>
        <Button asChild className="mt-4"><Link to="/admin/orders">Back to orders</Link></Button>
      </div>
    );
  }

  const statusColor =
    order.payment_status === "paid" ? "success" :
    order.payment_status === "failed" ? "destructive" : "secondary";

  return (
    <div className="max-w-2xl">
      <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to orders
      </Link>

      <div className="mt-4 space-y-4">
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Order</h1>
            <Badge variant={statusColor as any}>{order.payment_status}</Badge>
          </div>
          <div className="space-y-1 text-sm">
            <div><span className="text-muted-foreground">Reference:</span> {order.paystack_reference}</div>
            <div><span className="text-muted-foreground">Payment method:</span> {order.payment_method || "bank_transfer"}</div>
            <div><span className="text-muted-foreground">Product:</span> {order.product_title}</div>
            <div><span className="text-muted-foreground">Quantity:</span> {order.quantity}</div>
            {order.selected_size && <div><span className="text-muted-foreground">Size:</span> {order.selected_size}</div>}
            {order.selected_color && <div><span className="text-muted-foreground">Color:</span> {order.selected_color}</div>}
            <div><span className="text-muted-foreground">Total:</span> <span className="font-bold">{formatNaira(order.total_amount)}</span></div>
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          <div className="text-sm font-semibold">Customer</div>
          <div className="space-y-1 text-sm">
            <div>{order.customer_name}</div>
            <div>{order.customer_phone}</div>
            <div>{order.customer_address}</div>
          </div>
          {settings?.whatsapp_number && (
            <a
              href={whatsappUrl(settings.whatsapp_number, `Hi ${order.customer_name}, regarding your order ${order.paystack_reference}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <MessageCircle className="h-4 w-4" /> Contact on WhatsApp
            </a>
          )}
        </Card>

        {order.payment_method === "bank_transfer" && order.payment_status === "pending" && (
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="h-4 w-4" /> Bank Transfer Confirmation
            </div>
            <p className="text-sm text-muted-foreground">
              The customer was asked to transfer {formatNaira(order.total_amount)} to your bank account.
              Verify that you have received the payment, then confirm below.
            </p>
            <Button onClick={confirmPayment} disabled={confirming}>
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm payment received
            </Button>
          </Card>
        )}

        {order.payment_status === "paid" && (
          <Card className="flex items-center gap-2 p-4 text-sm">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Payment confirmed. This order is ready for processing.
          </Card>
        )}
      </div>
    </div>
  );
}
