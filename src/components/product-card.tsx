import { Link } from "@tanstack/react-router";
import { formatNaira } from "@/lib/format";
import { Flame } from "lucide-react";

type Props = {
  product: {
    id: string;
    title: string;
    price_naira: number;
    is_trending?: boolean;
    signed_image_urls: string[];
  };
};

export function ProductCard({ product }: Props) {
  const img = product.signed_image_urls?.[0];
  return (
    <Link
      to="/product/$id"
      params={{ id: product.id }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-neon/60 hover:shadow-neon"
    >
      <div className="relative aspect-square overflow-hidden bg-surface">
        {img ? (
          <img
            src={img}
            alt={product.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">No image</div>
        )}
        {product.is_trending && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-orange px-2 py-0.5 text-[10px] font-bold uppercase text-orange-foreground shadow-orange">
            <Flame className="h-3 w-3" /> Trending
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {product.title}
        </h3>
        <div className="mt-auto font-display text-lg font-black text-neon">
          {formatNaira(product.price_naira)}
        </div>
      </div>
    </Link>
  );
}
