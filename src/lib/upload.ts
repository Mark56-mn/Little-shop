import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Upload a file to the private bucket and return a long-lived signed URL. */
export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  const { data, error: sErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, TEN_YEARS);
  if (sErr || !data) throw sErr ?? new Error("Could not sign image URL");
  return data.signedUrl;
}
