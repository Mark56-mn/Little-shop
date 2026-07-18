import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { listProducts, listCategories } from "@/lib/shop.functions";

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug === "plugmarket" ? "PlugMarket" : "HotPick NG"} — TrendRush NG` },
      { name: "description", content: `Shop ${params.slug} on TrendRush NG.` },
    ],
  }),
  loader: async ({ context, params }) => {
    const opts = queryOptions({
      queryKey: ["products", "cat", params.slug],
      queryFn: () => listProducts({ data: { categorySlug: params.slug, limit: 60 } }),
    });
    const catsOpts = queryOptions({ queryKey: ["categories"], queryFn: () => listCategories() });
    await Promise.all([
      context.queryClient.ensureQueryData(opts),
      context.queryClient.ensureQueryData(catsOpts),
    ]);
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data: products } = useSuspenseQuery(
    queryOptions({
      queryKey: ["products", "cat", slug],
      queryFn: () => listProducts({ data: { categorySlug: slug, limit: 60 } }),
    }),
  );
  const { data: cats } = useSuspenseQuery(
    queryOptions({ queryKey: ["categories"], queryFn: () => listCategories() }),
  );
  const cat = cats.find((c) => c.slug === slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
        ← Back home
      </Link>
      <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">
        {cat?.name ?? slug}
      </h1>
      <p className="text-sm text-muted-foreground">{cat?.tagline}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No products in this category yet.
          </div>
        ) : (
          products.map((p: any) => <ProductCard key={p.id} product={p} />)
        )}
      </div>
    </div>
  );
}
