import { Link } from "@tanstack/react-router";
import { ShoppingBag, ShoppingCart, User } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStore";
import { useCart } from "@/hooks/useCart";
import { AdminFab } from "@/components/storefront/AdminFab";

export function StoreHeader() {
  const { data: settings } = useStoreSettings();
  const { count } = useCart();
  const name = settings?.store_name || "PlugMart";

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt={name} className="h-9 w-9 rounded-xl object-cover" />
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <ShoppingBag className="h-5 w-5" />
            </span>
          )}
          <span className="font-display text-xl font-bold tracking-tight">{name}</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            to="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          <Link
            to="/account"
            className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Account"
          >
            <User className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
    <AdminFab />
    </>
  );
}
