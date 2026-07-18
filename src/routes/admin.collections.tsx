import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCollections } from "@/hooks/useStore";
import { uploadProductImage } from "@/lib/upload";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X, Plus, FolderOpen } from "lucide-react";
import type { Collection } from "@/lib/store";

export const Route = createFileRoute("/admin/collections")({
  component: CollectionsPage,
});

function CollectionsPage() {
  const { data: collections, isLoading } = useCollections();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [newCollection, setNewCollection] = useState({ name: "", description: "", image_url: "" });

  async function uploadImage(id: string, file: File | undefined) {
    if (!file) return;
    setUploading(id);
    try {
      const url = await uploadProductImage(file);
      const { error } = await supabase
        .from("collections")
        .update({ image_url: url })
        .eq("id", id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function addCollection() {
    if (!newCollection.name.trim()) return;
    setSaving(true);
    try {
      const slug = newCollection.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { error } = await supabase.from("collections").insert({
        name: newCollection.name.trim(),
        slug,
        description: newCollection.description || null,
        image_url: newCollection.image_url || null,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
      setNewCollection({ name: "", description: "", image_url: "" });
      toast.success("Collection added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add collection");
    } finally {
      setSaving(false);
    }
  }

  async function updateCollection(id: string, updates: Partial<Collection>) {
    try {
      const { error } = await supabase.from("collections").update(updates).eq("id", id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function deleteCollection(id: string) {
    try {
      const { error } = await supabase.from("collections").delete().eq("id", id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Collections</h1>

      <Card className="mb-5 space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> Add new collection
        </div>
        <div>
          <Label htmlFor="new-name">Name</Label>
          <Input id="new-name" placeholder="e.g. Kids Wear" value={newCollection.name}
            onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="new-desc">Description (optional)</Label>
          <Textarea id="new-desc" rows={2} value={newCollection.description}
            onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })} />
        </div>
        <Button onClick={addCollection} disabled={saving || !newCollection.name.trim()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add collection"}
        </Button>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {collections?.map((c) => (
            <Card key={c.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Input
                    value={c.name}
                    onChange={(e) => updateCollection(c.id, { name: e.target.value })}
                    className="font-medium"
                  />
                  <Input
                    value={c.description ?? ""}
                    placeholder="Description (optional)"
                    onChange={(e) => updateCollection(c.id, { description: e.target.value || null })}
                  />
                  <div className="flex items-center gap-2">
                    {c.image_url && (
                      <img src={c.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:border-primary">
                      {uploading === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} Image
                      <input type="file" accept="image/*" hidden onChange={(e) => uploadImage(c.id, e.target.files?.[0])} />
                    </label>
                  </div>
                </div>
                <button
                  onClick={() => deleteCollection(c.id)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
          {collections?.length === 0 && (
            <div className="grid place-items-center rounded-2xl border border-dashed border-border py-12 text-center">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No collections yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
