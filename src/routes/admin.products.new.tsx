import { createFileRoute, Link } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/admin/products/new")({
  component: NewProduct,
});

function NewProduct() {
  return (
    <div>
      <Link to="/admin/products" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Products
      </Link>
      <h1 className="mb-5 text-2xl font-bold">New product</h1>
      <ProductForm />
    </div>
  );
}
