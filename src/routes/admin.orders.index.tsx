import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/admin/orders/")({
  component: Orders,
});

const statusColor: Record<string, "default" | "secondary" | "destructive" | "success"> = {
  paid: "success",
  pending: "secondary",
  failed: "destructive",
};

function Orders() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin", "orders", "list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Orders</h1>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-2">
          {orders.map((o: any) => (
            <Link key={o.id} to="/admin/orders/$id" params={{ id: o.id }} className="block">
              <Card className="p-4 transition-colors hover:border-primary/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.product_title}</p>
                    <p className="text-sm text-muted-foreground">
                      {o.customer_name} · {o.customer_phone}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{o.customer_address}</p>
                    {(o.selected_size || o.selected_color) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[o.selected_size, o.selected_color].filter(Boolean).join(" / ")} · Qty {o.quantity}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("en-NG")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <p className="font-display font-bold text-primary">{formatNaira(o.total_amount)}</p>
                      <Badge variant={statusColor[o.payment_status] ?? "secondary"} className="mt-1 capitalize">
                        {o.payment_status}
                      </Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="grid place-items-center py-16 text-center">
          <ShoppingCart className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">No orders yet</p>
          <p className="text-sm text-muted-foreground">Orders will appear here after checkout.</p>
        </Card>
      )}
    </div>
  );
}
