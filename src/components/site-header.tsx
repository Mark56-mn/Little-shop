import { Link } from "@tanstack/react-router";
import { ShoppingBag, User, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { isAdmin } from "@/lib/admin.functions";

export function SiteHeader() {
  const { user } = useAuth();
  const isAdminFn = useServerFn(isAdmin);
  const { data: admin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: () => isAdminFn(),
    enabled: !!user,
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-neon font-display text-lg font-black text-neon-foreground shadow-neon">
            T
          </div>
          <div className="font-display text-lg font-black tracking-tight">
            TrendRush <span className="text-orange">NG</span>
          </div>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-muted-foreground sm:flex">
          <Link to="/category/$slug" params={{ slug: "plugmarket" }} activeProps={{ className: "text-foreground" }}>
            PlugMarket
          </Link>
          <Link to="/category/$slug" params={{ slug: "hotpick" }} activeProps={{ className: "text-foreground" }}>
            HotPick NG
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {admin && (
            <Link
              to="/admin"
              className="hidden items-center gap-1 rounded-md border border-orange/40 px-2 py-1 text-xs font-semibold text-orange sm:flex"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </Link>
          )}
          {user ? (
            <Link
              to="/orders"
              className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
            >
              <ShoppingBag className="h-3.5 w-3.5" /> Orders
            </Link>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-1 rounded-md bg-neon px-3 py-1.5 text-xs font-bold text-neon-foreground shadow-neon"
            >
              <User className="h-3.5 w-3.5" /> Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
