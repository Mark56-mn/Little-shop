import { createFileRoute, Link } from "@tanstack/react-router";
import { useProduct } from "@/hooks/useStore";
import { ProductForm } from "@/components/admin/ProductForm";
import { ChevronLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/products/$id")({
  component: EditProduct,
});

function EditProduct() {
  const { id } = Route.useParams();
  const { data: product, isLoading } = useProduct(id);

  return (
    <div>
      <Link to="/admin/products" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Products
      </Link>
      <h1 className="mb-5 text-2xl font-bold">Edit product</h1>
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      ) : product ? (
        <ProductForm existing={product} />
      ) : (
        <p className="text-sm text-muted-foreground">Product not found.</p>
      )}
    </div>
  );
}
