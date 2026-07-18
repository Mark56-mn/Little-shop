import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { listProducts, getSettings, listCategories } from "@/lib/shop.functions";
import { Flame, Zap, ArrowRight } from "lucide-react";

const trendingOpts = queryOptions({
  queryKey: ["products", "trending"],
  queryFn: () => listProducts({ data: { trending: true, limit: 8 } }),
});
const plugOpts = queryOptions({
  queryKey: ["products", "plugmarket"],
  queryFn: () => listProducts({ data: { categorySlug: "plugmarket", limit: 8 } }),
});
const hotOpts = queryOptions({
  queryKey: ["products", "hotpick"],
  queryFn: () => listProducts({ data: { categorySlug: "hotpick", limit: 8 } }),
});
const settingsOpts = queryOptions({ queryKey: ["settings"], queryFn: () => getSettings() });
const catsOpts = queryOptions({ queryKey: ["categories"], queryFn: () => listCategories() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TrendRush NG — Naija's hottest deals, delivered fast" },
      {
        name: "description",
        content:
          "Shop trending gadgets on PlugMarket and viral deals on HotPick NG. Bank transfer checkout with WhatsApp support.",
      },
      { property: "og:title", content: "TrendRush NG" },
      { property: "og:description", content: "Naija's hottest deals, delivered fast." },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(trendingOpts),
      context.queryClient.ensureQueryData(plugOpts),
      context.queryClient.ensureQueryData(hotOpts),
      context.queryClient.ensureQueryData(settingsOpts),
      context.queryClient.ensureQueryData(catsOpts),
    ]);
  },
  component: Home,
});

function Home() {
  const { data: trending } = useSuspenseQuery(trendingOpts);
  const { data: plug } = useSuspenseQuery(plugOpts);
  const { data: hot } = useSuspenseQuery(hotOpts);
  const { data: settings } = useSuspenseQuery(settingsOpts);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(60% 60% at 20% 10%, oklch(0.86 0.27 142 / .35), transparent 60%), radial-gradient(50% 50% at 80% 80%, oklch(0.74 0.18 50 / .35), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-neon/40 bg-neon/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-neon">
            <Zap className="h-3 w-3" /> Live deals · Pay on transfer
          </div>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            <span className="text-gradient-neon">TrendRush NG</span>
            <br />
            {settings?.hero_slogan ?? "Naija's hottest deals, delivered fast."}
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Shop <span className="font-semibold text-foreground">PlugMarket</span> for gadgets and{" "}
            <span className="font-semibold text-foreground">HotPick NG</span> for viral picks.
            Secure bank transfer. WhatsApp support that actually replies.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/category/$slug"
              params={{ slug: "plugmarket" }}
              className="inline-flex items-center gap-2 rounded-md bg-neon px-5 py-3 font-bold text-neon-foreground shadow-neon"
            >
              Shop PlugMarket <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/category/$slug"
              params={{ slug: "hotpick" }}
              className="inline-flex items-center gap-2 rounded-md border border-orange bg-orange/10 px-5 py-3 font-bold text-orange"
            >
              Browse HotPick NG <Flame className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Section
        title="Trending now"
        subtitle="Everyone's buying these"
        accent="neon"
        products={trending as any}
      />
      <Section
        title="PlugMarket"
        subtitle="Gadgets, tech & accessories"
        accent="neon"
        href="/category/$slug"
        slug="plugmarket"
        products={plug as any}
      />
      <Section
        title="HotPick NG"
        subtitle="Viral deals & trending picks"
        accent="orange"
        href="/category/$slug"
        slug="hotpick"
        products={hot as any}
      />
    </div>
  );
}

function Section({
  title,
  subtitle,
  products,
  href,
  slug,
  accent,
}: {
  title: string;
  subtitle: string;
  products: any[];
  href?: "/category/$slug";
  slug?: string;
  accent: "neon" | "orange";
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2
            className={`font-display text-2xl font-black sm:text-3xl ${accent === "neon" ? "text-neon" : "text-orange"}`}
          >
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {href && slug && (
          <Link
            to={href}
            params={{ slug }}
            className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            See all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No products yet. Add some in the admin panel.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
