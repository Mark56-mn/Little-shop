import { Link } from "@tanstack/react-router";
import { formatNaira, type Product } from "@/lib/store";
import { ImageOff } from "lucide-react";

const COLOR_HEX: Record<string, string> = {
  Black: "#1a1a1a",
  White: "#f5f5f5",
  Grey: "#9ca3af",
  Red: "#dc2626",
  Blue: "#2563eb",
  Navy: "#1e3a5f",
  Green: "#16a34a",
  Yellow: "#eab308",
  Orange: "#ea580c",
  Purple: "#9333ea",
  Pink: "#ec4899",
  Brown: "#92400e",
  Beige: "#d4b896",
  Gold: "#d4af37",
  Silver: "#c0c0c0",
};

export function ProductCard({ product }: { product: Product }) {
  const img = product.images?.[0];
  return (
    <Link
      to="/product/$id"
      params={{ id: product.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {img ? (
          <img
            src={img}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
        {product.stock <= 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">
            Sold out
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{product.title}</h3>
        {product.colors.length > 0 && (
          <div className="flex items-center gap-1">
            {product.colors.slice(0, 5).map((c) => (
              <span
                key={c}
                className="h-3 w-3 rounded-full border border-border"
                style={{ backgroundColor: COLOR_HEX[c] ?? "#ccc" }}
                title={c}
              />
            ))}
            {product.colors.length > 5 && (
              <span className="text-[10px] text-muted-foreground">+{product.colors.length - 5}</span>
            )}
          </div>
        )}
        <p className="mt-auto pt-1 font-display text-lg font-bold text-primary">
          {formatNaira(product.selling_price)}
        </p>
      </div>
    </Link>
  );
}
