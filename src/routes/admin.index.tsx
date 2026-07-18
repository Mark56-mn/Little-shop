import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, ShoppingCart, Banknote, Plus, TrendingUp, BarChart3 } from "lucide-react";

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "all", label: "All time" },
] as const;

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const [range, setRange] = useState<string>("30");

  const { data: productCount } = useQuery({
    queryKey: ["admin", "product-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["admin", "orders-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("total_amount, payment_status, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { total_amount: number; payment_status: string; created_at: string }[];
    },
  });

  const analytics = useMemo(() => {
    const all = orders ?? [];
    const now = Date.now();
    const fromTs = range === "all" ? 0 : now - Number(range) * 24 * 60 * 60 * 1000;
    const inRange = all.filter((o) => new Date(o.created_at).getTime() >= fromTs);
    const paid = inRange.filter((o) => o.payment_status === "paid");
    const revenue = paid.reduce((s, o) => s + Number(o.total_amount), 0);

    // Build a daily/monthly revenue series for the chart.
    const useMonthly = range === "365" || range === "all";
    const buckets = new Map<string, number>();
    for (const o of paid) {
      const d = new Date(o.created_at);
      const key = useMonthly
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        : d.toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + Number(o.total_amount));
    }
    const series = [...buckets.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-14)
      .map(([key, value]) => ({
        label: useMonthly
          ? new Date(key + "-01").toLocaleDateString("en-NG", { month: "short" })
          : new Date(key).toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
        value,
      }));

    const avgOrder = paid.length ? revenue / paid.length : 0;

    return { revenue, orders: inRange.length, paidOrders: paid.length, avgOrder, series };
  }, [orders, range]);

  const maxVal = Math.max(1, ...analytics.series.map((s) => s.value));

  const cards = [
    { label: "Total sales", value: formatNaira(analytics.revenue), icon: Banknote },
    { label: "Paid orders", value: analytics.paidOrders, icon: TrendingUp },
    { label: "All orders", value: analytics.orders, icon: ShoppingCart },
    { label: "Products", value: productCount ?? 0, icon: Package },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your store performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild>
            <Link to="/admin/products/new">
              <Plus className="mr-1.5 h-4 w-4" /> New product
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <c.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-2xl font-bold">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>

      {/* Revenue chart */}
      <Card className="mt-4 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-primary" /> Revenue by date
          </div>
          <p className="text-sm text-muted-foreground">
            Avg. order {formatNaira(analytics.avgOrder)}
          </p>
        </div>
        {analytics.series.length === 0 ? (
          <div className="grid place-items-center py-10 text-center text-sm text-muted-foreground">
            No paid orders in this range yet.
          </div>
        ) : (
          <div className="flex h-48 items-end gap-1.5">
            {analytics.series.map((s, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
                    style={{ height: `${Math.max(4, (s.value / maxVal) * 100)}%` }}
                    title={formatNaira(s.value)}
                  />
                </div>
                <span className="whitespace-nowrap text-[10px] text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="outline"><Link to="/admin/products">Manage products</Link></Button>
        <Button asChild variant="outline"><Link to="/admin/orders">View orders</Link></Button>
        <Button asChild variant="outline"><Link to="/admin/settings">Store settings</Link></Button>
      </div>
    </div>
  );
}
