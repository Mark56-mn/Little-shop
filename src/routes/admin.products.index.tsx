import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira, type Product } from "@/lib/store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ImageOff, PackageOpen } from "lucide-react";

export const Route = createFileRoute("/admin/products/")({
  component: ProductsList,
});

function ProductsList() {
  const queryClient = useQueryClient();
  const { data: products, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  async function remove(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error("Could not delete");
    toast.success("Product deleted");
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button asChild><Link to="/admin/products/new"><Plus className="mr-1.5 h-4 w-4" /> New product</Link></Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : products && products.length > 0 ? (
        <div className="space-y-2">
          {products.map((p) => (
            <Card key={p.id} className="flex items-center gap-3 p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-muted-foreground"><ImageOff className="h-5 w-5" /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatNaira(p.selling_price)} · Stock {p.stock}
                </p>
              </div>
              <Badge variant={p.published ? "default" : "secondary"}>{p.published ? "Live" : "Draft"}</Badge>
              <Button asChild variant="ghost" size="icon"><Link to="/admin/products/$id" params={{ id: p.id }}><Pencil className="h-4 w-4" /></Link></Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete product?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently remove "{p.title}".</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove(p.id)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="grid place-items-center py-16 text-center">
          <PackageOpen className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">No products yet</p>
          <Button asChild className="mt-4"><Link to="/admin/products/new">Add your first product</Link></Button>
        </Card>
      )}
    </div>
  );
}
