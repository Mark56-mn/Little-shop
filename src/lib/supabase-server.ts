import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function getPublicSupabase() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    },
  );
}

export async function signImagePaths(
  client: ReturnType<typeof getPublicSupabase>,
  bucket: string,
  paths: string[] | null | undefined,
): Promise<string[]> {
  if (!paths || paths.length === 0) return [];
  // Allow already-absolute URLs to pass through.
  const toSign = paths.filter((p) => p && !p.startsWith("http"));
  const signedMap = new Map<string, string>();
  if (toSign.length > 0) {
    const { data } = await client.storage.from(bucket).createSignedUrls(toSign, 60 * 60 * 24);
    data?.forEach((d) => {
      if (d.path && d.signedUrl) signedMap.set(d.path, d.signedUrl);
    });
  }
  return paths.map((p) => (p?.startsWith("http") ? p : signedMap.get(p) ?? ""));
}
